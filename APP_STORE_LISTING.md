# SubFinance — App Store Submission Pack

Everything needed to fill out App Store Connect for the first submission.
Copy/paste the fields below; the character counts are pre-checked against
Apple's limits. Based on the real feature set and `PRIVACY_POLICY.md`.

- **Bundle ID:** `com.subfinance.app`
- **Version (`app.json`):** `1.0.2`  ·  **Build:** `1`
- **Primary category:** Finance  ·  **Secondary (optional):** Productivity
- **Age rating:** 4+ (no objectionable content)
- **Price:** Free

> ✅ **Version aligned:** `app.json` and `package.json` are both `1.0.2`.

---

## 1. App metadata (App Store Connect → App Information / Version)

### App Name  _(max 30)_
```
SubFinance
```
(10 chars. Alternatively "SubFinance: Subscriptions" — 25 chars — for more search weight.)

### Subtitle  _(max 30)_
```
Track & cut subscription costs
```
(30 chars — fits exactly.)

### Promotional Text  _(max 170, editable without review)_
```
See every subscription in one place, get reminders before you're charged, and discover cheaper alternatives that could trim your monthly bill.
```
(142 chars.)

### Keywords  _(max 100, comma-separated, no spaces)_
```
tracker,budget,bills,renewal,reminder,expense,recurring,save,money,cancel,trial,spending,finance
```
(96 chars. Deliberately omits words already in the name/subtitle — "subscription", "track", "cut", "costs" — since Apple indexes those automatically.)

### Description  _(max 4000)_
```
SubFinance is the simplest way to see what you're really spending on subscriptions — and to spend less.

Most people underestimate their recurring bills by 2-3x. Streaming, music, cloud storage, software, gym, news, that free trial you forgot to cancel… it adds up quietly. SubFinance puts all of it on one screen so nothing slips through.

TRACK EVERYTHING IN ONE PLACE
• Add any subscription in seconds with smart autocomplete — start typing and pick from 750+ known services.
• Monthly, quarterly, annual, or custom billing cycles, all normalized so you can compare apples to apples.
• See your true monthly and yearly spend at a glance, broken down by category.

NEVER GET SURPRISED BY A CHARGE
• Renewal reminders before each bill, on your schedule (e.g. 3 days and 1 day before).
• Free-trial alerts so you can decide before the trial converts to a paid plan.
• A renewal calendar that shows exactly what's coming and when.

SPEND LESS, AUTOMATICALLY
• For services you track, SubFinance suggests cheaper alternatives — a lower-cost plan, a free tier, or a competing service — drawn from a hand-verified catalogue of 750+ services.
• Suggestions only ever show options that cost less than what you're actually paying.
• Price-hike alerts flag when a service you use raises its price.

BUILT TO LIVE ON YOUR PHONE
• Home Screen widget with your next renewals and monthly total.
• Light and dark mode, following your system setting.
• Export all your data to CSV any time.

PRIVATE BY DESIGN
• Your subscription data is yours. We never sell or rent personal information.
• Export or delete your account and all associated data whenever you want.

SubFinance is free to start. Take five minutes to add your subscriptions and most people find at least one they'd forgotten they were paying for.

Questions or feedback? Email support@subfinance.app
```
(~1,870 chars — well under 4000.)

### What's New (release notes for 1.0.2)  _(max 4000)_
```
Welcome to SubFinance! This is our first release.

• Track all your subscriptions in one place with smart autocomplete for 750+ services
• Renewal and free-trial reminders so you're never surprised by a charge
• Cheaper-alternative suggestions that only show options below what you already pay
• Renewal calendar, price-hike alerts, Home Screen widget, dark mode, and CSV export

Thanks for trying SubFinance. Email support@subfinance.app with any feedback.
```

### URLs
- **Support URL (required):** `https://subfinance.app/support` — ⚠️ must be live before submit. A simple page with a contact email satisfies this.
- **Marketing URL (optional):** `https://subfinance.app`
- **Privacy Policy URL (required):** `https://subfinance.app/privacy-policy` — the repo already has `public/privacy-policy.html`; host it at this path.

---

## 2. App Privacy ("nutrition label")  _(App Store Connect → App Privacy)_

Derived from `PRIVACY_POLICY.md`. Answer the questionnaire as follows.

**Does this app collect data?** → **Yes.**

**Is any collected data used to track the user?** (shared with data brokers / used for cross-app advertising) → **No.** SubFinance does not track users across apps or websites and does no advertising.

For each type below: **Linked to the user's identity = Yes** (everything ties to their account), **Used for tracking = No.**

| Data type | Collected? | Purpose(s) | Linked to identity |
|---|---|---|---|
| **Contact Info → Email Address** | Yes | App Functionality (account/auth), Customer Support | Yes |
| **User Content → Other (subscription names, costs, notes)** | Yes | App Functionality | Yes |
| **Identifiers → User ID** | Yes | App Functionality | Yes |
| **Identifiers → Device ID** | Yes | App Functionality (push notifications) | Yes |
| **Usage Data → Product Interaction** | Yes | Analytics, App Functionality | Yes |
| **Diagnostics → Crash Data** | Yes | App Functionality (via Sentry) | Yes |
| **Diagnostics → Performance Data** | Yes | App Functionality (via Sentry) | Yes |

Notes for the reviewer-facing questionnaire:
- **Name/profile name** is optional; if you prompt for it, add **Contact Info → Name** (App Functionality, linked, no tracking).
- **Password** is a credential, not a "collected data type" in Apple's taxonomy — do not list it.
- Third parties: **Supabase** (database + auth) and **Sentry** (crash/diagnostics). Both are processors, not data brokers.

> If analytics/crash reporting is **off by default** and opt-in, you may omit Usage Data / Diagnostics — but only if the app genuinely doesn't send them until the user opts in. Confirm the Sentry init path before claiming this.

---

## 3. App Review Information  _(App Store Connect → this version → App Review Information)_

### Sign-in required? → **Yes.** Provide the demo account below.

```
Username:  demo@subfinance.app
Password:  (set when you run the seed script — see section 4)
```

### Notes for the reviewer
```
SubFinance is a personal subscription tracker.

TO REVIEW:
1. Sign in with the demo account above. It is pre-loaded with ~8 sample
   subscriptions across several categories so every screen has content.
2. Home tab: shows total monthly/yearly spend and a list of subscriptions.
3. Tap any subscription to see details. Paid services show a "Cheaper
   alternatives" section suggesting lower-cost options; free services and
   the cheapest-in-class do not, by design.
4. Calendar tab: upcoming renewals.
5. Add (+): start typing a service name to see autocomplete from our
   750+ service catalogue.
6. Settings: toggle dark mode, manage renewal reminders, export data to CSV.

NOTES:
- "Cheaper alternatives" are informational suggestions only. The app does
  not process any payments, take commissions, or complete purchases — tapping
  an alternative opens its website in the browser. There are no in-app
  purchases or subscriptions sold through the app.
- Renewal reminders use local/push notifications; the reviewer can grant or
  deny the notification permission prompt without affecting the review flow.
- The Home Screen widget can be verified by long-pressing the Home Screen,
  tapping +, and adding SubFinance.
```

### Contact info
- First/Last name, phone, email of the account holder (the developer) — Apple requires a real contact.

---

## 4. Demo account for Guideline 2.1

Apple **requires a working demo account** for any app behind a login. A seed
script is provided so the account is real and populated:

**File:** `server/src/eval/seed-demo-account.ts`

Run it against the production backend (it creates one auth user + sample subs):

```bash
cd server && railway run --service jubilant-consideration -- \
  ts-node --transpileOnly src/eval/seed-demo-account.ts demo@subfinance.app 'CHOOSE-A-STRONG-PASSWORD'
```

- Pass the email and password as the two arguments (don't hard-code a password in the repo).
- The script is **idempotent**: re-running clears the demo user's existing subscriptions and reseeds, so the reviewer always sees a clean, full account.
- Put the same email/password into the App Review "Sign-in" fields above.

> This creates a real account in production Supabase. Run it yourself (or
> tell me to run it and I'll execute that one command) — I won't create the
> account without your go-ahead.

---

## 5. Screenshots

Required sizes for iPhone (upload at least one set; 6.7" is the key one):
- **6.7"** (iPhone 15/16/17 Pro Max) — **1290 × 2796** — required.
- **6.5"** (older Max) — 1242 × 2688 — optional but recommended.
- 5.5" is no longer required for new apps.

You have a screenshots folder at `~/Desktop/SubFinance-Screenshots`. Suggested
5-shot story (with a one-line caption overlay each):
1. Home / total spend — "Every subscription, one number."
2. Cheaper alternatives on a detail screen — "Pay less for what you already use."
3. Add with autocomplete — "Add anything in seconds."
4. Renewal calendar — "Never miss a renewal."
5. Widget on Home Screen — "Your next bills, at a glance."

Capture them in the simulator (6.7" device) in both the populated demo account
and dark mode for variety.

---

## 6. Pre-submit checklist

- [x] Align `package.json` version to `1.0.2`. _(done)_
- [ ] Host Support URL, Marketing URL, and Privacy Policy URL (all must resolve).
- [ ] `ITSAppUsesNonExemptEncryption: false` is already set in `app.json` ✓ (no export-compliance docs needed).
- [ ] Run the demo-account seed; put credentials in App Review info.
- [ ] Upload 6.7" screenshots.
- [ ] Confirm Sentry/analytics behavior matches the App Privacy answers.
- [ ] New bundle ID if 5.6 naming is a concern (see deploy Track C).
- [ ] `eas build -p ios` → `eas submit -p ios`.
```
