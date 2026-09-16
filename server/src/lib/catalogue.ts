import { supabase } from './supabase';
import { Alt, generateAlternatives } from './alternatives-gen';

// Live entries older than this are served immediately but flagged for the
// background job to refresh — so the live path never blocks on the LLM except
// on a first-time miss with no catalogue data to fall back on.
export const STALE_MS = 30 * 24 * 60 * 60 * 1000;

export interface Override { alternative_name: string; action: 'pin' | 'block' | 'edit'; patch: Partial<Alt>; }
export interface FeedbackStat { up: number; down: number; }

// Light canonicalization for common name variants, so a user's "Adobe CC" and
// the seeded "Adobe Creative Cloud" resolve to the same catalogue entry.
const NAME_ALIASES: Record<string, string> = {
  'adobe cc': 'adobe creative cloud',
  'adobe': 'adobe creative cloud',
  'chatgpt': 'chatgpt plus',
  'chat gpt': 'chatgpt plus',
  'openai': 'chatgpt plus',
  'disney': 'disney+',
  'disney plus': 'disney+',
  'prime': 'amazon prime',
  'prime video': 'amazon prime',
  'amazon prime video': 'amazon prime',
  'youtube': 'youtube premium',
  'icloud': 'icloud+',
  'office 365': 'microsoft 365',
  'ms 365': 'microsoft 365',
  'microsoft office': 'microsoft 365',
  'amazon web services': 'aws',
  'gh copilot': 'github copilot',
};

// Trailing plan/tier words stripped only as a MISS FALLBACK (#6) — never on the
// first lookup, so canonical names that legitimately end in one of these words
// ("Amazon Music Unlimited", "Xbox Game Pass Ultimate", "YouTube Premium") still
// hit their own row directly. Turns "Netflix Premium"/"Spotify Family"/"netflix
// 4k" into the base service without a generation.
const QUALIFIERS = new Set([
  'premium', 'plus', 'pro', 'family', 'families', 'individual', 'individuals', 'unlimited',
  'ultimate', 'standard', 'basic', 'deluxe', 'duo', 'student', 'annual', 'monthly', 'yearly',
  'plan', 'plans', 'subscription', 'subscriptions', 'membership', 'memberships', 'tier', 'tiers',
  'hd', 'uhd', '4k', 'ad-free', 'adfree',
]);

/**
 * Canonical key for one service. Keyed on NAME ONLY (not name+category):
 * subscription names are effectively unique brands, and category is inconsistent
 * in the wild, so folding it into the key fragments one service across rows.
 * Aliases collapse common variants to one entry.
 */
export function normalizeKey(name: string, _category?: string): string {
  const n = name.trim().toLowerCase().replace(/\s+/g, ' ');
  return NAME_ALIASES[n] ?? n;
}

/** Strip trailing plan/tier words then re-alias; null if nothing was stripped. */
function strippedKey(name: string): string | null {
  const tokens = name.trim().toLowerCase().replace(/\s+/g, ' ').split(' ');
  let end = tokens.length;
  while (end > 1 && QUALIFIERS.has(tokens[end - 1])) end--;
  if (end === tokens.length) return null;
  const base = tokens.slice(0, end).join(' ');
  return NAME_ALIASES[base] ?? base;
}

/** Aggregate per-alternative 👍/👎 for one service (keyed by lowercased name). */
export async function getFeedbackMap(serviceName: string): Promise<Map<string, FeedbackStat>> {
  const map = new Map<string, FeedbackStat>();
  const { data } = await supabase
    .from('alternative_feedback')
    .select('alternative_name, helpful')
    .eq('service_name', serviceName);
  for (const r of (data ?? []) as any[]) {
    const k = String(r.alternative_name).toLowerCase();
    const s = map.get(k) ?? { up: 0, down: 0 };
    r.helpful ? s.up++ : s.down++;
    map.set(k, s);
  }
  return map;
}

export async function getOverrides(serviceKey: string): Promise<Override[]> {
  const { data } = await supabase
    .from('alternative_overrides')
    .select('alternative_name, action, patch')
    .eq('service_key', serviceKey);
  return (data ?? []) as Override[];
}

/** Cross-service feedback tally, keyed by lowercased alternative name. */
async function crossServiceFeedback(): Promise<Map<string, { up: number; down: number; services: Set<string> }>> {
  const { data } = await supabase.from('alternative_feedback').select('service_name, alternative_name, helpful');
  const per = new Map<string, { up: number; down: number; services: Set<string> }>();
  for (const r of (data ?? []) as any[]) {
    const k = String(r.alternative_name).toLowerCase();
    const e = per.get(k) ?? { up: 0, down: 0, services: new Set<string>() };
    r.helpful ? e.up++ : e.down++;
    e.services.add(String(r.service_name).toLowerCase());
    per.set(k, e);
  }
  return per;
}

/**
 * Names to exclude everywhere: an alternative downvoted across many services with
 * a poor ratio is probably just bad. Computed once per background cycle.
 */
export async function getGlobalBlocklist(minServices = 3, minDown = 8, maxRatio = 0.25): Promise<Set<string>> {
  const per = await crossServiceFeedback();
  const block = new Set<string>();
  for (const [name, e] of per) {
    const total = e.up + e.down;
    if (e.services.size >= minServices && e.down >= minDown && total > 0 && e.up / total <= maxRatio) block.add(name);
  }
  return block;
}

/**
 * Auto-promotion (#5): an alternative loved across many services gets a ranking
 * boost everywhere — surfacing community favorites without owner effort. Mirror
 * of the blocklist, on the positive side. Zero API.
 */
export async function getGlobalPromotions(minServices = 3, minUp = 8, minRatio = 0.8): Promise<Set<string>> {
  const per = await crossServiceFeedback();
  const promote = new Set<string>();
  for (const [name, e] of per) {
    const total = e.up + e.down;
    if (e.services.size >= minServices && e.up >= minUp && total > 0 && e.up / total >= minRatio) promote.add(name);
  }
  return promote;
}

const PROMO_BONUS = 3; // soft boost: lifts globally-loved alts, but owner pins still win
const feedbackScore = (s?: FeedbackStat) => (s ? s.up - s.down : 0);
const isReviled = (s?: FeedbackStat) => !!s && s.down >= 5 && s.up / (s.up + s.down) < 0.3;

/**
 * Turn the raw list into what users see: drop globally/negatively-flagged
 * entries, rank by net feedback + global promotion, then apply owner overrides
 * (block/edit/pin). Pure function of its inputs — no API calls.
 */
export function resolve(
  raw: Alt[], fb: Map<string, FeedbackStat>, overrides: Override[],
  globalBlock: Set<string>, globalPromote: Set<string> = new Set(),
): Alt[] {
  const rank = (a: Alt) => {
    const k = a.name.toLowerCase();
    return feedbackScore(fb.get(k)) + (globalPromote.has(k) ? PROMO_BONUS : 0);
  };
  let list = raw
    .filter((a) => !globalBlock.has(a.name.toLowerCase()) && !isReviled(fb.get(a.name.toLowerCase())))
    .sort((x, y) => rank(y) - rank(x));

  const blocks = new Set(overrides.filter((o) => o.action === 'block').map((o) => o.alternative_name.toLowerCase()));
  list = list.filter((a) => !blocks.has(a.name.toLowerCase()));

  for (const o of overrides.filter((o) => o.action === 'edit')) {
    const t = list.find((a) => a.name.toLowerCase() === o.alternative_name.toLowerCase());
    if (t) Object.assign(t, o.patch);
  }

  // Pins go to the front (merged from patch, or added if the list missed them).
  for (const o of overrides.filter((o) => o.action === 'pin').reverse()) {
    const idx = list.findIndex((a) => a.name.toLowerCase() === o.alternative_name.toLowerCase());
    if (idx >= 0) { const [item] = list.splice(idx, 1); list.unshift(Object.assign(item, o.patch)); }
    else if (o.patch.name && o.patch.website) {
      list.unshift({
        name: o.patch.name, description: o.patch.description ?? '',
        monthly_price: o.patch.monthly_price ?? null, currency: o.patch.currency ?? 'USD',
        website: o.patch.website,
      });
    }
  }
  return list;
}

/** Recompute a row's served `payload` from its raw list + feedback/overrides/global signals. No API. */
export async function reresolve(
  serviceKey: string, serviceName: string, raw: Alt[],
  globalBlock?: Set<string>, globalPromote?: Set<string>,
): Promise<Alt[]> {
  const [fb, overrides] = await Promise.all([getFeedbackMap(serviceName), getOverrides(serviceKey)]);
  const payload = resolve(raw, fb, overrides, globalBlock ?? new Set(), globalPromote ?? new Set());
  await supabase.from('alternatives_catalogue').update({
    payload, resolved_at: new Date().toISOString(),
    status: payload.length < 2 ? 'needs_review' : 'active',
  }).eq('service_key', serviceKey);
  return payload;
}

/**
 * Category pool (#1): aggregate a category's alternatives from its sibling
 * catalogue entries. Lets a miss in a KNOWN, COHERENT category be answered from
 * existing data (0 API) instead of a fresh generation.
 *
 * Only alternatives that appear across a meaningful FRACTION of the category's
 * services are pooled (breadth gate). This is what keeps a mixed category (e.g.
 * "Security & Privacy" = VPNs + password managers + antivirus, whose alternatives
 * don't overlap) from producing a muddy blend: no alternative clears the
 * threshold, the pool comes back too small, and the caller falls through to a
 * real generation instead of serving nonsense.
 */
export async function getCategoryPool(category: string, excludeKey?: string, limit = 10): Promise<Alt[]> {
  if (!category) return [];
  const { data } = await supabase
    .from('alternatives_catalogue')
    .select('service_key, raw_payload')
    .eq('category', category)
    .limit(80);
  const rows = ((data ?? []) as any[]).filter((r) => r.service_key !== excludeKey && (r.raw_payload?.length ?? 0) > 0);
  if (rows.length < 3) return []; // too few siblings to trust a pool

  const agg = new Map<string, { alt: Alt; count: number }>();
  for (const r of rows) {
    for (const a of (r.raw_payload ?? []) as Alt[]) {
      const k = a.name.toLowerCase();
      const e = agg.get(k);
      if (e) e.count++; else agg.set(k, { alt: a, count: 1 });
    }
  }
  const threshold = Math.max(2, Math.ceil(0.5 * rows.length)); // must be a majority staple
  return [...agg.values()]
    .filter((e) => e.count >= threshold)
    .sort((x, y) => y.count - x.count)
    .slice(0, limit)
    .map((e) => e.alt);
}

/** Cheaper-than-current filter, preserving resolve()'s ranked order (no price re-sort). */
function applyCostFilter(list: Alt[], costNum: number | null): Alt[] {
  return list
    .filter((a) => costNum === null || a.monthly_price === null || a.monthly_price < costNum)
    .slice(0, 6);
}

const bump = (key: string) => supabase.rpc('bump_catalogue_request', { p_key: key }).then(() => {}, () => {});
async function readRow(key: string) {
  const { data } = await supabase
    .from('alternatives_catalogue')
    .select('payload, raw_payload, refreshed_at')
    .eq('service_key', key)
    .maybeSingle();
  return data as { payload: Alt[]; raw_payload: Alt[]; refreshed_at: string } | null;
}
async function storeEntry(key: string, name: string, category: string, raw: Alt[], quality: number | null) {
  const overrides = await getOverrides(key);
  const payload = resolve(raw, new Map(), overrides, new Set());
  await supabase.from('alternatives_catalogue').upsert({
    service_key: key, service_name: name, category: category ?? '',
    raw_payload: raw, payload, request_count: 1, quality_score: quality,
    status: payload.length < 2 ? 'needs_review' : 'active',
    refreshed_at: new Date().toISOString(), resolved_at: new Date().toISOString(),
  }, { onConflict: 'service_key' });
  return payload;
}

/**
 * LIVE PATH. In order of cost:
 *   1. Exact catalogue hit — single-row read (0 API).
 *   2. Miss → strip plan/tier qualifiers and retry ("Netflix Premium" → netflix) (#6, 0 API).
 *   3. Miss → compose from the category pool if the category is known (#1, 0 API).
 *   4. True miss (new category, no data) → generate once (grounded) and store.
 * So the LLM fires only for a genuinely-new service in a category we've never seen.
 */
export async function getAlternativesForService(
  name: string, category: string, costNum: number | null,
): Promise<Alt[]> {
  const key = normalizeKey(name, category);
  const row = await readRow(key);
  if (row) {
    bump(key);
    if (Date.now() - new Date(row.refreshed_at).getTime() > STALE_MS) {
      supabase.from('alternatives_catalogue').update({ status: 'needs_review' }).eq('service_key', key).then(() => {}, () => {});
    }
    return applyCostFilter((row.payload ?? []) as Alt[], costNum);
  }

  // 2. Fuzzy fallback: strip plan/tier qualifiers and retry the base service.
  const sk = strippedKey(name);
  if (sk && sk !== key) {
    const alt = await readRow(sk);
    if (alt) { bump(sk); return applyCostFilter((alt.payload ?? []) as Alt[], costNum); }
  }

  // 3. Category pool: answer from sibling entries in the same category (0 API).
  const pool = await getCategoryPool(category, key);
  if (pool.length >= 3) {
    const payload = await storeEntry(key, name, category, pool, null);
    return applyCostFilter(payload, costNum);
  }

  // 4. Last resort: generate. Never cache an empty generation.
  const raw = await generateAlternatives(name, category);
  if (raw.length === 0) return [];
  const payload = await storeEntry(key, name, category, raw, null);
  return applyCostFilter(payload, costNum);
}
