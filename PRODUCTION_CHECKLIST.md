# SubFinance Production Checklist

## Before First Release

### Supabase
- [ ] Enable Row Level Security on all tables (subscriptions, categories, notification_prefs, price_history)
- [ ] Set up Supabase Auth email templates (confirm email, reset password)
- [ ] Enable Supabase realtime for subscriptions table
- [ ] Set up database backups (daily)
- [ ] Run price_history migration: `supabase/migrations/add_price_history.sql`

### EAS / App Store
- [ ] Run `eas build:configure` and replace `your-eas-project-id` in app.json
- [ ] Create app icons (1024x1024) for iOS, Android adaptive icon
- [ ] Create splash screen (dark bg #080d14 with SubFinance logo)
- [ ] Set Apple Developer Team ID in eas.json
- [ ] Create App Store Connect listing (screenshots, description, keywords)
- [ ] Create Google Play listing

### Backend (Server)
- [ ] Deploy server to a production host (Railway, Render, Fly.io, or AWS)
- [ ] Set all env vars in production (see server/.env.example)
- [ ] Switch PLAID_ENV from `sandbox` to `production`
- [ ] Set up HTTPS (SSL certificate)
- [ ] Add rate limiting (express-rate-limit)

### Security
- [ ] Replace anon Supabase key references in client with proper RLS policies
- [ ] Rotate any test API keys used during development
- [ ] Add Sentry or similar for error tracking

### Testing
- [ ] Test auth flow on physical iOS device
- [ ] Test auth flow on physical Android device
- [ ] Test Plaid bank import in production mode
- [ ] Test push notifications on physical devices
- [ ] Load test with 50+ subscriptions

## Environment Variables Required
See `server/.env.example` for the complete list.

## EAS Build Commands
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure project
eas build:configure

# Build for internal testing
eas build --profile preview --platform all

# Build for production
eas build --profile production --platform all

# Submit to stores
eas submit --profile production --platform all
```
