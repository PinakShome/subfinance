import 'dotenv/config';
import * as Sentry from '@sentry/node';

// Initialise error monitoring as early as possible. No-op until SENTRY_DSN is
// set, so this is safe to ship before the Sentry account is wired up.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
  console.log('[sentry] error monitoring enabled');
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import plaidRouter from './routes/plaid';
import gmailRouter from './routes/gmail';
import alternativesRouter from './routes/alternatives';
import { sendTrialExpiryNotifications } from './cron/trialNotifications';

const app = express();

// CORS allowlist. Native apps send no Origin header (allowed); browsers must
// come from our own web domains. Extra origins via CORS_ORIGINS (comma-sep).
const allowedOrigins = [
  'https://subscription-tracker-gilt.vercel.app',
  'https://subscription-tracker-pinak-shome-s-projects.vercel.app',
  'http://localhost:8081',
  'http://localhost:19006',
  ...(process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []),
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow (no header withheld) for our origins or non-browser callers.
    // Otherwise withhold the allow-origin header so the browser blocks it —
    // without throwing a 500.
    cb(null, !origin || allowedOrigins.includes(origin));
  },
}));
app.use(express.json());

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rate limiting. Railway runs behind a proxy, so trust it for correct client IPs.
app.set('trust proxy', 1);
// General cap across the API to blunt abuse/scraping.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
// Tighter cap on the AI route — each call hits the paid Anthropic API.
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api', apiLimiter);

app.use('/api/plaid', plaidRouter);
app.use('/api/gmail', gmailRouter);
app.use('/api/alternatives', aiLimiter, alternativesRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Serve Plaid Link as a real HTML page (avoids WebView CSP issues)
app.get('/plaid/link', (req, res) => {
  const token = req.query.token as string;
  if (!token) { res.status(400).send('Missing token'); return; }
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; height: 100vh; }
    p { color: #94a3b8; font-family: sans-serif; }
  </style>
</head>
<body>
  <p>Opening bank connection...</p>
  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
  <script>
    const handler = Plaid.create({
      token: '${token}',
      onSuccess: function(public_token, metadata) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', public_token: public_token }));
      },
      onExit: function(err, metadata) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'exit' }));
      },
      onLoad: function() {
        handler.open();
      },
    });
    handler.open();
  </script>
</body>
</html>`);
});

// Sentry error handler — must come after routes, before other error middleware.
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Run trial expiry notifications daily at 9am
cron.schedule('0 9 * * *', () => {
  sendTrialExpiryNotifications().catch((err) => {
    Sentry.captureException(err);
    console.error(err);
  });
});

const PORT = process.env.PORT ?? 3001;
app.listen(Number(PORT), '0.0.0.0', () =>
  console.log(`Server running on 0.0.0.0:${PORT} (all interfaces)`),
);
