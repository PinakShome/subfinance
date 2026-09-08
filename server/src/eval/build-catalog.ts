/**
 * Build the alternatives catalog WITHOUT manual research.
 *
 * The "catalog" is just the alternatives_catalogue table pre-filled with
 * high-quality, judged results for the services people actually track. Sources,
 * in priority order:
 *   1. Real usage — the most common subscription names in your own DB.
 *   2. A small seed list, so a brand-new app still ships a useful catalog.
 *
 * For each service it makes ONE grounded call by default (cheap) and upserts the
 * result into the cache the live API reads. Pass --judge for the thorough
 * generate -> judge -> refine loop (higher quality, several × the cost) — worth
 * it for your top services, overkill for a full seed. Re-run periodically to
 * refresh prices and pick up newly popular services (see the flywheel notes).
 *
 * Run from server/:  railway run --service jubilant-consideration npm run build:catalog
 *   thorough pass:   railway run --service jubilant-consideration npm run build:catalog -- --judge
 */
import 'dotenv/config';
import { supabase } from '../lib/supabase';
import { generateJudgedAlternatives } from '../lib/judge';
import { generateAlternatives, Alt } from '../lib/alternatives-gen';
import { normalizeKey, reresolve } from '../lib/catalogue';

interface Svc { name: string; category: string; cost: number | null; source: string; }

// Seed list — popular services so the catalog is useful before you have usage.
const SEED: { name: string; category: string; cost: number }[] = [
  { name: 'Netflix', category: 'Streaming', cost: 15.49 },
  { name: 'Disney+', category: 'Streaming', cost: 13.99 },
  { name: 'Spotify', category: 'Music', cost: 11.99 },
  { name: 'YouTube Premium', category: 'Streaming', cost: 13.99 },
  { name: 'Adobe Creative Cloud', category: 'Software', cost: 59.99 },
  { name: 'ChatGPT Plus', category: 'Software', cost: 20 },
  { name: 'Notion', category: 'Software', cost: 10 },
  { name: 'Dropbox', category: 'Cloud', cost: 11.99 },
  { name: 'Microsoft 365', category: 'Software', cost: 6.99 },
  { name: 'Audible', category: 'News', cost: 14.95 },
  { name: 'Grammarly', category: 'Software', cost: 12 },
  { name: 'Peloton', category: 'Fitness', cost: 12.99 },
];

/** Most-tracked services across all users (real demand). */
async function popularFromDB(limit: number): Promise<Svc[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('name, cost, category:categories(name)')
    .eq('is_active', true);
  if (error || !data) return [];

  const map = new Map<string, Svc & { count: number }>();
  for (const s of data as any[]) {
    const cat = Array.isArray(s.category) ? s.category[0]?.name : s.category?.name;
    const name = String(s.name ?? '').trim();
    if (!name) continue;
    const key = `${name.toLowerCase()}|${(cat ?? '').toLowerCase()}`;
    const e = map.get(key) ?? { name, category: cat ?? '', cost: s.cost ?? null, count: 0, source: 'usage' };
    e.count++;
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set. Try: railway run --service jubilant-consideration npm run build:catalog');
    process.exit(1);
  }

  const fromDB = await popularFromDB(40);
  const merged = new Map<string, Svc>();
  for (const s of [...fromDB, ...SEED.map((s) => ({ ...s, source: 'seed' as const }))]) {
    const key = `${s.name.toLowerCase()}|${s.category.toLowerCase()}`;
    if (!merged.has(key)) merged.set(key, s);
  }
  const services = [...merged.values()];
  console.log(`Building catalog for ${services.length} services (${fromDB.length} from usage, ${SEED.length} seed)…\n`);

  const useJudge = process.argv.includes('--judge');
  console.log(useJudge
    ? 'Mode: --judge (generate→judge→refine — higher quality, higher cost)\n'
    : 'Mode: plain generate (1 grounded call each; cheap). Add "-- --judge" for a quality pass.\n');

  let done = 0, strong = 0, empty = 0;
  for (const svc of services) {
    try {
      let alts: Alt[], score: number | null = null, rounds = 0;
      if (useJudge) {
        const r = await generateJudgedAlternatives(svc.name, svc.category, svc.cost);
        alts = r.alts; score = r.score; rounds = r.rounds;
      } else {
        alts = await generateAlternatives(svc.name, svc.category);
      }
      // Never cache an empty generation — a transient miss would poison this
      // service until the nightly job. Skip and let a re-run pick it up.
      if (alts.length === 0) {
        empty++;
        console.log(`${svc.name.padEnd(24)} EMPTY — skipped (not cached) [${svc.source}]`);
        continue;
      }
      const key = normalizeKey(svc.name, svc.category);
      await supabase.from('alternatives_catalogue').upsert({
        service_key: key, service_name: svc.name, category: svc.category,
        raw_payload: alts, payload: alts, quality_score: score,
        refreshed_at: new Date().toISOString(), resolved_at: new Date().toISOString(),
        status: alts.length < 2 ? 'needs_review' : 'active',
      }, { onConflict: 'service_key' });
      // Bake in any existing feedback/owner overrides for this service.
      await reresolve(key, svc.name, alts);
      done++;
      if (score != null && score >= 80) strong++;
      const scoreStr = score == null ? '  -' : String(score).padStart(3);
      console.log(`${svc.name.padEnd(24)} score ${scoreStr}  alts ${alts.length}  rounds ${rounds}  [${svc.source}] cached`);
    } catch (e: any) {
      console.log(`${svc.name.padEnd(24)} ERROR: ${e.message}`);
    }
  }

  console.log(`\nDone. ${done} cached${useJudge ? `, ${strong} strong (score>=80)` : ''}${empty ? `, ${empty} empty/skipped` : ''}.`);
}

main();
