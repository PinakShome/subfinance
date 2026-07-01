# SubFinance Production Checklist

Last verified: 2026-06-30

## ✅ Done & verified live
- [x] Supabase Row Level Security enforced (verified: anonymous request sees 0 of 24 real rows)
- [x] DB schema + `price_history` migration applied (all tables exist)
- [x] `PLAID_ENV=production` set in Railway (real banks link)
- [x] Plaid credentials set (client ID + rotated secret)
- [x] Anthropic API key set in Railway
- [x] Sentry error monitoring active (DSN set, error handler wired)
- [x] PII logging stripped from Plaid endpoint (counts only, never merchant names/amounts)
- [x] Secrets rotated — GitHub PAT, Vercel token, Plaid secret
- [x] Vercel env vars set (SUPABASE_URL, ANON_KEY, API_URL, DEMO_MODE=false)
- [x] API auth — all routes behind `requireAuth`
- [x] Rate limiting added (300 req/15min on /api, 30 req/hr on /api/alternatives)
- [x] CORS locked to allowlist (Vercel domains + localhost + CORS_ORIGINS)
- [x] Sandbox-token route mounted only outside production

## 🔴 Blocking — before real users
- [ ] Railway connected to GitHub (Settings → Source → PinakShome/subfinance, root `server`) so pushes auto-deploy the new backend
- [ ] Verify latest Vercel deploy is `Ready` (bakes in EXPO_PUBLIC_* env vars)
- [ ] End-to-end smoke test: sign up → confirm email → link real bank → subscriptions detected

## 🟡 Recommended before scaling
- [ ] Supabase daily backups enabled (Database → Backups; plan-dependent)
- [ ] Supabase reset-password email template configured
- [ ] Confirm rate-limit headers live after deploy (`RateLimit-Policy: 30;w=3600` on /api/alternatives)

## 🟢 Optional / later
- [ ] Fine-tune subscription detection (ambiguous merchants, variable amounts)
- [ ] Remove/guard the still-mounted `/api/gmail` route (auth-gated, OAuth unconfigured)
- [ ] Native store builds (iOS/Android only): fill app.json/eas.json placeholders, then `eas build`

## Environment Variables
- App (Vercel): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_DEMO_MODE`
- API (Railway): see `server/.env.example` (Supabase service role, Plaid, Anthropic, PLAID_ENV, optional SENTRY_DSN, CORS_ORIGINS)

## EAS Build Commands (native only)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --profile production --platform all
eas submit --profile production --platform all
```
