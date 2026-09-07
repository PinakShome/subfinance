/**
 * Build the alternatives catalog WITHOUT manual research.
 *
 * The "catalog" is just the alternatives_catalogue table pre-filled with
 * high-quality, judged results for the services people actually track. Sources,
 * in priority order:
 *   1. Real usage — the most common subscription names in your own DB.
 *   2. A small seed list, so a brand-new app still ships a useful catalog.
 *
 * For each service it runs the grounded generate -> judge -> refine loop and
 * upserts the winner into the cache the live API reads. Re-run periodically to
 * refresh prices and pick up newly popular services (see the flywheel notes).
 *
 * Run from server/:  railway run --service jubilant-consideration npm run build:catalog
 */
import 'dotenv/config';
import { supabase } from '../lib/supabase';
import { generateJudgedAlternatives } from '../lib/judge';
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

  let ok = 0, weak = 0;
  for (const svc of services) {
    try {
      const { alts, score, rounds } = await generateJudgedAlternatives(svc.name, svc.category, svc.cost);
      const key = normalizeKey(svc.name, svc.category);
      await supabase.from('alternatives_catalogue').upsert({
        service_key: key, service_name: svc.name, category: svc.category,
        raw_payload: alts, payload: alts, quality_score: score,
        refreshed_at: new Date().toISOString(), resolved_at: new Date().toISOString(),
        status: alts.length < 2 ? 'needs_review' : 'active',
      }, { onConflict: 'service_key' });
      // Bake in any existing feedback/owner overrides for this service.
      await reresolve(key, svc.name, alts);
      score >= 80 ? ok++ : weak++;
      console.log(`${svc.name.padEnd(24)} score ${String(score).padStart(3)}  alts ${alts.length}  rounds ${rounds}  [${svc.source}] cached`);
    } catch (e: any) {
      console.log(`${svc.name.padEnd(24)} ERROR: ${e.message}`);
    }
  }

  console.log(`\nDone. ${ok} strong (score>=80), ${weak} weak. Weak ones are worth a look — improve the prompt or exclude the service.`);
}

main();
