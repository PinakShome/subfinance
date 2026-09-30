/**
 * Catalogue integrity check — run in CI or before a seed to catch data bugs
 * that the type system can't. Exits non-zero on any ERROR.
 *
 *   cd server && npm run check:catalog
 */
import { SEED } from './seed-catalog';
import { REFERENCE_SERVICES } from './reference-catalog';
import { normalizeKey } from '../lib/catalogue';

let errors = 0;
let warnings = 0;
const err = (m: string) => { console.error('  ERROR  ' + m); errors++; };
const warn = (m: string) => { console.warn('  warn   ' + m); warnings++; };

// Reference price by canonical key (name-only, matching normalizeKey).
const refPrice = new Map<string, number | undefined>();
for (const s of REFERENCE_SERVICES) refPrice.set(normalizeKey(s.name), s.approx_monthly);

// 1. Duplicate service keys in SEED (would silently overwrite on upsert).
const seen = new Map<string, string>();
for (const s of SEED) {
  const k = normalizeKey(s.name);
  const label = `${s.name} / ${s.category}`;
  if (seen.has(k)) err(`duplicate service key "${k}" — ${seen.get(k)} and ${label}`);
  else seen.set(k, label);
}

// 2. Per-entry alternative checks.
const urlRe = /^https:\/\/[^\s]+$/i;
for (const s of SEED) {
  if (!s.alts || s.alts.length === 0) { err(`"${s.name}" has no alternatives`); continue; }
  const svcPrice = refPrice.get(normalizeKey(s.name));
  const altNames = new Set<string>();
  for (const alt of s.alts) {
    if (!alt || !alt.name) { err(`"${s.name}" has an alternative with no name`); continue; }
    const an = alt.name.toLowerCase();
    if (an === s.name.toLowerCase()) err(`"${s.name}" lists itself as an alternative`);
    if (altNames.has(an)) warn(`"${s.name}" has a duplicate alternative "${alt.name}"`);
    altNames.add(an);
    if (alt.website != null && !urlRe.test(alt.website)) err(`"${s.name}" -> "${alt.name}" has a non-https website: ${alt.website}`);
    if (typeof alt.monthly_price === 'number' && alt.monthly_price < 0) err(`"${s.name}" -> "${alt.name}" has a negative price`);
    // Every alternative should be cheaper than (or free vs) the original.
    if (typeof alt.monthly_price === 'number' && alt.monthly_price > 0 &&
        typeof svcPrice === 'number' && svcPrice > 0 && alt.monthly_price >= svcPrice) {
      warn(`"${s.name}" ($${svcPrice}) -> "${alt.name}" ($${alt.monthly_price}) is not cheaper`);
    }
  }
}

// 3. Coverage report (informational).
const refKeys = new Set(REFERENCE_SERVICES.map((s) => normalizeKey(s.name)));
const seedKeys = new Set(SEED.map((s) => normalizeKey(s.name)));
const missing = [...refKeys].filter((k) => !seedKeys.has(k));

console.log('');
console.log(`Catalogue check — ${SEED.length} seeded services, ${REFERENCE_SERVICES.length} reference services.`);
if (missing.length) console.log(`  ${missing.length} reference service(s) have no seed alternatives (fine if usage-based/one-time).`);
console.log(`Result: ${errors} error(s), ${warnings} warning(s).`);
process.exit(errors > 0 ? 1 : 0);
