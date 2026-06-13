# SubFinance

Smart subscription intelligence — track, analyze, and optimize all your subscriptions.

A premium dark-fintech subscription tracker built with React Native (Expo) + a Node/Express API.

## Stack

- **App:** React Native + Expo 54 (iOS, Android, Web)
- **Backend:** Node + Express (`server/`)
- **Auth & DB:** Supabase (Postgres + RLS)
- **Bank import:** Plaid (Transactions)
- **AI suggestions:** Anthropic API
- **Error monitoring:** Sentry (backend)
- **Hosting:** Vercel (web) · Railway (API)

## Layout

```
.            Expo app (App.tsx, src/, app.json)
server/      Express API (Plaid, Gmail, AI alternatives, cron)
supabase/    SQL migrations (schema + RLS policies)
```

## Local development

```bash
# App (web)
npm install
npm run web            # http://localhost:8081

# API
cd server
npm install
cp .env.example .env   # fill in credentials
npm run dev            # http://localhost:3001
```

## Environment

- App config: copy `.env.example` → `.env` (Supabase URL/anon key, API URL).
- API config: copy `server/.env.example` → `server/.env` (Supabase service role,
  Plaid, Anthropic, optional Sentry DSN, optional CORS origins).

`.env` files are gitignored — never commit secrets.

## Deploys

- **Web → Vercel:** root directory `.`, build `npm run build`, output `dist`.
- **API → Railway:** root directory `server`, build `npm run build`, start `npm start`.
