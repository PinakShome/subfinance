# SubFinance

Smart subscription intelligence — track, analyze, and optimize all your subscriptions.

A premium subscription tracker built with React Native (Expo) for **iOS**, plus a Node/Express API.

## Stack

- **App:** React Native + Expo 54 (iOS)
- **Backend:** Node + Express (`server/`)
- **Auth & DB:** Supabase (Postgres + RLS)
- **Bank import:** Plaid (Transactions)
- **AI suggestions:** Anthropic API
- **Error monitoring:** Sentry (backend)
- **Builds:** EAS · **API hosting:** Railway
- **Static pages:** Vercel serves the privacy policy + password-reset page (`public/`)

## Layout

```
.            Expo iOS app (App.tsx, src/, app.json, eas.json)
public/      Static web pages: privacy-policy.html, reset-password.html
server/      Express API (Plaid, Gmail, AI alternatives, cron)
supabase/    SQL migrations (schema + RLS policies)
```

## Local development

```bash
# iOS app (requires Xcode + a simulator)
npm install
npm run ios

# API
cd server
npm install
cp .env.example .env   # fill in credentials
npm run dev            # http://localhost:3001
```

## Environment

- App config lives in `eas.json` build profiles (`EXPO_PUBLIC_*`) and `.env` for local Metro.
- API config: copy `server/.env.example` → `server/.env` (Supabase service role,
  Plaid, Anthropic, optional Sentry DSN, optional CORS origins).

`.env` files are gitignored — never commit secrets.

## Builds & deploys

- **iOS → EAS:** `eas build --profile production --platform ios`, then `eas submit --profile production --platform ios`.
- **API → Railway:** root directory `server`, build `npm run build`, start `npm start`.
- **Static pages → Vercel:** serves `public/` (privacy policy + password-reset page).
