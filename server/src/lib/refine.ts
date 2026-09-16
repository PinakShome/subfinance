import { supabase } from './supabase';
import { Alt, generateAlternatives, verifyLiveWebsites } from './alternatives-gen';
import { getGlobalBlocklist, getGlobalPromotions, reresolve } from './catalogue';

// Hard cap on grounded regenerations per cycle — bounds API cost predictably.
const MAX_REGEN = Number(process.env.CATALOGUE_MAX_REGEN ?? 5);
// Cap on URL liveness checks per cycle (free, but bounds outbound HTTP + runtime).
// Over successive nights the whole catalogue gets covered, demand-first.
const MAX_LIVENESS = Number(process.env.CATALOGUE_MAX_LIVENESS ?? 120);
const DAY = 86_400_000;
// Reactive-first: regen is triggered by SIGNALS (dead links, needs_review), not a
// clock. This long TTL is only a last-resort safety net so nothing goes stale
// forever even with no signal.
const SAFETY_TTL_MS = 180 * DAY;

/**
 * The background flywheel. Almost all of it is free (no API calls):
 *   A/B. Re-rank every entry from the latest feedback + owner overrides + global
 *        blocklist + global promotions.
 *   L.   Liveness: HEAD-check each alternative's URL and prune dead links —
 *        free, and it's what actually catches rot. Pruning can push an entry
 *        below the minimum, which then makes it a regen candidate.
 *   C.   Reactive regen (the only paid phase): the grounded generator runs ONLY
 *        for entries that are thin (dead-link pruning left <2), flagged
 *        needs_review, or long past the safety TTL — capped and demand-first.
 * Wire this to a nightly cron.
 */
export async function runRefinementCycle(): Promise<{ reranked: number; pruned: number; regenerated: number; considered: number }> {
  const [globalBlock, globalPromote] = await Promise.all([getGlobalBlocklist(), getGlobalPromotions()]);

  const { data: rows } = await supabase
    .from('alternatives_catalogue')
    .select('service_key, service_name, category, raw_payload, quality_score, request_count, refreshed_at, status');
  const all = (rows ?? []) as any[];

  // Phase A/B — feedback re-rank + overrides + global block/promote. Zero API.
  let reranked = 0;
  for (const r of all) {
    await reresolve(r.service_key, r.service_name, (r.raw_payload ?? []) as Alt[], globalBlock, globalPromote);
    reranked++;
  }

  // Phase L — liveness: prune dead links (free HEAD checks). Demand-first, capped.
  const byDemand = [...all].sort((a, b) => (b.request_count ?? 0) - (a.request_count ?? 0));
  let pruned = 0;
  for (const r of byDemand.slice(0, MAX_LIVENESS)) {
    const raw = (r.raw_payload ?? []) as Alt[];
    if (!raw.length) continue;
    const live = await verifyLiveWebsites(raw);
    if (live.length < raw.length) {
      await supabase.from('alternatives_catalogue').update({ raw_payload: live }).eq('service_key', r.service_key);
      await reresolve(r.service_key, r.service_name, live, globalBlock, globalPromote);
      r.raw_payload = live; // reflect for the thinness check below
      pruned++;
    }
  }

  // Phase C — REACTIVE regen (LLM), capped. Triggered by signals, not a clock.
  const needy = all
    .filter((r) =>
      (r.raw_payload?.length ?? 0) < 2 ||
      r.status === 'needs_review' ||
      Date.now() - new Date(r.refreshed_at).getTime() > SAFETY_TTL_MS)
    .sort((a, b) => (b.request_count ?? 0) - (a.request_count ?? 0))
    .slice(0, MAX_REGEN);

  let regenerated = 0;
  for (const r of needy) {
    try {
      const alts = await generateAlternatives(r.service_name, r.category);
      if (alts.length === 0) continue; // don't wipe a good entry on a transient empty
      await supabase.from('alternatives_catalogue').update({
        raw_payload: alts, refreshed_at: new Date().toISOString(), status: 'active',
      }).eq('service_key', r.service_key);
      await reresolve(r.service_key, r.service_name, alts, globalBlock, globalPromote);
      regenerated++;
    } catch {
      /* skip; picked up again next cycle */
    }
  }

  return { reranked, pruned, regenerated, considered: needy.length };
}
