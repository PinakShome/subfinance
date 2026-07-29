import crypto from 'crypto';
import { Router } from 'express';
import { google } from 'googleapis';
import * as Sentry from '@sentry/node';
import { requireAuth } from '../lib/auth';

/**
 * Build a *per-request* OAuth client. A module-level shared client would have
 * its credentials mutated by setCredentials() on every callback, so concurrent
 * users could end up reading each other's mailboxes.
 */
function newOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Known subscription-related sender keywords
const SUBSCRIPTION_KEYWORDS = [
  'receipt', 'invoice', 'subscription', 'billing', 'payment', 'charge',
  'renewal', 'plan', 'membership', 'your order',
];

const router = Router();

// Step 1: Get Google OAuth URL. `state` binds the flow to this user so the
// callback can't be replayed or CSRF'd with someone else's authorization code.
router.get('/auth-url', requireAuth, (req, res) => {
  const userId = (req as any).userId as string;
  const state = signState(userId);
  const url = newOAuthClient().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state,
  });
  res.json({ url });
});

// Step 2: Handle OAuth callback, fetch emails. Google redirects the browser
// here, so there is no Authorization header — the signed `state` is what
// authenticates the request.
router.get('/callback', async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code) { res.status(400).json({ error: 'Missing code' }); return; }
  if (!state || !verifyState(state)) {
    res.status(400).json({ error: 'Invalid or expired authorization state.' });
    return;
  }

  try {
    const oauth2Client = newOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const query = SUBSCRIPTION_KEYWORDS.map((k) => `subject:(${k})`).join(' OR ');

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50,
    });

    const messages = listRes.data.messages ?? [];
    const detectedMap: Map<string, { name: string; amount: number | null; currency: string }> = new Map();

    for (const msg of messages.slice(0, 20)) {
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
      const headers = detail.data.payload?.headers ?? [];
      const from = headers.find((h) => h.name === 'From')?.value ?? '';
      const subject = headers.find((h) => h.name === 'Subject')?.value ?? '';

      const name = extractSenderName(from);
      if (!name || detectedMap.has(name)) continue;

      const amount = extractAmount(subject);
      detectedMap.set(name, { name, amount, currency: 'USD' });
    }

    res.json({ detected: Array.from(detectedMap.values()) });
  } catch (err: any) {
    Sentry.captureException(err, { tags: { route: 'gmail/callback' } });
    console.error('[gmail] callback failed');
    res.status(500).json({ error: 'Could not import from Gmail. Please try again.' });
  }
});

/** HMAC-signed, 10-minute OAuth `state` token: "<userId>.<expiry>.<sig>". */
function stateSecret(): string {
  return process.env.OAUTH_STATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
}

function signState(userId: string): string {
  const payload = `${userId}.${Date.now() + 10 * 60 * 1000}`;
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyState(state: string): boolean {
  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [userId, expiry, sig] = parts;
  const expected = crypto
    .createHmac('sha256', stateSecret())
    .update(`${userId}.${expiry}`)
    .digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(expiry) > Date.now();
}

function extractSenderName(from: string): string | null {
  // "Netflix <no-reply@netflix.com>" → "Netflix"
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : null;
}

function extractAmount(subject: string): number | null {
  const match = subject.match(/\$(\d+(?:\.\d{1,2})?)/);
  return match ? parseFloat(match[1]) : null;
}

export default router;
