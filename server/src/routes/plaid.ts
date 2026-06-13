import { Router } from 'express';
import * as Sentry from '@sentry/node';
import {
  Configuration, PlaidApi, PlaidEnvironments,
  Products, CountryCode, Transaction,
} from 'plaid';
import { requireAuth } from '../lib/auth';

const config = new Configuration({
  basePath: PlaidEnvironments[(process.env.PLAID_ENV?.trim() ?? 'sandbox') as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID?.trim() ?? '',
      'PLAID-SECRET': process.env.PLAID_SECRET?.trim() ?? '',
    },
  },
});
const plaidClient = new PlaidApi(config);

const router = Router();

// Create a link token to initialize Plaid Link on the client
router.post('/link-token', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'SubTracker',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err: any) {
    console.error('Link token error:', err.response?.data ?? err.message);
    res.status(500).json({ error: err.message });
  }
});

// Exchange the public token, pull recent transactions, and detect subscriptions.
// NOTE: never log transaction names/amounts — that's user financial data (PII).
router.post('/exchange', requireAuth, async (req, res) => {
  try {
    const { public_token } = req.body as { public_token: string };
    if (!public_token) {
      return res.status(400).json({ error: 'public_token required' });
    }

    const { data: exch } = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = exch.access_token;

    // Pull all transactions in the 90-day window, paginating through every page.
    // Retry on PRODUCT_NOT_READY while Plaid's async historical pull warms up.
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    let fetched: Transaction[] = [];
    let total = 0;
    let readyError: string | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const { data: first } = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: start,
          end_date: end,
          options: { count: 100, offset: 0 },
        });
        total = first.total_transactions;
        fetched = [...first.transactions];

        while (fetched.length < total && fetched.length < 500) {
          const { data: page } = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: start,
            end_date: end,
            options: { count: 100, offset: fetched.length },
          });
          if (page.transactions.length === 0) break;
          fetched.push(...page.transactions);
        }
        readyError = null;
        break;
      } catch (e: any) {
        const code = e.response?.data?.error_code;
        readyError = code ?? 'fetch_failed';
        if (code === 'PRODUCT_NOT_READY' && attempt < 4) {
          await new Promise((r) => setTimeout(r, 4000));
        } else {
          break;
        }
      }
    }

    const detected = detectSubscriptions(fetched);
    // Safe to log: counts only, no merchant names or amounts.
    console.log(`[plaid] exchange ok — fetched=${fetched.length} total=${total} detected=${detected.length}${readyError ? ` readyError=${readyError}` : ''}`);

    if (fetched.length === 0 && readyError === 'PRODUCT_NOT_READY') {
      return res.json({ detected: [], pending: true });
    }
    res.json({ detected });
  } catch (err: any) {
    const code = err.response?.data?.error_code ?? 'unknown';
    console.error(`[plaid] exchange failed — ${code}`);
    Sentry.captureException(err, { tags: { route: 'plaid/exchange', plaid_error: code } });
    res.status(500).json({ error: 'Could not import transactions. Please try again.' });
  }
});

// Known subscription providers. Maps a raw-name keyword → clean display name.
const KNOWN_PROVIDERS: { match: string[]; label: string }[] = [
  { match: ['apple.com/bill', 'apple.com bill', 'apple.com', 'apple bill', 'apple music', 'apple fitness', 'itunes'], label: 'Apple' },
  { match: ['playstation', 'ps plus', 'ps+', 'psn', 'sony interactive', 'sony entertainment', 'sony*play'], label: 'PlayStation Plus' },
  { match: ['xbox', 'game pass'], label: 'Xbox / Game Pass' },
  { match: ['amazon prime', 'amzn prime', 'prime video', 'amazon.com*prime'], label: 'Amazon Prime' },
  { match: ['spotify'], label: 'Spotify' },
  { match: ['netflix'], label: 'Netflix' },
  { match: ['hulu'], label: 'Hulu' },
  { match: ['disney'], label: 'Disney+' },
  { match: ['hbo', 'max.com'], label: 'Max' },
  { match: ['youtube premium', 'youtubepremium', 'google youtube'], label: 'YouTube Premium' },
  { match: ['claude.ai', 'anthropic'], label: 'Claude' },
  { match: ['openai', 'chatgpt'], label: 'ChatGPT' },
  { match: ['adobe'], label: 'Adobe' },
  { match: ['microsoft', 'msft'], label: 'Microsoft' },
  { match: ['dropbox'], label: 'Dropbox' },
  { match: ['github'], label: 'GitHub' },
  { match: ['icloud'], label: 'iCloud' },
];

// Descriptors that are NEVER subscriptions — kill generic false positives.
const BLOCKLIST = [
  'payment to chase', 'card ending in', 'autopay to chase', 'chase pay in 4',
  'credit one bank', 'discover e-payment', 'capital one', 'amex epayment',
  'atm', 'wire fee', 'wire transfer', 'non-chase', 'overdraft',
  'doordash', 'dd *', 'ubereats', 'uber eats', 'grubhub', 'instacart',
  'zelle', 'venmo', 'cash app', 'affirm', 'klarna', 'afterpay',
  'mcdonald', '7-eleven', 'circle k', 'maverik', 'exxon', 'sonic', 'walmart',
  'qt ', 'green valley', 'club vinyl', 'smoke', 'vape', 'carvana', 'robinhood',
];

// Strip bank-descriptor noise so the same merchant groups together.
function cleanName(raw: string): string {
  return raw
    .replace(/\b(DD|TST|SQ|SP|PY|PP|POS|ACH|WEB|PURCHASE|DEBIT|RECURRING|REBILL)\b/gi, ' ')
    .replace(/[*#]/g, ' ')
    .replace(/\bORIG CO NAME:.*$/i, ' ')
    .replace(/\bENTRY DESCR:.*$/i, ' ')
    .replace(/\bWEB ID:.*$/i, ' ')
    .replace(/\bID:[A-Z0-9]+/gi, ' ')
    .replace(/\d{3,}/g, ' ')        // digit runs (ids, dates, card numbers)
    .replace(/\d{2}\/\d{2}/g, ' ')  // MM/DD dates
    .replace(/\s+/g, ' ')
    .trim();
}

function matchProvider(raw: string): string | null {
  const lower = raw.toLowerCase();
  for (const p of KNOWN_PROVIDERS) {
    if (p.match.some((m) => lower.includes(m))) return p.label;
  }
  return null;
}

function isBlocked(raw: string): boolean {
  const lower = raw.toLowerCase();
  return BLOCKLIST.some((b) => lower.includes(b));
}

// Median gap (days) between sorted transaction dates — distinguishes a monthly
// subscription (~30d) from daily/weekly noise (card payments, food delivery).
function medianGapDays(txns: Transaction[]): number {
  const dates = txns
    .map((t) => new Date(t.date).getTime())
    .sort((a, b) => a - b);
  if (dates.length < 2) return Infinity;
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push((dates[i] - dates[i - 1]) / 86400000);
  }
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
}

// Split a provider's charges into distinct subscriptions by amount cluster.
// (e.g. Apple Music $12 and Apple Fitness $10.50 both bill as "APPLE.COM BILL".)
function clusterByAmount(txns: Transaction[]): Transaction[][] {
  const sorted = [...txns].sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
  const clusters: Transaction[][] = [];
  for (const t of sorted) {
    const amt = Math.abs(t.amount);
    const last = clusters[clusters.length - 1];
    if (last) {
      const lastAmt = Math.abs(last[0].amount);
      if (Math.abs(amt - lastAmt) / lastAmt < 0.08) { last.push(t); continue; }
    }
    clusters.push([t]);
  }
  return clusters;
}

function detectSubscriptions(txns: Transaction[]) {
  if (!txns || txns.length === 0) return [];

  // Only outflows (positive = money leaving), ignore income/refunds.
  const charges = txns.filter((t) => t.amount > 0);

  // Group: known providers by label, everything else by cleaned name.
  const byKey: Record<string, { label: string; known: boolean; txns: Transaction[] }> = {};
  for (const txn of charges) {
    const raw = txn.merchant_name ?? txn.name ?? '';
    const provider = matchProvider(raw);
    if (!provider && isBlocked(raw)) continue; // skip obvious non-subs
    const cleaned = cleanName(raw);
    const key = provider ?? cleaned.toLowerCase();
    if (!key) continue;
    if (!byKey[key]) byKey[key] = { label: provider ?? cleaned, known: Boolean(provider), txns: [] };
    byKey[key].txns.push(txn);
  }

  const results: { name: string; amount: number; currency: string; frequency: string }[] = [];

  for (const { label, known, txns: group } of Object.values(byKey)) {
    const currency = group[0].iso_currency_code ?? 'USD';

    if (known) {
      // Known provider → split by amount so multiple subs from one biller
      // (Apple Music vs Apple Fitness+) surface separately.
      for (const cluster of clusterByAmount(group)) {
        const amts = cluster.map((t) => Math.abs(t.amount));
        const avg = amts.reduce((a, b) => a + b, 0) / amts.length;
        if (avg < 0.5 || avg > 500) continue;
        results.push({
          name: label,
          amount: Math.round(avg * 100) / 100,
          currency,
          frequency: 'monthly',
        });
      }
      continue;
    }

    // Generic recurring rule (precision-first): 2+ charges, consistent amount,
    // AND a monthly-ish cadence so daily/weekly spend is excluded.
    if (group.length >= 2 && group.length <= 6) {
      const amts = group.map((t) => Math.abs(t.amount));
      const avg = amts.reduce((a, b) => a + b, 0) / amts.length;
      const consistent = amts.every((a) => Math.abs(a - avg) / avg < 0.15);
      const gap = medianGapDays(group);
      const monthlyCadence = gap >= 20 && gap <= 45;
      const quarterlyCadence = gap > 45 && gap <= 100;
      if (consistent && (monthlyCadence || quarterlyCadence) && avg >= 1 && avg <= 200) {
        results.push({
          name: label,
          amount: Math.round(avg * 100) / 100,
          currency,
          frequency: monthlyCadence ? 'monthly' : 'quarterly',
        });
      }
    }
  }

  // De-dupe by label + amount (keeps Apple $12 and Apple $10.50 distinct).
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.name.toLowerCase()}|${Math.round(r.amount)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Sandbox helper (sandbox only)
router.post('/sandbox-token', requireAuth, async (req, res) => {
  try {
    const response = await plaidClient.sandboxPublicTokenCreate({
      institution_id: 'ins_109508',
      initial_products: [Products.Transactions],
    });
    res.json({ public_token: response.data.public_token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
