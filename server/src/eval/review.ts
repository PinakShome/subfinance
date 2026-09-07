/**
 * App-owner catalogue review & curation (CLI). Curation is authoritative — the
 * LLM never overwrites it.
 *
 * Run from server/ (railway run injects Supabase creds):
 *   railway run --service jubilant-consideration npm run review:catalog
 *      list                         overview of every service (score, demand, status)
 *      show   "<key>"               a service's live suggestions + feedback stats
 *      block  "<key>" "<name>"      remove an alternative from that service
 *      pin    "<key>" "<name>" [price=9.99 url=https://… desc="…"]   force to top
 *      edit   "<key>" "<name>"  price=9.99 url=https://… desc="…"     fix fields
 *      clear  "<key>" "<name>" <block|pin|edit>                       undo an override
 *
 * <key> is the normalized "name|category", e.g. "netflix|streaming" (from `list`).
 */
import 'dotenv/config';
import { supabase } from '../lib/supabase';
import { getFeedbackMap, reresolve } from '../lib/catalogue';
import { Alt } from '../lib/alternatives-gen';

function parsePatch(tokens: string[]): Partial<Alt> {
  const patch: Partial<Alt> = {};
  for (const t of tokens) {
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq), v = t.slice(eq + 1);
    if (k === 'price') patch.monthly_price = v === '' || v.toLowerCase() === 'free' ? null : parseFloat(v);
    else if (k === 'url') patch.website = v;
    else if (k === 'desc') patch.description = v;
    else if (k === 'name') patch.name = v;
  }
  return patch;
}

async function rowFor(key: string) {
  const { data } = await supabase
    .from('alternatives_catalogue')
    .select('service_key, service_name, category, raw_payload, payload, quality_score')
    .eq('service_key', key).maybeSingle();
  return data as any;
}

async function reresolveKey(key: string) {
  const row = await rowFor(key);
  if (!row) { console.error(`No catalogue entry for "${key}".`); return; }
  const payload = await reresolve(row.service_key, row.service_name, (row.raw_payload ?? []) as Alt[]);
  console.log(`Re-resolved "${key}" → ${payload.length} shown: ${payload.map((a) => a.name).join(', ')}`);
}

async function list() {
  const { data } = await supabase
    .from('alternatives_catalogue')
    .select('service_key, quality_score, request_count, status, payload')
    .order('request_count', { ascending: false });
  const rows = (data ?? []) as any[];
  if (!rows.length) { console.log('Catalogue is empty. Run: npm run build:catalog'); return; }
  console.log(`\n${'SERVICE KEY'.padEnd(34)} SCORE  REQ  STATUS         #ALTS`);
  for (const r of rows) {
    console.log(`${String(r.service_key).padEnd(34)} ${String(r.quality_score ?? '-').padStart(5)}  ${String(r.request_count).padStart(3)}  ${String(r.status).padEnd(13)}  ${(r.payload?.length ?? 0)}`);
  }
  console.log(`\n${rows.length} services. Use: show "<key>"  to inspect one.\n`);
}

async function show(key: string) {
  const row = await rowFor(key);
  if (!row) { console.error(`No catalogue entry for "${key}".`); return; }
  const fb = await getFeedbackMap(row.service_name);
  console.log(`\n${row.service_name} (${row.category})  score ${row.quality_score ?? '-'}\n`);
  for (const a of (row.payload ?? []) as Alt[]) {
    const s = fb.get(a.name.toLowerCase());
    const votes = s ? `  👍${s.up} 👎${s.down}` : '';
    console.log(`  • ${a.name} — ${a.monthly_price == null ? 'Free' : '$' + a.monthly_price + '/mo'}${votes}\n    ${a.website ?? '(no url)'}\n    ${a.description}`);
  }
  console.log('');
}

async function writeOverride(key: string, name: string, action: 'pin' | 'block' | 'edit', patch: Partial<Alt>) {
  const { error } = await supabase.from('alternative_overrides').upsert(
    { service_key: key, alternative_name: name, action, patch },
    { onConflict: 'service_key,alternative_name,action' },
  );
  if (error) { console.error('Failed to save override:', error.message); return; }
  console.log(`Saved ${action} for "${name}" on "${key}".`);
  await reresolveKey(key);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case undefined:
    case 'list': await list(); break;
    case 'show': await show(rest[0]); break;
    case 'block': await writeOverride(rest[0], rest[1], 'block', {}); break;
    case 'pin': await writeOverride(rest[0], rest[1], 'pin', parsePatch(rest.slice(2))); break;
    case 'edit': await writeOverride(rest[0], rest[1], 'edit', parsePatch(rest.slice(2))); break;
    case 'clear': {
      await supabase.from('alternative_overrides').delete()
        .eq('service_key', rest[0]).eq('alternative_name', rest[1]).eq('action', rest[2]);
      console.log(`Cleared ${rest[2]} override for "${rest[1]}".`);
      await reresolveKey(rest[0]);
      break;
    }
    default: console.error(`Unknown command "${cmd}". See the header of review.ts for usage.`);
  }
}

main();
