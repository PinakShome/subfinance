import { supabase } from './supabase';
import { Alt, generateAlternatives } from './alternatives-gen';

// Live entries older than this are served immediately but flagged for the
// background job to refresh — so the live path never blocks on the LLM except
// on a true first-time miss.
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

/**
 * Canonical key for one service. Keyed on NAME ONLY (not name+category):
 * subscription names are effectively unique brands, and category is inconsistent
 * in the wild (a "Netflix" row may have no category or "Streaming"), so folding
 * category into the key fragments one service across multiple rows. Category is
 * still stored as a column. Aliases collapse common variants to one entry.
 */
export function normalizeKey(name: string, _category?: string): string {
  const n = name.trim().toLowerCase().replace(/\s+/g, ' ');
  return NAME_ALIASES[n] ?? n;
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

/**
 * Names to exclude everywhere: an alternative that's been downvoted across many
 * services with a poor ratio is probably just bad. Computed once per background
 * cycle (a full scan), passed into resolve().
 */
export async function getGlobalBlocklist(minServices = 3, minDown = 8, maxRatio = 0.25): Promise<Set<string>> {
  const { data } = await supabase.from('alternative_feedback').select('service_name, alternative_name, helpful');
  const per = new Map<string, { up: number; down: number; services: Set<string> }>();
  for (const r of (data ?? []) as any[]) {
    const k = String(r.alternative_name).toLowerCase();
    const e = per.get(k) ?? { up: 0, down: 0, services: new Set<string>() };
    r.helpful ? e.up++ : e.down++;
    e.services.add(String(r.service_name).toLowerCase());
    per.set(k, e);
  }
  const block = new Set<string>();
  for (const [name, e] of per) {
    const total = e.up + e.down;
    if (e.services.size >= minServices && e.down >= minDown && total > 0 && e.up / total <= maxRatio) {
      block.add(name);
    }
  }
  return block;
}

const feedbackScore = (s?: FeedbackStat) => (s ? s.up - s.down : 0);
const isReviled = (s?: FeedbackStat) => !!s && s.down >= 5 && s.up / (s.up + s.down) < 0.3;

/**
 * Turn the raw LLM list into what users see: drop globally/negatively-flagged
 * entries, rank by net feedback, then apply owner overrides (block/edit/pin).
 * Pure function of its inputs — no API calls.
 */
export function resolve(
  raw: Alt[], fb: Map<string, FeedbackStat>, overrides: Override[], globalBlock: Set<string>,
): Alt[] {
  let list = raw
    .filter((a) => !globalBlock.has(a.name.toLowerCase()) && !isReviled(fb.get(a.name.toLowerCase())))
    .sort((x, y) => feedbackScore(fb.get(y.name.toLowerCase())) - feedbackScore(fb.get(x.name.toLowerCase())));

  const blocks = new Set(overrides.filter((o) => o.action === 'block').map((o) => o.alternative_name.toLowerCase()));
  list = list.filter((a) => !blocks.has(a.name.toLowerCase()));

  for (const o of overrides.filter((o) => o.action === 'edit')) {
    const t = list.find((a) => a.name.toLowerCase() === o.alternative_name.toLowerCase());
    if (t) Object.assign(t, o.patch);
  }

  // Pins go to the front (merged from patch, or added if the LLM missed them).
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

/** Recompute a row's served `payload` from its raw list + current feedback/overrides. No API. */
export async function reresolve(serviceKey: string, serviceName: string, raw: Alt[], globalBlock?: Set<string>): Promise<Alt[]> {
  const [fb, overrides] = await Promise.all([getFeedbackMap(serviceName), getOverrides(serviceKey)]);
  const payload = resolve(raw, fb, overrides, globalBlock ?? new Set());
  await supabase.from('alternatives_catalogue').update({
    payload, resolved_at: new Date().toISOString(),
    status: payload.length < 2 ? 'needs_review' : 'active',
  }).eq('service_key', serviceKey);
  return payload;
}

/**
 * Cheaper-than-current filter, preserving the ranked order from resolve() (owner
 * pins first, then net feedback). Price is only a filter here — NOT a re-sort —
 * so community ranking and owner curation actually determine what surfaces and in
 * what order, instead of being flattened to cheapest-first.
 */
function applyCostFilter(list: Alt[], costNum: number | null): Alt[] {
  return list
    .filter((a) => costNum === null || a.monthly_price === null || a.monthly_price < costNum)
    .slice(0, 6);
}

/**
 * LIVE PATH. Catalogue-first: a hit is a single-row read (0 API calls); a true
 * miss generates once and stores. Stale entries are served now and flagged for
 * the background job — the live path only calls the LLM on a first-time miss.
 */
export async function getAlternativesForService(
  name: string, category: string, costNum: number | null,
): Promise<Alt[]> {
  const key = normalizeKey(name, category);
  const { data: row } = await supabase
    .from('alternatives_catalogue')
    .select('payload, raw_payload, refreshed_at')
    .eq('service_key', key)
    .maybeSingle();

  if (row) {
    supabase.rpc('bump_catalogue_request', { p_key: key }).then(() => {}, () => {});
    if (Date.now() - new Date(row.refreshed_at).getTime() > STALE_MS) {
      supabase.from('alternatives_catalogue').update({ status: 'needs_review' }).eq('service_key', key).then(() => {}, () => {});
    }
    return applyCostFilter((row.payload ?? []) as Alt[], costNum);
  }

  // First-time miss: generate (grounded), resolve with any existing overrides, store.
  const raw = await generateAlternatives(name, category);
  // Never cache an empty generation — a transient miss (e.g. a search turn that
  // ran long) would otherwise poison this service until the nightly job. Return
  // nothing this time; the next tap retries generation.
  if (raw.length === 0) return [];
  const overrides = await getOverrides(key);
  const payload = resolve(raw, new Map(), overrides, new Set());
  await supabase.from('alternatives_catalogue').upsert({
    service_key: key, service_name: name, category: category ?? '',
    raw_payload: raw, payload, request_count: 1,
    status: payload.length < 2 ? 'needs_review' : 'active',
    refreshed_at: new Date().toISOString(), resolved_at: new Date().toISOString(),
  }, { onConflict: 'service_key' });
  return applyCostFilter(payload, costNum);
}
