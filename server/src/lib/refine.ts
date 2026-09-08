import { supabase } from './supabase';
import { Alt, generateAlternatives } from './alternatives-gen';
import { getGlobalBlocklist, reresolve } from './catalogue';

// Hard cap on grounded regenerations per cycle — bounds API cost predictably.
const MAX_REGEN = Number(process.env.CATALOGUE_MAX_REGEN ?? 5);
const DAY = 86_400_000;

/** Confident entries refresh rarely; shaky ones more often. */
function adaptiveTtlMs(score: number | null): number {
  if (score != null && score >= 90) return 90 * DAY;
  if (score != null && score < 70) return 14 * DAY;
  return 30 * DAY;
}

/**
 * The background flywheel. Most of the work is pure logic (no API calls):
 *   A/B. Re-rank every entry from the latest feedback + owner overrides +
 *        global blocklist — this is where "refine per cycle from feedback"
 *        happens, for free.
 *   C.   Only for entries that are stale (adaptive TTL), thin, or flagged
 *        needs_review, run a single grounded regeneration — capped and
 *        demand-prioritized so cost stays bounded. The expensive generate→judge
 *        →refine loop is deliberately NOT used here; it's reserved for the manual
 *        `build:catalog --judge` quality pass. Nightly just refreshes prices/URLs.
 * Wire this to a nightly cron.
 */
export async function runRefinementCycle(): Promise<{ reranked: number; regenerated: number; considered: number }> {
  const globalBlock = await getGlobalBlocklist();

  const { data: rows } = await supabase
    .from('alternatives_catalogue')
    .select('service_key, service_name, category, raw_payload, quality_score, request_count, refreshed_at');
  const all = (rows ?? []) as any[];

  // Phase A/B — feedback re-ranking + overrides + global blocklist. Zero API.
  let reranked = 0;
  for (const r of all) {
    await reresolve(r.service_key, r.service_name, (r.raw_payload ?? []) as Alt[], globalBlock);
    reranked++;
  }

  // Phase C — capped, grounded regen for entries that genuinely need fresh data.
  const needy = all
    .filter((r) =>
      Date.now() - new Date(r.refreshed_at).getTime() > adaptiveTtlMs(r.quality_score) ||
      (r.raw_payload?.length ?? 0) < 2)
    .sort((a, b) => (b.request_count ?? 0) - (a.request_count ?? 0)) // demand first
    .slice(0, MAX_REGEN);

  let regenerated = 0;
  for (const r of needy) {
    try {
      const alts = await generateAlternatives(r.service_name, r.category);
      // Don't let a transient empty result wipe a previously-good entry — skip
      // and let the next cycle retry it.
      if (alts.length === 0) continue;
      // Keep the existing quality_score — it reflects the last judged pass; a
      // plain refresh shouldn't claim a score it didn't earn.
      await supabase.from('alternatives_catalogue').update({
        raw_payload: alts, refreshed_at: new Date().toISOString(),
      }).eq('service_key', r.service_key);
      await reresolve(r.service_key, r.service_name, alts, globalBlock);
      regenerated++;
    } catch {
      /* skip; picked up again next cycle */
    }
  }

  return { reranked, regenerated, considered: needy.length };
}
