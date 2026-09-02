/**
 * Alternatives quality eval. Scores the live LLM pipeline (generation + URL
 * liveness + cheaper-filter) against a human-verified golden set, so "is it any
 * good?" becomes a number you can track across changes.
 *
 * Run from server/:   railway run --service jubilant-consideration npm run eval:alternatives
 * (railway run injects ANTHROPIC_API_KEY + Supabase creds; or set them yourself.)
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { generateAlternatives } from '../routes/alternatives';

interface Expected { name: string; approx_price: number; }
interface GoldenEntry { name: string; category: string; current_price: number; expected_alternatives: Expected[]; }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const nameMatch = (a: string, b: string) => { const x = norm(a), y = norm(b); return !!x && !!y && (x.includes(y) || y.includes(x)); };

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set. Try:  railway run --service jubilant-consideration npm run eval:alternatives');
    process.exit(1);
  }
  const golden: GoldenEntry[] =
    JSON.parse(fs.readFileSync(path.join(__dirname, 'golden-set.json'), 'utf8')).services;

  let covTotal = 0, covHits = 0, priceChecked = 0, priceHits = 0, zeroResults = 0;
  const rows: string[] = [];

  for (const g of golden) {
    let got;
    try { got = await generateAlternatives(g.name, g.category); }
    catch (e: any) { rows.push(`${g.name.padEnd(22)} ERROR: ${e.message}`); continue; }

    // Same cheaper-filter the API applies before returning to the app.
    const cheaper = got.filter((a) => a.monthly_price === null || a.monthly_price < g.current_price);
    if (cheaper.length === 0) zeroResults++;

    let hits = 0;
    for (const exp of g.expected_alternatives) {
      const found = cheaper.find((a) => nameMatch(a.name, exp.name));
      if (!found) continue;
      hits++;
      if (exp.approx_price > 0 && found.monthly_price != null) {
        priceChecked++;
        if (Math.abs(found.monthly_price - exp.approx_price) / exp.approx_price <= 0.25) priceHits++;
      }
    }
    covTotal += g.expected_alternatives.length;
    covHits += hits;
    const cov = Math.round((100 * hits) / g.expected_alternatives.length);
    rows.push(
      `${g.name.padEnd(22)} cov ${String(cov).padStart(3)}%  live-results ${cheaper.length}  ` +
      `[${cheaper.map((a) => a.name).join(', ').slice(0, 64)}]`,
    );
  }

  const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);
  console.log('\n=== SubFinance · Alternatives quality eval ===\n');
  rows.forEach((r) => console.log(r));
  console.log('\n--- Aggregate ---');
  console.log(`Coverage (found expected):  ${pct(covHits, covTotal)}%  (${covHits}/${covTotal})`);
  console.log(`Price within 25% of truth:  ${pct(priceHits, priceChecked)}%  (${priceHits}/${priceChecked})`);
  console.log(`Services with 0 results:    ${zeroResults}/${golden.length}`);
  console.log('\nScored against golden-set.json — keep it verified & current for the numbers to mean anything.\n');
}

main();
