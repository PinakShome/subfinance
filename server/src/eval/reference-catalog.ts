/**
 * Reference catalogue — the universe of trackable subscription services, grouped
 * by category. Built from a broad web survey (Sep 2026). This is the master list
 * the alternatives system iterates over: build:catalog / the flywheel generate
 * cheaper-alternative suggestions for each service here.
 *
 * `approx_monthly` is an approximate US price in USD/month as of Sep 2026 (0 =
 * free / free tier; omitted = usage-based, seasonal, or highly variable — e.g.
 * AWS, carriers, warehouse clubs billed yearly). Prices drift; the flywheel
 * re-verifies them. Names are canonical; catalogue keys are derived via
 * normalizeKey (name-based), so this list also drives alias/dedupe decisions.
 */
export interface RefService { name: string; approx_monthly?: number; }
export interface RefCategory { category: string; services: RefService[]; }

export const REFERENCE_CATALOG: RefCategory[] = [
  { category: 'Streaming Video', services: [
    { name: 'Netflix', approx_monthly: 19.99 }, { name: 'Disney+', approx_monthly: 9.99 },
    { name: 'Hulu', approx_monthly: 9.99 }, { name: 'Max', approx_monthly: 16.99 },
    { name: 'Amazon Prime Video', approx_monthly: 8.99 }, { name: 'Apple TV+', approx_monthly: 9.99 },
    { name: 'Peacock', approx_monthly: 10.99 }, { name: 'Paramount+', approx_monthly: 8.99 },
    { name: 'Starz', approx_monthly: 10.99 }, { name: 'AMC+', approx_monthly: 8.99 },
    { name: 'BritBox', approx_monthly: 8.99 }, { name: 'Crunchyroll', approx_monthly: 7.99 },
    { name: 'Shudder', approx_monthly: 6.99 }, { name: 'MUBI', approx_monthly: 14.99 },
    { name: 'Discovery+', approx_monthly: 8.99 }, { name: 'Tubi', approx_monthly: 0 },
    { name: 'Pluto TV', approx_monthly: 0 }, { name: 'The Roku Channel', approx_monthly: 0 },
  ]},
  { category: 'Live TV Streaming', services: [
    { name: 'YouTube TV', approx_monthly: 82.99 }, { name: 'Hulu + Live TV', approx_monthly: 82.99 },
    { name: 'Sling TV', approx_monthly: 45.99 }, { name: 'Fubo', approx_monthly: 84.99 },
    { name: 'DirecTV Stream', approx_monthly: 86.99 }, { name: 'Philo', approx_monthly: 28 },
    { name: 'Frndly TV', approx_monthly: 8.99 },
  ]},
  { category: 'Sports Streaming', services: [
    { name: 'ESPN', approx_monthly: 29.99 }, { name: 'ESPN+', approx_monthly: 11.99 },
    { name: 'DAZN', approx_monthly: 29.99 }, { name: 'NBA League Pass', approx_monthly: 16.99 },
    { name: 'MLB.TV', approx_monthly: 29.99 }, { name: 'NFL+', approx_monthly: 6.99 },
    { name: 'F1 TV', approx_monthly: 12.99 }, { name: 'UFC Fight Pass', approx_monthly: 9.99 },
  ]},
  { category: 'Music Streaming', services: [
    { name: 'Spotify', approx_monthly: 12.99 }, { name: 'Apple Music', approx_monthly: 10.99 },
    { name: 'YouTube Music', approx_monthly: 11.99 }, { name: 'Amazon Music Unlimited', approx_monthly: 11.99 },
    { name: 'Tidal', approx_monthly: 11.99 }, { name: 'Deezer', approx_monthly: 11.99 },
    { name: 'Pandora', approx_monthly: 11.99 }, { name: 'SoundCloud Go+', approx_monthly: 9.99 },
    { name: 'Qobuz', approx_monthly: 12.99 }, { name: 'iHeartRadio All Access', approx_monthly: 10.99 },
    { name: 'SiriusXM', approx_monthly: 9.99 },
  ]},
  { category: 'Books & Audiobooks', services: [
    { name: 'Audible', approx_monthly: 14.95 }, { name: 'Kindle Unlimited', approx_monthly: 11.99 },
    { name: 'Everand', approx_monthly: 11.99 }, { name: 'Libro.fm', approx_monthly: 14.99 },
    { name: 'Kobo Plus', approx_monthly: 9.99 }, { name: 'Storytel', approx_monthly: 12.99 },
    { name: 'Blinkist', approx_monthly: 15.99 },
  ]},
  { category: 'Gaming', services: [
    { name: 'Xbox Game Pass Ultimate', approx_monthly: 19.99 }, { name: 'PC Game Pass', approx_monthly: 13.99 },
    { name: 'PlayStation Plus', approx_monthly: 9.99 }, { name: 'Nintendo Switch Online', approx_monthly: 3.99 },
    { name: 'GeForce Now', approx_monthly: 9.99 }, { name: 'Apple Arcade', approx_monthly: 6.99 },
    { name: 'EA Play', approx_monthly: 5.99 }, { name: 'Ubisoft+', approx_monthly: 17.99 },
    { name: 'Amazon Luna+', approx_monthly: 9.99 }, { name: 'Google Play Pass', approx_monthly: 4.99 },
    { name: 'Humble Choice', approx_monthly: 11.99 },
  ]},
  { category: 'Cloud Storage', services: [
    { name: 'Google One', approx_monthly: 1.99 }, { name: 'iCloud+', approx_monthly: 9.99 },
    { name: 'Dropbox', approx_monthly: 11.99 }, { name: 'Microsoft OneDrive', approx_monthly: 1.99 },
    { name: 'Box', approx_monthly: 14 }, { name: 'pCloud', approx_monthly: 4.99 },
    { name: 'Proton Drive', approx_monthly: 9.99 }, { name: 'Backblaze', approx_monthly: 9 },
    { name: 'Sync.com', approx_monthly: 8 }, { name: 'Mega', approx_monthly: 0 },
    { name: 'IDrive', approx_monthly: 9.95 },
  ]},
  { category: 'AI Tools', services: [
    { name: 'ChatGPT Plus', approx_monthly: 20 }, { name: 'Claude Pro', approx_monthly: 20 },
    { name: 'Google Gemini', approx_monthly: 19.99 }, { name: 'Perplexity Pro', approx_monthly: 20 },
    { name: 'Microsoft Copilot Pro', approx_monthly: 20 }, { name: 'SuperGrok', approx_monthly: 30 },
    { name: 'Midjourney', approx_monthly: 10 }, { name: 'Runway', approx_monthly: 15 },
    { name: 'ElevenLabs', approx_monthly: 5 }, { name: 'Suno', approx_monthly: 10 },
  ]},
  { category: 'Productivity & Office', services: [
    { name: 'Microsoft 365', approx_monthly: 9.99 }, { name: 'Google Workspace', approx_monthly: 7 },
    { name: 'Notion', approx_monthly: 10 }, { name: 'Evernote', approx_monthly: 14.99 },
    { name: 'Todoist', approx_monthly: 5 }, { name: 'Trello', approx_monthly: 5 },
    { name: 'Asana', approx_monthly: 10.99 }, { name: 'monday.com', approx_monthly: 12 },
    { name: 'ClickUp', approx_monthly: 7 }, { name: 'Airtable', approx_monthly: 20 },
    { name: 'Coda', approx_monthly: 10 },
  ]},
  { category: 'Communication', services: [
    { name: 'Slack', approx_monthly: 8.75 }, { name: 'Zoom', approx_monthly: 14.99 },
    { name: 'Webex', approx_monthly: 14.50 }, { name: 'Loom', approx_monthly: 12.50 },
    { name: 'Calendly', approx_monthly: 10 },
  ]},
  { category: 'Developer & Cloud', services: [
    { name: 'GitHub Copilot', approx_monthly: 10 }, { name: 'GitHub Pro', approx_monthly: 4 },
    { name: 'Vercel Pro', approx_monthly: 20 }, { name: 'Netlify', approx_monthly: 19 },
    { name: 'AWS' }, { name: 'Google Cloud' }, { name: 'Microsoft Azure' },
    { name: 'DigitalOcean', approx_monthly: 4 }, { name: 'Cloudflare', approx_monthly: 20 },
    { name: 'Supabase', approx_monthly: 25 }, { name: 'Railway', approx_monthly: 5 },
    { name: 'Render', approx_monthly: 7 }, { name: 'JetBrains', approx_monthly: 28.90 },
    { name: 'Linear', approx_monthly: 12 },
  ]},
  { category: 'Design & Creative', services: [
    { name: 'Adobe Creative Cloud', approx_monthly: 59.99 }, { name: 'Canva', approx_monthly: 15 },
    { name: 'Figma', approx_monthly: 12 }, { name: 'Sketch', approx_monthly: 12 },
    { name: 'Framer', approx_monthly: 5 }, { name: 'Capture One', approx_monthly: 24 },
    { name: 'CapCut Pro', approx_monthly: 9.99 },
  ]},
  { category: 'Photography', services: [
    { name: 'Adobe Lightroom', approx_monthly: 9.99 }, { name: 'VSCO', approx_monthly: 2.5 },
    { name: 'Skylum Luminar', approx_monthly: 9.95 },
  ]},
  { category: 'Website & eCommerce', services: [
    { name: 'Squarespace', approx_monthly: 16 }, { name: 'Wix', approx_monthly: 17 },
    { name: 'Shopify', approx_monthly: 29 }, { name: 'WordPress.com', approx_monthly: 4 },
    { name: 'Webflow', approx_monthly: 14 }, { name: 'Weebly', approx_monthly: 10 },
    { name: 'BigCommerce', approx_monthly: 29 }, { name: 'Ghost', approx_monthly: 9 },
  ]},
  { category: 'Security & Privacy', services: [
    { name: 'NordVPN', approx_monthly: 12.99 }, { name: 'ExpressVPN', approx_monthly: 12.95 },
    { name: 'Surfshark', approx_monthly: 15.45 }, { name: 'Proton VPN', approx_monthly: 9.99 },
    { name: 'Mullvad', approx_monthly: 5 }, { name: '1Password', approx_monthly: 2.99 },
    { name: 'Bitwarden', approx_monthly: 0 }, { name: 'Dashlane', approx_monthly: 4.99 },
    { name: 'NordPass', approx_monthly: 2.99 }, { name: 'Norton 360', approx_monthly: 9.99 },
    { name: 'McAfee', approx_monthly: 9.99 }, { name: 'Malwarebytes', approx_monthly: 3.33 },
  ]},
  { category: 'Fitness', services: [
    { name: 'Peloton', approx_monthly: 12.99 }, { name: 'Apple Fitness+', approx_monthly: 9.99 },
    { name: 'Strava', approx_monthly: 11.99 }, { name: 'WHOOP', approx_monthly: 30 },
    { name: 'Fitbit Premium', approx_monthly: 9.99 }, { name: 'MyFitnessPal', approx_monthly: 19.99 },
    { name: 'Nike Training Club', approx_monthly: 0 }, { name: 'FitOn', approx_monthly: 0 },
    { name: 'Centr', approx_monthly: 29.99 }, { name: 'Freeletics', approx_monthly: 12.99 },
    { name: 'Alo Moves', approx_monthly: 12.99 }, { name: 'ClassPass' },
  ]},
  { category: 'Mental Health & Meditation', services: [
    { name: 'Calm', approx_monthly: 14.99 }, { name: 'Headspace', approx_monthly: 12.99 },
    { name: 'BetterHelp', approx_monthly: 260 }, { name: 'Talkspace' },
    { name: 'Insight Timer', approx_monthly: 9.99 }, { name: 'Balance', approx_monthly: 11.99 },
    { name: 'Ten Percent Happier', approx_monthly: 14.99 },
  ]},
  { category: 'Health & Nutrition', services: [
    { name: 'Noom', approx_monthly: 70 }, { name: 'WeightWatchers', approx_monthly: 23 },
    { name: 'Cronometer', approx_monthly: 8.99 }, { name: 'Zoe', approx_monthly: 30 },
    { name: 'Hims', approx_monthly: 20 }, { name: 'Hers', approx_monthly: 20 },
  ]},
  { category: 'Education & Learning', services: [
    { name: 'Coursera Plus', approx_monthly: 59 }, { name: 'MasterClass', approx_monthly: 15 },
    { name: 'Skillshare', approx_monthly: 14 }, { name: 'Udemy', approx_monthly: 20 },
    { name: 'LinkedIn Learning', approx_monthly: 39.99 }, { name: 'Brilliant', approx_monthly: 24.99 },
    { name: 'DataCamp', approx_monthly: 25 }, { name: 'Codecademy', approx_monthly: 17.99 },
    { name: 'Pluralsight', approx_monthly: 29 }, { name: 'Khan Academy', approx_monthly: 0 },
  ]},
  { category: 'Language Learning', services: [
    { name: 'Duolingo', approx_monthly: 12.99 }, { name: 'Babbel', approx_monthly: 13.95 },
    { name: 'Rosetta Stone', approx_monthly: 11.99 }, { name: 'Busuu', approx_monthly: 13.98 },
    { name: 'Pimsleur', approx_monthly: 19.95 }, { name: 'Memrise', approx_monthly: 8.49 },
  ]},
  { category: 'Writing & Utilities', services: [
    { name: 'Grammarly', approx_monthly: 12 }, { name: 'ProWritingAid', approx_monthly: 10 },
    { name: 'QuillBot', approx_monthly: 4.17 }, { name: 'LanguageTool', approx_monthly: 4.99 },
    { name: 'Otter.ai', approx_monthly: 16.99 },
  ]},
  { category: 'News & Magazines', services: [
    { name: 'The New York Times', approx_monthly: 25 }, { name: 'The Wall Street Journal', approx_monthly: 38.99 },
    { name: 'The Washington Post', approx_monthly: 12 }, { name: 'The Economist', approx_monthly: 24.90 },
    { name: 'Bloomberg', approx_monthly: 34.99 }, { name: 'Financial Times', approx_monthly: 44 },
    { name: 'The Athletic', approx_monthly: 7.99 }, { name: 'Apple News+', approx_monthly: 12.99 },
    { name: 'Medium', approx_monthly: 5 }, { name: 'Reuters', approx_monthly: 34.99 },
  ]},
  { category: 'Food & Meal Delivery', services: [
    { name: 'HelloFresh', approx_monthly: 60 }, { name: 'Blue Apron', approx_monthly: 60 },
    { name: 'Home Chef', approx_monthly: 60 }, { name: 'Factor', approx_monthly: 60 },
    { name: 'EveryPlate', approx_monthly: 40 }, { name: 'DoorDash DashPass', approx_monthly: 9.99 },
    { name: 'Uber One', approx_monthly: 9.99 }, { name: 'Instacart+', approx_monthly: 9.99 },
    { name: 'Grubhub+', approx_monthly: 9.99 }, { name: 'Thrive Market', approx_monthly: 12 },
  ]},
  { category: 'Retail & Shopping', services: [
    { name: 'Amazon Prime', approx_monthly: 14.99 }, { name: 'Costco' }, { name: "Sam's Club" },
    { name: 'Walmart+', approx_monthly: 12.95 }, { name: 'Target Circle 360', approx_monthly: 10.99 },
    { name: "BJ's Wholesale" }, { name: 'REI Co-op' }, { name: 'Chewy Autoship' },
  ]},
  { category: 'Dating', services: [
    { name: 'Tinder', approx_monthly: 29.99 }, { name: 'Hinge', approx_monthly: 32.99 },
    { name: 'Bumble', approx_monthly: 39.99 }, { name: 'Match', approx_monthly: 26.99 },
    { name: 'OkCupid', approx_monthly: 34.99 }, { name: 'Grindr', approx_monthly: 19.99 },
    { name: 'Coffee Meets Bagel', approx_monthly: 34.99 }, { name: 'eharmony', approx_monthly: 65.90 },
  ]},
  { category: 'Social & Creator', services: [
    { name: 'YouTube Premium', approx_monthly: 13.99 }, { name: 'X Premium', approx_monthly: 8 },
    { name: 'LinkedIn Premium', approx_monthly: 29.99 }, { name: 'Snapchat+', approx_monthly: 3.99 },
    { name: 'Discord Nitro', approx_monthly: 9.99 }, { name: 'Reddit Premium', approx_monthly: 5.99 },
    { name: 'Telegram Premium', approx_monthly: 4.99 }, { name: 'Twitch Turbo', approx_monthly: 11.99 },
    { name: 'Patreon' }, { name: 'Substack' }, { name: 'OnlyFans' },
  ]},
  { category: 'Smart Home & Security', services: [
    { name: 'Ring Protect', approx_monthly: 4.99 }, { name: 'Nest Aware', approx_monthly: 8 },
    { name: 'Arlo Secure', approx_monthly: 7.99 }, { name: 'SimpliSafe', approx_monthly: 21.99 },
    { name: 'Wyze Cam Plus', approx_monthly: 3.99 }, { name: 'Blink Subscription', approx_monthly: 3 },
    { name: 'ADT' },
  ]},
  { category: 'Auto & Connected Car', services: [
    { name: 'SiriusXM', approx_monthly: 9.99 }, { name: 'Tesla Premium Connectivity', approx_monthly: 9.99 },
    { name: 'OnStar', approx_monthly: 24.99 }, { name: 'FordPass' }, { name: 'BMW ConnectedDrive' },
  ]},
  { category: 'Telecom & Mobile', services: [
    { name: 'Verizon' }, { name: 'AT&T' }, { name: 'T-Mobile' },
    { name: 'Mint Mobile', approx_monthly: 15 }, { name: 'Visible', approx_monthly: 25 },
    { name: 'Google Fi', approx_monthly: 20 }, { name: 'US Mobile' },
  ]},
  { category: 'Finance & Investing', services: [
    { name: 'YNAB', approx_monthly: 14.99 }, { name: 'Rocket Money', approx_monthly: 9 },
    { name: 'Copilot Money', approx_monthly: 13 }, { name: 'Monarch Money', approx_monthly: 14.99 },
    { name: 'Quicken Simplifi', approx_monthly: 5.99 }, { name: 'Experian', approx_monthly: 24.99 },
    { name: 'Robinhood Gold', approx_monthly: 5 }, { name: 'TradingView', approx_monthly: 14.95 },
    { name: 'Morningstar', approx_monthly: 34.99 }, { name: 'Seeking Alpha', approx_monthly: 29.99 },
    { name: 'The Motley Fool', approx_monthly: 39 }, { name: 'Yahoo Finance Plus', approx_monthly: 24.99 },
  ]},
  { category: 'Subscription Boxes', services: [
    { name: 'Ipsy', approx_monthly: 14 }, { name: 'FabFitFun', approx_monthly: 20 },
    { name: 'Birchbox', approx_monthly: 17 }, { name: 'BarkBox', approx_monthly: 23 },
    { name: 'Dollar Shave Club', approx_monthly: 10 }, { name: 'Stitch Fix' },
    { name: 'Book of the Month', approx_monthly: 19.99 }, { name: 'KiwiCo', approx_monthly: 24.95 },
  ]},

  // ─────────────────────────────────────────────────────────────────────────
  // EXPANSION (Sep 2026 web survey). Additions to existing categories reuse the
  // exact category name — REFERENCE_SERVICES flattens, so grouping is cosmetic
  // and keys stay name+category unique. Three new taxonomy categories at the end
  // (Business & Accounting, Faith & Spirituality, Music Creation) are mirrored
  // into public.categories by migration 008 so users can select them.
  // ─────────────────────────────────────────────────────────────────────────
  { category: 'AI Tools', services: [
    { name: 'Cursor', approx_monthly: 20 }, { name: 'Poe', approx_monthly: 19.99 },
    { name: 'DeepL Pro', approx_monthly: 8.74 }, { name: 'Descript', approx_monthly: 24 },
    { name: 'Gamma', approx_monthly: 10 },
  ]},
  { category: 'Productivity & Office', services: [
    { name: 'Obsidian', approx_monthly: 4 }, { name: 'Fantastical', approx_monthly: 4.75 },
    { name: 'Superhuman', approx_monthly: 30 }, { name: 'TickTick', approx_monthly: 3.99 },
    { name: 'Setapp', approx_monthly: 9.99 },
  ]},
  { category: 'Design & Creative', services: [
    { name: 'Envato Elements', approx_monthly: 16.50 }, { name: 'Shutterstock', approx_monthly: 29 },
    { name: 'Adobe Stock', approx_monthly: 29.99 }, { name: 'Storyblocks', approx_monthly: 21 },
    { name: 'Epidemic Sound', approx_monthly: 9.99 }, { name: 'Pixlr', approx_monthly: 4.90 },
  ]},
  { category: 'Communication', services: [
    { name: 'Proton Mail', approx_monthly: 4.99 }, { name: 'Fastmail', approx_monthly: 5 },
    { name: 'HEY', approx_monthly: 8.25 },
  ]},
  { category: 'Website & eCommerce', services: [
    { name: 'Mailchimp', approx_monthly: 13 }, { name: 'Kit', approx_monthly: 29 },
    { name: 'MailerLite', approx_monthly: 15 }, { name: 'Constant Contact', approx_monthly: 12 },
    { name: 'Hostinger', approx_monthly: 2.99 }, { name: 'Bluehost', approx_monthly: 11.99 },
  ]},
  { category: 'Education & Learning', services: [
    { name: 'ABCmouse', approx_monthly: 14.99 }, { name: 'Epic!', approx_monthly: 13.99 },
    { name: 'Khan Academy Kids', approx_monthly: 0 }, { name: 'IXL', approx_monthly: 19.95 },
    { name: 'Outschool' }, { name: 'Homer', approx_monthly: 9.99 },
  ]},
  { category: 'Food & Meal Delivery', services: [
    { name: 'NYT Cooking', approx_monthly: 4.99 }, { name: 'Mealime', approx_monthly: 5.99 },
    { name: 'Yummly', approx_monthly: 4.99 },
  ]},
  { category: 'Writing & Utilities', services: [
    { name: 'Carrot Weather', approx_monthly: 4.99 }, { name: 'Weather Underground', approx_monthly: 1.99 },
    { name: 'AccuWeather', approx_monthly: 0 },
  ]},
  { category: 'Telecom & Mobile', services: [
    { name: 'OpenPhone', approx_monthly: 15 }, { name: 'Grasshopper', approx_monthly: 28 },
  ]},
  { category: 'Fitness', services: [
    { name: 'Planet Fitness', approx_monthly: 15 }, { name: 'Ladder', approx_monthly: 29 },
    { name: 'Future', approx_monthly: 199 }, { name: 'Fitbod', approx_monthly: 12.99 },
  ]},
  { category: 'Health & Nutrition', services: [
    { name: 'MacroFactor', approx_monthly: 11.99 }, { name: 'Lose It!', approx_monthly: 3.33 },
  ]},
  { category: 'Photography', services: [
    { name: 'Darkroom', approx_monthly: 4.99 }, { name: 'Photoroom', approx_monthly: 9.99 },
  ]},
  { category: 'Developer & Cloud', services: [
    { name: 'Replit', approx_monthly: 20 }, { name: 'Sentry', approx_monthly: 26 },
  ]},

  // ── New taxonomy categories ──
  { category: 'Business & Accounting', services: [
    { name: 'QuickBooks Online', approx_monthly: 38 }, { name: 'QuickBooks Solopreneur', approx_monthly: 20 },
    { name: 'FreshBooks', approx_monthly: 23 }, { name: 'Xero', approx_monthly: 25 },
    { name: 'Wave', approx_monthly: 0 }, { name: 'Zoho Books', approx_monthly: 15 },
    { name: 'Bonsai', approx_monthly: 25 }, { name: 'HoneyBook', approx_monthly: 19 },
  ]},
  { category: 'Faith & Spirituality', services: [
    { name: 'Hallow', approx_monthly: 10.99 }, { name: 'Pray.com', approx_monthly: 9.99 },
    { name: 'Abide', approx_monthly: 9.99 }, { name: 'Glorify', approx_monthly: 9.99 },
    { name: 'Dwell', approx_monthly: 8.99 }, { name: 'YouVersion Bible', approx_monthly: 0 },
  ]},
  { category: 'Music Creation', services: [
    { name: 'Splice', approx_monthly: 19.99 }, { name: 'LANDR', approx_monthly: 20 },
    { name: 'Output Arcade', approx_monthly: 10 }, { name: 'DistroKid', approx_monthly: 1.99 },
    { name: 'Loopcloud', approx_monthly: 7.99 },
  ]},

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPANSION WAVE A (Sep 2026 web survey) — deepening toward ~750 services.
  // Prices are approximate US USD/mo as of the survey; the flywheel re-verifies.
  // ═══════════════════════════════════════════════════════════════════════════
  { category: 'Streaming Video', services: [
    { name: 'Acorn TV', approx_monthly: 9.99 }, { name: 'CuriosityStream', approx_monthly: 4.99 },
    { name: 'Criterion Channel', approx_monthly: 10.99 }, { name: 'ALLBLK', approx_monthly: 6.99 },
    { name: 'Hallmark+', approx_monthly: 7.99 }, { name: 'Nebula', approx_monthly: 6 },
    { name: 'Dropout', approx_monthly: 6.99 }, { name: 'MHz Choice', approx_monthly: 7.99 },
    { name: 'Sundance Now', approx_monthly: 6.99 }, { name: 'BET+', approx_monthly: 9.99 },
    { name: 'Crackle', approx_monthly: 0 }, { name: 'Hi-YAH!', approx_monthly: 3.99 },
    { name: 'Crave', approx_monthly: 9.99 }, { name: 'Stan', approx_monthly: 12 },
    { name: 'BINGE', approx_monthly: 10 }, { name: 'Now TV', approx_monthly: 10 },
    { name: 'ITVX Premium', approx_monthly: 5.99 }, { name: 'hayu', approx_monthly: 5.99 },
    { name: 'iQIYI', approx_monthly: 6.99 }, { name: 'Viu', approx_monthly: 5.99 },
    { name: 'JioHotstar', approx_monthly: 3 }, { name: 'ZEE5', approx_monthly: 5 },
  ]},
  { category: 'Sports Streaming', services: [
    { name: 'FloSports', approx_monthly: 12.99 }, { name: 'beIN Sports Connect', approx_monthly: 7.99 },
    { name: 'Willow TV', approx_monthly: 9.99 }, { name: 'Fanatiz', approx_monthly: 10 },
  ]},
  { category: 'Music Streaming', services: [
    { name: 'Napster', approx_monthly: 10.99 }, { name: 'Audiomack', approx_monthly: 4.99 },
    { name: 'LiveOne', approx_monthly: 8.99 },
  ]},
  { category: 'AI Tools', services: [
    { name: 'Character.AI', approx_monthly: 9.99 }, { name: 'Jasper', approx_monthly: 49 },
    { name: 'Copy.ai', approx_monthly: 49 }, { name: 'Writesonic', approx_monthly: 20 },
    { name: 'Sudowrite', approx_monthly: 19 }, { name: 'Leonardo.Ai', approx_monthly: 12 },
    { name: 'Ideogram', approx_monthly: 8 }, { name: 'HeyGen', approx_monthly: 24 },
    { name: 'Synthesia', approx_monthly: 29 }, { name: 'Kagi', approx_monthly: 10 },
    { name: 'Mistral Le Chat', approx_monthly: 15 }, { name: 'You.com', approx_monthly: 15 },
    { name: 'NovelAI', approx_monthly: 10 }, { name: 'Luma Dream Machine', approx_monthly: 9.99 },
    { name: 'Pika', approx_monthly: 10 }, { name: 'Krea', approx_monthly: 10 },
  ]},
  { category: 'Productivity & Office', services: [
    { name: 'Craft', approx_monthly: 5 }, { name: 'Notability', approx_monthly: 1.25 },
    { name: 'Miro', approx_monthly: 8 }, { name: 'Lucidchart', approx_monthly: 9 },
    { name: 'Roam Research', approx_monthly: 15 }, { name: 'Basecamp', approx_monthly: 15 },
    { name: 'Smartsheet', approx_monthly: 12 }, { name: 'Reclaim', approx_monthly: 8 },
    { name: 'Sunsama', approx_monthly: 20 }, { name: 'Motion', approx_monthly: 19 },
    { name: 'Milanote', approx_monthly: 12.50 }, { name: 'Whimsical', approx_monthly: 10 },
    { name: 'Things', approx_monthly: 0 }, { name: 'GoodNotes', approx_monthly: 0 },
  ]},
  { category: 'Business & Accounting', services: [
    { name: 'Gusto', approx_monthly: 60 }, { name: 'Rippling', approx_monthly: 8 },
    { name: 'DocuSign', approx_monthly: 45 }, { name: 'PandaDoc', approx_monthly: 35 },
    { name: 'Salesforce', approx_monthly: 25 }, { name: 'HubSpot', approx_monthly: 20 },
    { name: 'Pipedrive', approx_monthly: 24 }, { name: 'Zoho CRM', approx_monthly: 20 },
    { name: 'Bill.com', approx_monthly: 45 }, { name: 'Sage Accounting', approx_monthly: 10 },
    { name: 'TurboTax' }, { name: 'H&R Block' },
  ]},
  { category: 'Finance & Investing', services: [
    { name: 'PocketGuard', approx_monthly: 12.99 }, { name: 'Tiller', approx_monthly: 6.58 },
    { name: 'Lunch Money', approx_monthly: 10 }, { name: 'Origin', approx_monthly: 12.99 },
    { name: 'Kubera', approx_monthly: 15 },
  ]},
  { category: 'Health & Nutrition', services: [
    { name: 'Ro', approx_monthly: 149 }, { name: 'YAZIO', approx_monthly: 6.99 },
    { name: 'Lifesum', approx_monthly: 7.49 }, { name: 'Simple', approx_monthly: 15 },
    { name: 'Fastic', approx_monthly: 9 }, { name: 'Flo', approx_monthly: 3.33 },
    { name: 'Clue', approx_monthly: 9.99 }, { name: 'Natural Cycles', approx_monthly: 21.99 },
  ]},
  { category: 'Mental Health & Meditation', services: [
    { name: 'Cerebral', approx_monthly: 99 }, { name: 'Sanvello', approx_monthly: 8.99 },
    { name: 'Wysa', approx_monthly: 9.99 }, { name: 'Finch', approx_monthly: 9.99 },
    { name: 'Rootd', approx_monthly: 6.99 }, { name: 'Waking Up', approx_monthly: 14.99 },
    { name: 'Sleep Cycle', approx_monthly: 3.33 }, { name: 'BetterSleep', approx_monthly: 9.99 },
  ]},
  { category: 'Fitness', services: [
    { name: 'Sweat', approx_monthly: 20 }, { name: 'Zwift', approx_monthly: 19.99 },
    { name: 'TrainerRoad', approx_monthly: 21.99 }, { name: 'iFit', approx_monthly: 15 },
    { name: 'Runna', approx_monthly: 18 }, { name: 'Hevy', approx_monthly: 4 },
    { name: 'JEFIT', approx_monthly: 6.99 }, { name: 'Tonal', approx_monthly: 59.95 },
  ]},
  { category: 'Education & Learning', services: [
    { name: 'Domestika', approx_monthly: 13.79 }, { name: 'CreativeLive', approx_monthly: 39 },
    { name: 'edX', approx_monthly: 49 }, { name: 'Udacity', approx_monthly: 249 },
    { name: 'Frontend Masters', approx_monthly: 39 }, { name: 'Chegg', approx_monthly: 15.95 },
    { name: 'Course Hero', approx_monthly: 9.95 }, { name: 'Quizlet', approx_monthly: 7.99 },
    { name: 'Treehouse', approx_monthly: 25 }, { name: 'Wondrium', approx_monthly: 20 },
    { name: 'Magoosh', approx_monthly: 15 }, { name: 'Wolfram Alpha Pro', approx_monthly: 7.25 },
    { name: 'Numerade', approx_monthly: 9.99 },
  ]},
  { category: 'Language Learning', services: [
    { name: 'italki', approx_monthly: 5.99 }, { name: 'Mango Languages', approx_monthly: 7.99 },
    { name: 'LingQ', approx_monthly: 12.99 }, { name: 'Drops', approx_monthly: 9.99 },
    { name: 'Speak', approx_monthly: 20 }, { name: 'Preply' },
  ]},
  { category: 'Design & Creative', services: [
    { name: 'Affinity', approx_monthly: 0 }, { name: 'Final Cut Pro', approx_monthly: 12.99 },
    { name: 'Filmora', approx_monthly: 19.99 }, { name: 'Camtasia', approx_monthly: 15 },
    { name: 'Artlist', approx_monthly: 9.99 }, { name: 'Motion Array', approx_monthly: 24.99 },
    { name: 'Soundstripe', approx_monthly: 19.92 }, { name: 'Procreate', approx_monthly: 0 },
  ]},
  { category: 'Music Creation', services: [
    { name: 'Soundtrap', approx_monthly: 9.99 }, { name: 'Serato', approx_monthly: 9.99 },
    { name: 'rekordbox', approx_monthly: 9.99 }, { name: 'Ableton Live', approx_monthly: 0 },
    { name: 'FL Studio', approx_monthly: 0 },
  ]},
  { category: 'Photography', services: [
    { name: 'Afterlight', approx_monthly: 2.99 }, { name: 'Halide', approx_monthly: 2.99 },
    { name: 'Photomator', approx_monthly: 4.99 }, { name: 'Lens Distortions', approx_monthly: 6.99 },
    { name: 'ON1 Photo RAW', approx_monthly: 0 }, { name: 'Topaz Photo AI', approx_monthly: 0 },
  ]},
  { category: 'News & Magazines', services: [
    { name: 'The Atlantic', approx_monthly: 7.5 }, { name: 'The New Yorker', approx_monthly: 8.33 },
    { name: 'Wired', approx_monthly: 5 }, { name: 'National Geographic', approx_monthly: 3.33 },
    { name: 'The Information', approx_monthly: 42.25 }, { name: 'Readwise Reader', approx_monthly: 9.99 },
    { name: 'Feedly', approx_monthly: 6.99 }, { name: 'Inoreader', approx_monthly: 5 },
    { name: 'Ground News', approx_monthly: 9.99 }, { name: 'Readly', approx_monthly: 12.99 },
    { name: 'PressReader', approx_monthly: 29.99 }, { name: 'Shortform', approx_monthly: 12.99 },
  ]},
  { category: 'Security & Privacy', services: [
    { name: 'CyberGhost', approx_monthly: 2.19 }, { name: 'Private Internet Access', approx_monthly: 2.19 },
    { name: 'IPVanish', approx_monthly: 2.19 }, { name: 'Windscribe', approx_monthly: 5.75 },
    { name: 'Keeper', approx_monthly: 2.92 }, { name: 'LastPass', approx_monthly: 3 },
    { name: 'Bitdefender', approx_monthly: 5.42 }, { name: 'ESET', approx_monthly: 5 },
    { name: 'Aura', approx_monthly: 12 }, { name: 'Incogni', approx_monthly: 7.99 },
    { name: 'DeleteMe', approx_monthly: 10.75 }, { name: 'Kaspersky', approx_monthly: 4.99 },
  ]},
  { category: 'Travel & Loyalty', services: [
    { name: 'CLEAR+', approx_monthly: 18.25 }, { name: 'Priority Pass', approx_monthly: 39 },
    { name: 'TripIt Pro', approx_monthly: 4.08 }, { name: 'Going', approx_monthly: 4.08 },
    { name: 'Airalo' }, { name: 'Dollar Flight Club', approx_monthly: 6.99 },
    { name: 'Nomad eSIM' }, { name: 'AAA', approx_monthly: 5 },
  ]},
  { category: 'Pets', services: [
    { name: 'Rover' }, { name: 'Tractive', approx_monthly: 5 },
    { name: 'Fi', approx_monthly: 10 }, { name: 'Ollie', approx_monthly: 140 },
    { name: "The Farmer's Dog", approx_monthly: 200 }, { name: 'Nom Nom', approx_monthly: 150 },
    { name: 'Pawp', approx_monthly: 24 },
  ]},
];

/** Flat list with category attached — what the catalogue builders consume. */
export const REFERENCE_SERVICES: { name: string; category: string; approx_monthly?: number }[] =
  REFERENCE_CATALOG.flatMap((c) => c.services.map((s) => ({ ...s, category: c.category })));
