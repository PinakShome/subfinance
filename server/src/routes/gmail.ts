import { Router } from 'express';
import { google } from 'googleapis';
import { requireAuth } from '../lib/auth';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Known subscription-related sender keywords
const SUBSCRIPTION_KEYWORDS = [
  'receipt', 'invoice', 'subscription', 'billing', 'payment', 'charge',
  'renewal', 'plan', 'membership', 'your order',
];

const router = Router();

// Step 1: Get Google OAuth URL
router.get('/auth-url', requireAuth, (_req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.json({ url });
});

// Step 2: Handle OAuth callback, fetch emails
router.get('/callback', async (req, res) => {
  const { code } = req.query as { code: string };
  if (!code) { res.status(400).json({ error: 'Missing code' }); return; }

  try {
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
    res.status(500).json({ error: err.message });
  }
});

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
