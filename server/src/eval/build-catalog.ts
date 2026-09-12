/**
 * Build the alternatives catalogue WITHOUT manual research.
 *
 * The service universe is the reference catalogue (server/src/eval/reference-
 * catalog.ts) — an exhaustive, web-surveyed list of categories → services —
 * merged with the most-tracked services in your own DB (real demand ranks first).
 *
 * For each service it generates cheaper-alternative suggestions and upserts them
 * into alternatives_catalogue (what the live API reads). By default it uses a
 * single grounded generation per service (cheap). Pass --judge to run the
 * generate→judge→refine loop instead (higher quality, several API calls each —
 * reserve it for a curated pass over your top services).
 *
 *   railway run --service jubilant-consideration npm run build:catalog
 *   railway run --service jubilant-consideration npm run build:catalog -- --judge
 *   ... -- --limit 30      (cap how many services to process this run)
 */
import 'dotenv/config';
import { supabase } from '../lib/supabase';
import { generateJudgedAlternatives } from '../lib/judge';
import { Alt, generateAlternatives } from '../lib/alternatives-gen';
import { normalizeKey, reresolve } from '../lib/catalogue';
import { REFERENCE_SERVICES } from './reference-catalog';

interface Svc { name: string; category: string; cost: number | null; source: string; }

/** Most-tracked services across all users (real demand), keyed by canonical name. */
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
    const key = normalizeKey(name, cat ?? '');
    const e = map.get(key) ?? { name, category: cat ?? '', cost: s.cost ?? null, count: 0, source: 'usage' };
    e.count++;
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set. Try: railway run --service jubilant-consideration npm run build:catalog');
    process.exit(1);
  }
  const useJudge = process.argv.includes('--judge');
  const limit = Number(argValue('--limit') ?? Infinity);

  const fromDB = await popularFromDB(40);
  const reference: Svc[] = REFERENCE_SERVICES.map((s) => ({
    name: s.name, category: s.category, cost: s.approx_monthly ?? null, source: 'reference',
  }));

  // Merge, DB demand first, deduped by canonical (name-based) key.
  const merged = new Map<string, Svc>();
  for (const s of [...fromDB, ...reference]) {
    const key = normalizeKey(s.name, s.category);
    if (!merged.has(key)) merged.set(key, s);
  }
  const services = [...merged.values()].slice(0, limit);
  console.log(
    `Building catalogue for ${services.length} services ` +
    `(${fromDB.length} from usage, ${reference.length} reference) · mode=${useJudge ? 'judge' : 'generate'}\n`,
  );

  let ok = 0, weak = 0, empty = 0;
  for (const svc of services) {
    try {
      let alts: Alt[], score: number | null = null, rounds = 0;
      if (useJudge) {
        const r = await generateJudgedAlternatives(svc.name, svc.category, svc.cost);
        alts = r.alts; score = r.score; rounds = r.rounds;
      } else {
        alts = await generateAlternatives(svc.name, svc.category);
      }
      // Never cache an empty generation — leave it for the next run to retry.
      if (alts.length === 0) { empty++; console.log(`${svc.name.padEnd(26)} 0 alts — skipped`); continue; }

      const key = normalizeKey(svc.name, svc.category);
      await supabase.from('alternatives_catalogue').upsert({
        service_key: key, service_name: svc.name, category: svc.category,
        raw_payload: alts, payload: alts, quality_score: score,
        refreshed_at: new Date().toISOString(), resolved_at: new Date().toISOString(),
        status: alts.length < 2 ? 'needs_review' : 'active',
      }, { onConflict: 'service_key' });
      await reresolve(key, svc.name, alts);

      (score == null || score >= 80) ? ok++ : weak++;
      console.log(`${svc.name.padEnd(26)} score ${String(score ?? '-').padStart(3)}  alts ${alts.length}  rounds ${rounds}  [${svc.source}]`);
    } catch (e: any) {
      console.log(`${svc.name.padEnd(26)} ERROR: ${e.message}`);
    }
  }

  console.log(`\nDone. ${ok} ok, ${weak} weak (judged <80), ${empty} empty/skipped.`);
}

main();
