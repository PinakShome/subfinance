import { supabase } from './supabase';
import { Alt } from './alternatives-gen';
import { getGlobalBlocklist, reresolve } from './catalogue';
import { generateJudgedAlternatives } from './judge';

// Hard cap on grounded regenerations per cycle — bounds API cost predictably.
const MAX_REGEN = Number(process.env.CATALOGUE_MAX_REGEN ?? 15);
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
 *        needs_review, run the grounded generate→judge→refine loop — capped
 *        and demand-prioritized so cost stays bounded.
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
      const { alts, score } = await generateJudgedAlternatives(r.service_name, r.category, null);
      await supabase.from('alternatives_catalogue').update({
        raw_payload: alts, quality_score: score, refreshed_at: new Date().toISOString(),
      }).eq('service_key', r.service_key);
      await reresolve(r.service_key, r.service_name, alts, globalBlock);
      regenerated++;
    } catch {
      /* skip; picked up again next cycle */
    }
  }

  return { reranked, regenerated, considered: needy.length };
}
