/**
 * Zero-API catalogue seed. Loads a hand-curated dataset — researched and price-
 * verified via web search (Sep 2026) — straight into alternatives_catalogue.
 * Makes NO Anthropic API calls, so it costs nothing to run and gives the live
 * app an instant, exhaustive baseline covering the full reference catalogue
 * (server/src/eval/reference-catalog.ts). The nightly flywheel later re-verifies
 * prices with a single grounded call per stale entry.
 *
 * Every alternative is genuinely cheaper than or free vs the original; prices are
 * approximate USD/month as of Sep 2026 (0 = free / free tier). Alternative
 * entries are shared building blocks (dedup), composed per service below.
 *
 * Run from server/:  railway run --service jubilant-consideration npm run seed:catalog
 */
import 'dotenv/config';
import { supabase } from '../lib/supabase';
import { normalizeKey, reresolve } from '../lib/catalogue';
import { Alt } from '../lib/alternatives-gen';

const a = (name: string, monthly_price: number | null, website: string, description: string): Alt =>
  ({ name, monthly_price, website, currency: 'USD', description });

// ── Reusable alternative building blocks ────────────────────────────────────
const A = {
  // Streaming (video)
  tubi: a('Tubi', 0, 'https://tubitv.com', 'Free, ad-supported movies and TV; no originals.'),
  pluto: a('Pluto TV', 0, 'https://pluto.tv', 'Free live channels and on-demand; ad-supported.'),
  roku: a('The Roku Channel', 0, 'https://therokuchannel.roku.com', 'Free ad-supported movies, shows and live TV; no device needed.'),
  xumo: a('Xumo Play', 0, 'https://play.xumo.com', 'Free live + on-demand, ad-supported.'),
  plex: a('Plex', 0, 'https://www.plex.tv', 'Free ad-supported streaming plus your own media library.'),
  peacock: a('Peacock', 7.99, 'https://www.peacocktv.com', 'NBCUniversal shows, movies and live sport; cheapest tier has ads.'),
  paramount: a('Paramount+', 8.99, 'https://www.paramountplus.com', 'CBS/Paramount library and originals; ad tier is cheapest.'),
  appletv: a('Apple TV+', 9.99, 'https://tv.apple.com', 'High-budget originals only (no back-catalog) at a low price.'),
  crunchyroll: a('Crunchyroll', 7.99, 'https://www.crunchyroll.com', 'Huge anime catalog; narrower than general entertainment.'),
  hoopla: a('Hoopla', 0, 'https://www.hoopladigital.com', 'Free with a library card; monthly borrow limit.'),
  kanopy: a('Kanopy', 0, 'https://www.kanopy.com', 'Free films with a library or university card; monthly credits.'),
  antenna: a('Over-the-air antenna', 0, 'https://www.antennaweb.org', 'One-time ~$30 antenna: local ABC/CBS/NBC/Fox/PBS free for life.'),

  // Live TV / sports
  sling: a('Sling TV', 45.99, 'https://www.sling.com', 'Cheapest major live-TV bundle; fewer channels, no locals.'),
  slingfree: a('Sling Freestream', 0, 'https://www.sling.com/freestream', 'Free live + on-demand channels; no locals or live sports.'),
  philo: a('Philo', 28, 'https://www.philo.com', 'Cheap entertainment channels; no sports or locals.'),
  frndly: a('Frndly TV', 8.99, 'https://www.frndlytv.com', 'Very cheap live TV; family + lifestyle channels.'),
  espnplus: a('ESPN+', 11.99, 'https://plus.espn.com', 'Cheaper direct sports streaming; not all live games.'),
  slingsports: a('Sling Essentials', 19.99, 'https://www.sling.com', 'Cheapest way to get ESPN/ESPN2 each month.'),

  // Music
  spotifyFree: a('Spotify Free', 0, 'https://www.spotify.com', 'Same catalog, ad-supported, with mobile playback limits.'),
  appleMusic: a('Apple Music', 10.99, 'https://music.apple.com', 'Lossless + spatial audio included; no free tier.'),
  ytMusicFree: a('YouTube Music (Free)', 0, 'https://music.youtube.com', 'Free ad-supported music; screen-on required on mobile.'),
  amazonMusic: a('Amazon Music', 0, 'https://music.amazon.com', 'A large catalog is included free with Amazon Prime.'),
  pandora: a('Pandora', 0, 'https://www.pandora.com', 'Free personalized radio; limited on-demand control.'),
  deezerFree: a('Deezer (Free)', 0, 'https://www.deezer.com', 'Free ad-supported tier with a big catalog.'),
  soundcloud: a('SoundCloud', 0, 'https://soundcloud.com', 'Free tier; strong for indie/underground.'),
  iheart: a('iHeartRadio', 0, 'https://www.iheart.com', 'Free live radio, podcasts and playlists.'),
  tunein: a('TuneIn Radio', 0, 'https://tunein.com', 'Free live radio, news and sports streams.'),
  bandcamp: a('Bandcamp', 0, 'https://bandcamp.com', 'Free streaming; buy tracks to own, supports artists.'),

  // Books / audiobooks
  libby: a('Libby', 0, 'https://libbyapp.com', 'Free ebooks + audiobooks with a library card; may have holds.'),
  librivox: a('LibriVox', 0, 'https://librivox.org', 'Free public-domain audiobooks read by volunteers.'),
  everand: a('Everand', 11.99, 'https://www.everand.com', 'Cheaper monthly; audiobooks + ebooks + magazines.'),
  spotifyBooks: a('Spotify', 11.99, 'https://www.spotify.com', '15 hrs/mo of audiobooks included with Premium.'),
  playBooks: a('Google Play Books', 0, 'https://play.google.com/books', 'No subscription — buy only the titles you want.'),
  kindleUnlimited: a('Kindle Unlimited', 11.99, 'https://www.amazon.com/kindle-dbs/hz/subscribe/ku', 'Flat-fee ebook + some audiobook access.'),
  standardEbooks: a('Standard Ebooks', 0, 'https://standardebooks.org', 'Free, beautifully formatted public-domain ebooks.'),
  headway: a('Headway', 0, 'https://makeheadway.com', 'Cheap book-summaries app; generous free content.'),

  // Cloud storage
  googleOne: a('Google One', 9.99, 'https://one.google.com', 'Works across every platform; cheaper annually.'),
  icloud: a('iCloud+', 9.99, 'https://www.icloud.com', 'Cheap tiers if you live in the Apple ecosystem.'),
  pcloud: a('pCloud', 4.99, 'https://www.pcloud.com', 'Cheaper tiers plus a one-time lifetime option.'),
  protonDrive: a('Proton Drive', 9.99, 'https://proton.me/drive', 'End-to-end encrypted; privacy-first.'),
  sync: a('Sync.com', 8.00, 'https://www.sync.com', 'Zero-knowledge encrypted storage; cheap annually.'),
  onedrive: a('Microsoft OneDrive', 1.99, 'https://www.microsoft.com/microsoft-365/onedrive', '100GB for $1.99/mo, or 1TB bundled with Microsoft 365.'),
  mega: a('Mega', 0, 'https://mega.io', '20GB free, end-to-end encrypted.'),
  icedrive: a('Icedrive', 4.17, 'https://icedrive.net', 'Cheap encrypted storage; smaller ecosystem.'),
  backblaze: a('Backblaze', 9, 'https://www.backblaze.com', 'Unlimited computer backup for ~$99/yr.'),
  idrive: a('IDrive', 8.29, 'https://www.idrive.com', 'Cheap multi-device backup with lots of space.'),

  // AI
  claude: a('Claude', 0, 'https://claude.ai', 'Free access to a highly capable model; usage limits.'),
  gemini: a('Google Gemini', 0, 'https://gemini.google.com', 'Strong free tier; Pro is $19.99 if you need more.'),
  copilotAI: a('Microsoft Copilot', 0, 'https://copilot.microsoft.com', 'Free GPT-class chat with web grounding.'),
  perplexityFree: a('Perplexity', 0, 'https://www.perplexity.ai', 'Free tier gives sourced, cited answers.'),
  deepseek: a('DeepSeek', 0, 'https://www.deepseek.com', 'Free, capable chat and reasoning model.'),
  mistral: a('Mistral Le Chat', 0, 'https://chat.mistral.ai', 'Free European AI assistant.'),
  chatgptGo: a('ChatGPT Go', 8, 'https://chatgpt.com', 'OpenAI’s cheaper paid tier at $8/mo.'),
  bingImage: a('Microsoft Copilot / Designer', 0, 'https://copilot.microsoft.com', 'Free DALL·E-powered image generation.'),
  leonardo: a('Leonardo.ai', 0, 'https://leonardo.ai', 'Free daily image-generation credits.'),
  kling: a('Kling AI', 0, 'https://klingai.com', 'Free tier for AI video generation.'),
  pika: a('Pika', 0, 'https://pika.art', 'Free tier for short AI video clips.'),
  playht: a('Play.ht / Piper', 0, 'https://play.ht', 'Cheaper AI voices; open-source Piper is free.'),
  udio: a('Udio', 0, 'https://www.udio.com', 'Free tier for AI music generation.'),

  // Dev
  windsurf: a('Windsurf (Codeium)', 0, 'https://windsurf.com', 'Free AI autocomplete + chat, generous personal tier.'),
  continueDev: a('Continue.dev', 0, 'https://www.continue.dev', 'Open-source, bring-your-own-model; $0 forever.'),
  amazonQ: a('Amazon Q Developer', 0, 'https://aws.amazon.com/q/developer', 'Generous free tier for individuals.'),
  tabnine: a('Tabnine', 0, 'https://www.tabnine.com', 'Free basic completions; privacy-focused.'),
  cline: a('Cline', 0, 'https://cline.bot', 'Open-source VS Code agent; pay only your own LLM API.'),
  supermaven: a('Supermaven', 0, 'https://supermaven.com', 'Very fast free autocomplete.'),
  gitlab: a('GitLab', 0, 'https://gitlab.com', 'Free private repos + CI/CD.'),
  codeberg: a('Codeberg', 0, 'https://codeberg.org', 'Free, community-run Git hosting.'),
  cfPages: a('Cloudflare Pages', 0, 'https://pages.cloudflare.com', 'Free tier with unlimited bandwidth.'),
  netlify: a('Netlify', 0, 'https://www.netlify.com', 'Free Starter tier for sites and functions.'),
  render: a('Render', 0, 'https://render.com', 'Free static hosting; usage-based for services.'),
  railway: a('Railway', 5, 'https://railway.com', 'Usage-based from $5/mo; great for full-stack apps.'),
  ghPages: a('GitHub Pages', 0, 'https://pages.github.com', 'Free static hosting from a repo.'),
  fly: a('Fly.io', 0, 'https://fly.io', 'Free allowances; pay-as-you-go app hosting.'),
  digitalocean: a('DigitalOcean', 4, 'https://www.digitalocean.com', 'Predictable pricing; Droplets from $4/mo.'),
  hetzner: a('Hetzner', 4.50, 'https://www.hetzner.com', '3–5× cheaper compute with generous egress.'),
  vultr: a('Vultr', 2.50, 'https://www.vultr.com', 'Instances from $2.50/mo, 30+ locations.'),
  linode: a('Linode (Akamai)', 5, 'https://www.linode.com', 'Simple VPS pricing from $5/mo.'),
  oracleFree: a('Oracle Cloud Free Tier', 0, 'https://www.oracle.com/cloud/free', 'Always-free small VMs and storage.'),
  firebase: a('Firebase', 0, 'https://firebase.google.com', 'Generous free tier for app backends.'),
  neon: a('Neon', 0, 'https://neon.tech', 'Free serverless Postgres.'),
  appwrite: a('Appwrite', 0, 'https://appwrite.io', 'Open-source backend; free cloud tier or self-host.'),
  vscode: a('VS Code', 0, 'https://code.visualstudio.com', 'Free, extensible editor with rich language support.'),
  neovim: a('Neovim', 0, 'https://neovim.io', 'Free, powerful modal editor.'),

  // Productivity / office
  gdocs: a('Google Docs', 0, 'https://docs.google.com', 'Free real-time docs, sheets and slides.'),
  libreoffice: a('LibreOffice', 0, 'https://www.libreoffice.org', 'Free, full desktop office suite you own.'),
  onlyoffice: a('OnlyOffice', 0, 'https://www.onlyoffice.com', 'Free desktop suite; great .docx/.xlsx compatibility.'),
  wps: a('WPS Office', 0, 'https://www.wps.com', 'Free tier with a familiar Office-like UI.'),
  iwork: a('Apple iWork', 0, 'https://www.apple.com/iwork', 'Free Pages/Numbers/Keynote on Apple devices.'),
  zoho: a('Zoho Workplace', 0, 'https://www.zoho.com/workplace', 'Free for personal use; full online suite.'),
  obsidian: a('Obsidian', 0, 'https://obsidian.md', 'Free local Markdown notes you own.'),
  notionFree: a('Notion', 0, 'https://www.notion.so', 'Generous free plan for docs + databases.'),
  appflowy: a('AppFlowy', 0, 'https://appflowy.io', 'Open-source Notion clone; local-first, free.'),
  logseq: a('Logseq', 0, 'https://logseq.com', 'Free outliner for networked notes.'),
  coda: a('Coda', 0, 'https://coda.io', 'Free tier for docs + tables.'),
  joplin: a('Joplin', 0, 'https://joplinapp.org', 'Free, open-source, encrypted notes.'),
  keep: a('Google Keep', 0, 'https://keep.google.com', 'Free quick notes and lists.'),
  appleNotes: a('Apple Notes', 0, 'https://www.apple.com/notes', 'Free, capable notes built into Apple devices.'),
  ticktick: a('TickTick', 0, 'https://ticktick.com', 'Free tasks, reminders and calendar.'),
  msToDo: a('Microsoft To Do', 0, 'https://to-do.office.com', 'Free task manager with reminders.'),
  trello: a('Trello', 0, 'https://trello.com', 'Free Kanban boards; simple and visual.'),
  clickup: a('ClickUp', 0, 'https://clickup.com', 'Generous free plan; broad feature set.'),
  asana: a('Asana', 0, 'https://asana.com', 'Free for small teams; solid task management.'),
  jira: a('Jira', 0, 'https://www.atlassian.com/software/jira', 'Free for up to 10 users.'),
  ghProjects: a('GitHub Projects', 0, 'https://github.com/features/issues', 'Free issue tracking tied to your repos.'),
  plane: a('Plane', 0, 'https://plane.so', 'Open-source Linear-style tracker; free or self-host.'),
  shortcut: a('Shortcut', 0, 'https://www.shortcut.com', 'Free up to 10 users; sprints and milestones.'),
  gsheets: a('Google Sheets', 0, 'https://sheets.google.com', 'Free spreadsheets with real-time collaboration.'),
  baserow: a('Baserow', 0, 'https://baserow.io', 'Open-source Airtable alternative; free/self-host.'),
  nocodb: a('NocoDB', 0, 'https://nocodb.com', 'Open-source no-code database; free/self-host.'),

  // Communication
  discord: a('Discord', 0, 'https://discord.com', 'Free unlimited chat, voice and screen share.'),
  pumble: a('Pumble', 0, 'https://pumble.com', 'Free team chat with unlimited history and users.'),
  rocketchat: a('Rocket.Chat', 0, 'https://www.rocket.chat', 'Open-source team chat; free/self-host.'),
  teamsFree: a('Microsoft Teams (Free)', 0, 'https://www.microsoft.com/microsoft-teams/free', 'Free chat and meetings.'),
  gchat: a('Google Chat', 0, 'https://chat.google.com', 'Free chat bundled with a Google account.'),
  meet: a('Google Meet', 0, 'https://meet.google.com', 'Free video meetings up to 60 minutes.'),
  jitsi: a('Jitsi Meet', 0, 'https://meet.jit.si', 'Free, open-source video conferencing; no account.'),
  calcom: a('Cal.com', 0, 'https://cal.com', 'Open-source scheduling; free or self-host.'),
  tidycal: a('TidyCal', 0, 'https://tidycal.com', 'Cheap one-time scheduling tool.'),
  loomFree: a('Vimeo Record', 0, 'https://vimeo.com/record', 'Free screen + camera recording in the browser.'),

  // Design / photography
  penpot: a('Penpot', 0, 'https://penpot.app', 'Open-source, unlimited collaborators; free.'),
  lunacy: a('Lunacy', 0, 'https://icons8.com/lunacy', 'Free native design app; opens .sketch.'),
  figmaFree: a('Figma (Free)', 0, 'https://www.figma.com', 'Free tier covers most solo design work.'),
  excalidraw: a('Excalidraw', 0, 'https://excalidraw.com', 'Free whiteboarding and wireframing.'),
  canvaFree: a('Canva (Free)', 0, 'https://www.canva.com', 'Free tier for quick, template-based design.'),
  photopea: a('Photopea', 0, 'https://www.photopea.com', 'Free browser Photoshop clone; opens PSD.'),
  gimp: a('GIMP', 0, 'https://www.gimp.org', 'Free, open-source photo editor.'),
  krita: a('Krita', 0, 'https://krita.org', 'Free, open-source painting and illustration.'),
  inkscape: a('Inkscape', 0, 'https://inkscape.org', 'Free, open-source vector graphics.'),
  davinci: a('DaVinci Resolve', 0, 'https://www.blackmagicdesign.com/products/davinciresolve', 'Free pro-grade video editing and color.'),
  blender: a('Blender', 0, 'https://www.blender.org', 'Free 3D creation plus a capable video editor.'),
  darktable: a('Darktable', 0, 'https://www.darktable.org', 'Free, open-source RAW photo workflow.'),
  rawtherapee: a('RawTherapee', 0, 'https://www.rawtherapee.com', 'Free, open-source RAW processor.'),
  snapseed: a('Snapseed', 0, 'https://snapseed.online', 'Free, capable mobile photo editor.'),
  vistacreate: a('VistaCreate', 0, 'https://create.vista.com', 'Canva-style tool; generous free tier.'),
  adobeExpress: a('Adobe Express (Free)', 0, 'https://www.adobe.com/express', 'Free tier with Firefly AI.'),
  capcutFree: a('CapCut (Free)', 0, 'https://www.capcut.com', 'Free, powerful video editor.'),
  shotcut: a('Shotcut', 0, 'https://shotcut.org', 'Free, open-source video editor.'),
  framerFree: a('Framer (Free)', 0, 'https://www.framer.com', 'Free tier to design and publish sites.'),
  applePhotos: a('Apple Photos', 0, 'https://www.apple.com/ios/photos', 'Free editing built into Apple devices.'),

  // Website / ecommerce
  hostinger: a('Hostinger Website Builder', 2.99, 'https://www.hostinger.com', 'Very cheap AI site builder with hosting.'),
  wordpressOrg: a('WordPress.org', 0, 'https://wordpress.org', 'Free, self-hosted; pay only for hosting.'),
  webador: a('Webador', 0, 'https://www.webador.com', 'Free website builder with paid upgrades.'),
  googleSites: a('Google Sites', 0, 'https://sites.google.com', 'Free, simple site builder.'),
  carrd: a('Carrd', 1.58, 'https://carrd.co', 'One-page sites for ~$19/yr.'),
  woocommerce: a('WooCommerce', 0, 'https://woocommerce.com', 'Free WordPress store plugin; pay hosting.'),
  squareOnline: a('Square Online', 0, 'https://squareup.com/online-store', 'Free online store; pay only transaction fees.'),
  ecwid: a('Ecwid', 0, 'https://www.ecwid.com', 'Free plan to add a store to any site.'),
  ghostBlog: a('Ghost', 9, 'https://ghost.org', 'Cheaper publishing; free if self-hosted.'),
  substackFree: a('Substack', 0, 'https://substack.com', 'Free to publish; takes a cut only when you charge.'),
  bearblog: a('Bear Blog', 0, 'https://bearblog.dev', 'Free, ultra-minimal blogging.'),

  // Security / privacy
  protonVpn: a('Proton VPN', 0, 'https://protonvpn.com', 'Only major free tier with unlimited data; open-source.'),
  windscribe: a('Windscribe', 0, 'https://windscribe.com', 'Free 10GB/mo; flexible paid tiers.'),
  surfshark: a('Surfshark', 2.49, 'https://surfshark.com', 'Cheap on 2-yr plans; unlimited devices.'),
  pia: a('Private Internet Access', 2.19, 'https://www.privateinternetaccess.com', 'Very cheap long-term; unlimited connections.'),
  mullvad: a('Mullvad', 5, 'https://mullvad.net', 'Flat €5/mo, no account email; strong privacy.'),
  warp: a('Cloudflare WARP', 0, 'https://one.one.one.one', 'Free fast privacy tunnel (not geo-spoofing).'),
  bitwarden: a('Bitwarden', 0, 'https://bitwarden.com', 'Free unlimited passwords + sync; Premium $10/yr.'),
  protonPass: a('Proton Pass', 0, 'https://proton.me/pass', 'Free unlimited logins/devices + email aliases.'),
  keepass: a('KeePassXC', 0, 'https://keepassxc.org', 'Free, fully local/offline vault.'),
  applePw: a('Apple Passwords', 0, 'https://support.apple.com/passwords', 'Free, built into Apple devices.'),
  googlePw: a('Google Password Manager', 0, 'https://passwords.google.com', 'Free, built into Chrome and Android.'),
  defender: a('Microsoft Defender', 0, 'https://www.microsoft.com/windows/comprehensive-security', 'Free antivirus built into Windows.'),
  bitdefenderFree: a('Bitdefender Free', 0, 'https://www.bitdefender.com/solutions/free.html', 'Free, well-rated antivirus.'),
  malwarebytesFree: a('Malwarebytes (Free)', 0, 'https://www.malwarebytes.com', 'Free on-demand malware removal.'),

  // Fitness / health
  ntc: a('Nike Training Club', 0, 'https://www.nike.com/ntc-app', 'Completely free strength, cardio and yoga.'),
  fiton: a('FitOn', 0, 'https://fiton.com', 'Free guided classes; premium optional.'),
  appleFitness: a('Apple Fitness+', 9.99, 'https://www.apple.com/apple-fitness-plus', 'Cheaper studio-style classes; in Apple One.'),
  downdog: a('Down Dog', 0, 'https://www.downdogapp.com', 'Free/cheap customizable yoga and HIIT.'),
  strava: a('Strava', 0, 'https://www.strava.com', 'Free activity tracking; paid for analytics.'),
  nikeRun: a('Nike Run Club', 0, 'https://www.nike.com/nrc-app', 'Free run tracking and coaching.'),
  garmin: a('Garmin Connect', 0, 'https://connect.garmin.com', 'Free tracking with a Garmin device.'),
  myfitnesspalFree: a('MyFitnessPal (Free)', 0, 'https://www.myfitnesspal.com', 'Free calorie + macro tracking, huge food database.'),
  loseit: a('Lose It!', 0, 'https://www.loseit.com', 'Free calorie tracking with a strong free tier.'),
  cronometerFree: a('Cronometer', 0, 'https://cronometer.com', 'Free, detailed micronutrient tracking.'),
  appleFitnessFree: a('Apple Fitness (built-in)', 0, 'https://www.apple.com/ios/health', 'Free activity + health tracking on iPhone.'),
  googleFit: a('Google Fit', 0, 'https://www.google.com/fit', 'Free activity tracking on Android.'),
  goodrx: a('GoodRx', 0, 'https://www.goodrx.com', 'Free prescription discounts at pharmacies.'),
  costplus: a('Mark Cuban Cost Plus Drugs', 0, 'https://costplusdrugs.com', 'Generic meds near cost, no membership.'),

  // Meditation / mental health
  insight: a('Insight Timer', 0, 'https://insighttimer.com', 'Huge free library of guided meditations.'),
  smilingmind: a('Smiling Mind', 0, 'https://www.smilingmind.com.au', 'Free nonprofit mindfulness app.'),
  medito: a('Medito', 0, 'https://meditofoundation.org', 'Completely free, nonprofit meditation app.'),
  uclamindful: a('UCLA Mindful', 0, 'https://www.uclahealth.org/programs/marc', 'Free guided meditations from UCLA.'),
  plumvillage: a('Plum Village', 0, 'https://plumvillage.app', 'Free meditations, talks and bells.'),
  sevencups: a('7 Cups', 0, 'https://www.7cups.com', 'Free emotional support from trained listeners.'),
  openpath: a('Open Path Collective', 27.5, 'https://openpathcollective.org', 'Therapy at $30–80/session after a one-time fee.'),

  // Education / learning
  khan: a('Khan Academy', 0, 'https://www.khanacademy.org', 'Free, high-quality academic courses.'),
  freecodecamp: a('freeCodeCamp', 0, 'https://www.freecodecamp.org', 'Free full coding curriculum + certs.'),
  edxAudit: a('edX (audit)', 0, 'https://www.edx.org', 'Audit university courses free (no cert).'),
  courseraAudit: a('Coursera (audit)', 0, 'https://www.coursera.org', 'Audit many courses free (no cert/grading).'),
  mitocw: a('MIT OpenCourseWare', 0, 'https://ocw.mit.edu', 'Free MIT course materials.'),
  youtube: a('YouTube', 0, 'https://www.youtube.com', 'Endless free tutorials and lectures.'),
  odin: a('The Odin Project', 0, 'https://www.theodinproject.com', 'Free, full web-dev curriculum.'),
  kaggle: a('Kaggle Learn', 0, 'https://www.kaggle.com/learn', 'Free hands-on data-science micro-courses.'),
  mslearn: a('Microsoft Learn', 0, 'https://learn.microsoft.com/training', 'Free official tech training + certs paths.'),
  domestika: a('Domestika', 0, 'https://www.domestika.org', 'Cheap creative courses, frequent sales.'),

  // Language
  duolingoFree: a('Duolingo (Free)', 0, 'https://www.duolingo.com', 'Free gamified lessons; ad-supported.'),
  anki: a('Anki', 0, 'https://apps.ankiweb.net', 'Free, powerful spaced-repetition flashcards.'),
  memriseFree: a('Memrise', 0, 'https://www.memrise.com', 'Free vocabulary via spaced repetition.'),
  busuuFree: a('Busuu (Free)', 0, 'https://www.busuu.com', 'Free lessons with community feedback.'),
  langtransfer: a('Language Transfer', 0, 'https://www.languagetransfer.org', 'Completely free audio courses.'),
  clozemaster: a('Clozemaster', 0, 'https://www.clozemaster.com', 'Free vocabulary through sentences.'),

  // Writing
  languagetool: a('LanguageTool', 0, 'https://languagetool.org', 'Free grammar/style in 30+ languages.'),
  quillbot: a('QuillBot', 0, 'https://quillbot.com', 'Free unlimited grammar checker + paraphraser.'),
  hemingway: a('Hemingway Editor', 0, 'https://hemingwayapp.com', 'Free web readability editor.'),
  msEditor: a('Microsoft Editor', 0, 'https://www.microsoft.com/microsoft-365/microsoft-editor', 'Free grammar/spelling in browser and Word.'),
  prowritingaidFree: a('ProWritingAid (Free)', 0, 'https://prowritingaid.com', 'Free tier with deep style reports.'),
  whisper: a('OpenAI Whisper', 0, 'https://github.com/openai/whisper', 'Free, open-source transcription.'),
  tldv: a('tl;dv', 0, 'https://tldv.io', 'Free meeting recording + transcription.'),

  // News
  libraryNews: a('Public library (Libby/PressReader)', 0, 'https://www.libbyapp.com', 'Free NYT/WSJ/Economist etc. with a library card.'),
  apnews: a('AP News', 0, 'https://apnews.com', 'Free, high-quality wire journalism.'),
  reutersFree: a('Reuters', 0, 'https://www.reuters.com', 'Free breaking news and markets coverage.'),
  guardian: a('The Guardian', 0, 'https://www.theguardian.com', 'Free full access; optional supporter donation.'),
  bbc: a('BBC News', 0, 'https://www.bbc.com/news', 'Free global news coverage.'),
  yahooFinanceFree: a('Yahoo Finance', 0, 'https://finance.yahoo.com', 'Free markets news and data.'),
  propublica: a('ProPublica', 0, 'https://www.propublica.org', 'Free investigative journalism.'),
  athleticFree: a('team beat writers / free sports', 0, 'https://www.espn.com', 'Free scores, news and analysis (e.g. ESPN).'),

  // Food / meal
  everyplate: a('EveryPlate', 40, 'https://www.everyplate.com', 'HelloFresh’s budget brand, ~half the price.'),
  dinnerly: a('Dinnerly', 38, 'https://dinnerly.com', 'Cheapest major meal kit; simple recipes.'),
  mealime: a('Mealime', 0, 'https://www.mealime.com', 'Free meal planner; you buy your own groceries.'),
  storePickup: a('Store pickup / cook at home', 0, 'https://www.google.com', 'Free grocery pickup + planning beats kit prices.'),
  walmartPlusDelivery: a('Walmart+', 12.95, 'https://www.walmart.com/plus', 'Cheaper grocery delivery membership.'),
  subscribeSave: a('Amazon Subscribe & Save', 0, 'https://www.amazon.com', 'No membership; up to 15% off recurring items.'),

  // Retail memberships
  walmartPlus: a('Walmart+', 12.95, 'https://www.walmart.com/plus', 'Cheaper than Prime; free shipping + Paramount+.'),
  targetCircle: a('Target Circle 360', 10.99, 'https://www.target.com/circle', 'Same-day delivery membership; free tier too.'),
  samsclub: a("Sam's Club", 4.17, 'https://www.samsclub.com', 'Warehouse club from ~$50/yr; often discounted.'),
  bjs: a("BJ's Wholesale", 4.17, 'https://www.bjs.com', 'Cheapest warehouse club entry; coupon-friendly.'),
  aldi: a('Aldi', 0, 'https://www.aldi.us', 'No membership; deep private-label discounts.'),
  targetRedcard: a('Target RedCard', 0, 'https://www.target.com/redcard', 'Free 5% off + free shipping, no annual fee.'),

  // Dating
  facebookDating: a('Facebook Dating', 0, 'https://www.facebook.com/dating', 'Fully free mainstream dating.'),
  pof: a('Plenty of Fish', 0, 'https://www.pof.com', 'Free messaging; huge user base.'),
  okcupidFree: a('OkCupid', 0, 'https://www.okcupid.com', 'Free messaging and detailed matching.'),
  badoo: a('Badoo', 0, 'https://badoo.com', 'Free dating with a large global base.'),
  hingeFree: a('Hinge (Free)', 0, 'https://hinge.co', 'Free tier with daily likes.'),
  scruff: a('SCRUFF', 0, 'https://www.scruff.com', 'Free LGBTQ+ dating app.'),

  // Social / creator
  bluesky: a('Bluesky', 0, 'https://bsky.app', 'Free, open microblogging.'),
  mastodon: a('Mastodon', 0, 'https://joinmastodon.org', 'Free, open, ad-free social network.'),
  threads: a('Threads', 0, 'https://www.threads.net', 'Free text-based social from Instagram.'),
  signal: a('Signal', 0, 'https://signal.org', 'Free, private, encrypted messaging.'),
  guilded: a('Guilded', 0, 'https://www.guilded.gg', 'Free Discord-style community chat with extras.'),
  kofi: a('Ko-fi', 0, 'https://ko-fi.com', 'Creator memberships/tips with no platform cut on the free plan.'),
  buymeacoffee: a('Buy Me a Coffee', 0, 'https://www.buymeacoffee.com', 'Simple creator support; low fees.'),
  ghSponsors: a('GitHub Sponsors', 0, 'https://github.com/sponsors', 'Recurring support for developers; no platform fee.'),
  beehiiv: a('beehiiv', 0, 'https://www.beehiiv.com', 'Free newsletter platform up to a large list.'),
  wellfound: a('Wellfound', 0, 'https://wellfound.com', 'Free startup job search + networking.'),
  linkedinFree: a('LinkedIn (Free)', 0, 'https://www.linkedin.com', 'Free networking, jobs and posting.'),

  // Smart home
  eufy: a('Eufy', 0, 'https://www.eufy.com', 'Cameras with free local storage; no monthly fee.'),
  wyzeCam: a('Wyze', 0, 'https://www.wyze.com', 'Cheap cameras; free local microSD recording.'),
  reolink: a('Reolink', 0, 'https://reolink.com', 'Cameras with local NVR/microSD; no fees.'),
  tapo: a('TP-Link Tapo', 0, 'https://www.tapo.com', 'Budget cameras with free local storage.'),
  blinkLocal: a('Blink (local sync)', 0, 'https://blinkforhome.com', 'Local storage via Sync Module; no subscription.'),
  ringAlarmCheap: a('Ring Alarm (self-monitor)', 0, 'https://ring.com', 'Self-monitored security with no monthly fee.'),

  // Auto / connectivity
  phoneHotspot: a('Phone hotspot + apps', 0, 'https://www.google.com', 'Use your phone’s data, Maps and music instead.'),
  spotifyCar: a('Spotify + phone', 0, 'https://www.spotify.com', 'Stream music via phone Bluetooth, free tier available.'),
  googleMaps: a('Google Maps / Waze', 0, 'https://maps.google.com', 'Free navigation and live traffic.'),

  // Telecom (MVNOs)
  mint: a('Mint Mobile', 15, 'https://www.mintmobile.com', 'T-Mobile network; ~$15/mo prepaid annually.'),
  visible: a('Visible', 25, 'https://www.visible.com', 'Verizon network; unlimited from $25/mo.'),
  usmobile: a('US Mobile', 25, 'https://www.usmobile.com', 'Pick any of the big-3 networks; from ~$25/mo.'),
  tello: a('Tello', 10, 'https://tello.com', 'T-Mobile network; build-your-own cheap plans.'),
  cricket: a('Cricket Wireless', 30, 'https://www.cricketwireless.com', 'AT&T network prepaid; simple cheap plans.'),
  googleFi: a('Google Fi', 20, 'https://fi.google.com', 'Flexible data + great international.'),

  // Finance
  empower: a('Empower', 0, 'https://www.empower.com', 'Free net-worth, budgeting and investment tracking.'),
  rocketMoneyFree: a('Rocket Money', 0, 'https://www.rocketmoney.com', 'Free budgeting + subscription tracking.'),
  everydollar: a('EveryDollar', 0, 'https://www.ramseysolutions.com/ramseyplus/everydollar', 'Free zero-based budgeting.'),
  goodbudget: a('Goodbudget', 0, 'https://goodbudget.com', 'Free envelope budgeting.'),
  simplifi: a('Quicken Simplifi', 3.99, 'https://www.quicken.com/simplifi', 'Cheap, full-featured budgeting (~$48/yr).'),
  creditKarma: a('Credit Karma', 0, 'https://www.creditkarma.com', 'Free credit scores and monitoring.'),
  walletHub: a('WalletHub', 0, 'https://wallethub.com', 'Free daily credit score + monitoring.'),
  finviz: a('Finviz', 0, 'https://finviz.com', 'Powerful free stock screener and data.'),
  stockanalysis: a('Stock Analysis', 0, 'https://stockanalysis.com', 'Free financials, estimates and screening.'),
  yahooFinance: a('Yahoo Finance', 0, 'https://finance.yahoo.com', 'Free markets data and news.'),
  fidelity: a('Fidelity', 0, 'https://www.fidelity.com', 'Free stock/ETF trades + strong research.'),
  webull: a('Webull', 0, 'https://www.webull.com', 'Free trading with advanced charts.'),
  zacks: a('Zacks', 0, 'https://www.zacks.com', 'Free stock ratings and research.'),
  simplywallst: a('Simply Wall St', 0, 'https://simplywall.st', 'Visual stock analysis; free reports.'),

  // Subscription boxes
  harrys: a("Harry's", 8, 'https://www.harrys.com', 'Cheaper razors and blades by mail.'),
  retailRazors: a('Store-brand razors', 0, 'https://www.google.com', 'Buy blades retail; usually cheaper per shave.'),
  boxycharm: a('BoxyCharm', 28, 'https://www.ipsy.com/boxycharm', 'Full-size beauty products; more value per box.'),
  sephoraSample: a('Sephora / Ulta samples', 0, 'https://www.sephora.com', 'Free samples with purchases; no subscription.'),
  chewy: a('Chewy / retail toys', 0, 'https://www.chewy.com', 'Buy pet toys/treats as needed, often cheaper.'),
  bookLibrary: a('Libby (library)', 0, 'https://libbyapp.com', 'Free ebooks and audiobooks with a library card.'),
  kiwicoFree: a('Library + free STEM kits', 0, 'https://www.sciencebuddies.org', 'Free STEM project guides and library programs.'),
};

interface Seed { name: string; category: string; alts: Alt[]; }
const SEED: Seed[] = [
  // ── Streaming Video ──
  { name: 'Netflix', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.roku, A.peacock, A.paramount, A.appletv, A.crunchyroll] },
  { name: 'Disney+', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.roku, A.peacock, A.hoopla] },
  { name: 'Hulu', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.xumo, A.peacock, A.paramount] },
  { name: 'Max', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.peacock, A.paramount, A.appletv] },
  { name: 'Amazon Prime Video', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.roku, A.peacock, A.paramount] },
  { name: 'Apple TV+', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.roku, A.peacock, A.paramount] },
  { name: 'Peacock', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.roku, A.xumo, A.plex] },
  { name: 'Paramount+', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.roku, A.peacock, A.appletv] },
  { name: 'Starz', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.peacock, A.paramount, A.appletv] },
  { name: 'AMC+', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.roku, A.hoopla, A.kanopy] },
  { name: 'BritBox', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.roku, A.kanopy, A.hoopla] },
  { name: 'Crunchyroll', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.roku, A.youtube] },
  { name: 'Shudder', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.roku, A.kanopy, A.plex] },
  { name: 'MUBI', category: 'Streaming Video', alts: [A.kanopy, A.hoopla, A.tubi, A.plex] },
  { name: 'Discovery+', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.roku, A.peacock] },
  { name: 'Tubi', category: 'Streaming Video', alts: [A.pluto, A.roku, A.xumo, A.plex] },
  { name: 'Pluto TV', category: 'Streaming Video', alts: [A.tubi, A.roku, A.xumo, A.plex] },
  { name: 'The Roku Channel', category: 'Streaming Video', alts: [A.tubi, A.pluto, A.xumo, A.plex] },

  // ── Live TV Streaming ──
  { name: 'YouTube TV', category: 'Live TV Streaming', alts: [A.sling, A.philo, A.frndly, A.antenna, A.slingfree] },
  { name: 'Hulu + Live TV', category: 'Live TV Streaming', alts: [A.sling, A.philo, A.frndly, A.antenna] },
  { name: 'Sling TV', category: 'Live TV Streaming', alts: [A.philo, A.frndly, A.slingfree, A.antenna] },
  { name: 'Fubo', category: 'Live TV Streaming', alts: [A.sling, A.philo, A.frndly, A.antenna] },
  { name: 'DirecTV Stream', category: 'Live TV Streaming', alts: [A.sling, A.philo, A.frndly, A.antenna] },
  { name: 'Philo', category: 'Live TV Streaming', alts: [A.frndly, A.slingfree, A.pluto, A.tubi] },
  { name: 'Frndly TV', category: 'Live TV Streaming', alts: [A.slingfree, A.pluto, A.tubi, A.roku] },

  // ── Sports Streaming ──
  { name: 'ESPN', category: 'Sports Streaming', alts: [A.slingsports, A.espnplus, A.frndly, A.antenna] },
  { name: 'ESPN+', category: 'Sports Streaming', alts: [A.antenna, A.slingfree, A.youtube] },
  { name: 'DAZN', category: 'Sports Streaming', alts: [A.espnplus, A.slingsports, A.antenna] },
  { name: 'NBA League Pass', category: 'Sports Streaming', alts: [A.espnplus, A.antenna, A.slingsports] },
  { name: 'MLB.TV', category: 'Sports Streaming', alts: [A.antenna, A.espnplus, A.slingfree] },
  { name: 'NFL+', category: 'Sports Streaming', alts: [A.antenna, A.youtube, A.slingfree] },
  { name: 'F1 TV', category: 'Sports Streaming', alts: [A.slingsports, A.espnplus, A.youtube] },
  { name: 'UFC Fight Pass', category: 'Sports Streaming', alts: [A.espnplus, A.youtube] },

  // ── Music Streaming ──
  { name: 'Spotify', category: 'Music Streaming', alts: [A.spotifyFree, A.appleMusic, A.amazonMusic, A.ytMusicFree, A.deezerFree, A.pandora] },
  { name: 'Apple Music', category: 'Music Streaming', alts: [A.spotifyFree, A.amazonMusic, A.pandora, A.ytMusicFree, A.deezerFree, A.soundcloud] },
  { name: 'YouTube Music', category: 'Music Streaming', alts: [A.spotifyFree, A.amazonMusic, A.pandora, A.deezerFree, A.appleMusic] },
  { name: 'Amazon Music Unlimited', category: 'Music Streaming', alts: [A.spotifyFree, A.amazonMusic, A.ytMusicFree, A.pandora, A.appleMusic] },
  { name: 'Tidal', category: 'Music Streaming', alts: [A.spotifyFree, A.appleMusic, A.amazonMusic, A.deezerFree] },
  { name: 'Deezer', category: 'Music Streaming', alts: [A.spotifyFree, A.ytMusicFree, A.pandora, A.appleMusic] },
  { name: 'Pandora', category: 'Music Streaming', alts: [A.spotifyFree, A.iheart, A.ytMusicFree, A.tunein] },
  { name: 'SoundCloud Go+', category: 'Music Streaming', alts: [A.spotifyFree, A.soundcloud, A.bandcamp, A.ytMusicFree] },
  { name: 'Qobuz', category: 'Music Streaming', alts: [A.appleMusic, A.spotifyFree, A.deezerFree, A.bandcamp] },
  { name: 'iHeartRadio All Access', category: 'Music Streaming', alts: [A.iheart, A.pandora, A.spotifyFree, A.tunein] },
  { name: 'SiriusXM', category: 'Music Streaming', alts: [A.spotifyFree, A.pandora, A.iheart, A.tunein] },

  // ── Books & Audiobooks ──
  { name: 'Audible', category: 'Books & Audiobooks', alts: [A.libby, A.hoopla, A.librivox, A.everand, A.spotifyBooks, A.playBooks] },
  { name: 'Kindle Unlimited', category: 'Books & Audiobooks', alts: [A.libby, A.hoopla, A.standardEbooks, A.everand] },
  { name: 'Everand', category: 'Books & Audiobooks', alts: [A.libby, A.hoopla, A.kindleUnlimited, A.librivox] },
  { name: 'Libro.fm', category: 'Books & Audiobooks', alts: [A.libby, A.hoopla, A.librivox, A.everand] },
  { name: 'Kobo Plus', category: 'Books & Audiobooks', alts: [A.libby, A.kindleUnlimited, A.everand, A.standardEbooks] },
  { name: 'Storytel', category: 'Books & Audiobooks', alts: [A.libby, A.everand, A.spotifyBooks, A.librivox] },
  { name: 'Blinkist', category: 'Books & Audiobooks', alts: [A.headway, A.libby, A.youtube, A.hoopla] },

  // ── Gaming ──
  { name: 'Xbox Game Pass Ultimate', category: 'Gaming', alts: [a('PC Game Pass', 13.99, 'https://www.xbox.com/xbox-game-pass/pc-game-pass', 'Cheaper if you only play on PC.'), a('GeForce Now', 9.99, 'https://www.nvidia.com/geforce-now', 'Stream games you already own; no library.'), a('Amazon Luna', 9.99, 'https://luna.amazon.com', 'Luna+ $9.99; base library free with Prime.'), a('PlayStation Plus', 9.99, 'https://www.playstation.com/ps-plus', 'Cheaper base tier; online + monthly games.'), a('EA Play', 5.99, 'https://www.ea.com/ea-play', 'EA’s catalog for $5.99/mo.'), a('Prime Gaming', 0, 'https://gaming.amazon.com', 'Free games monthly with Prime.')] },
  { name: 'PC Game Pass', category: 'Gaming', alts: [a('GeForce Now', 9.99, 'https://www.nvidia.com/geforce-now', 'Stream games you own; free tier available.'), a('EA Play', 5.99, 'https://www.ea.com/ea-play', 'Cheaper EA catalog.'), a('Prime Gaming', 0, 'https://gaming.amazon.com', 'Free games monthly with Prime.'), a('Epic Games Store', 0, 'https://store.epicgames.com', 'Free game every week.')] },
  { name: 'PlayStation Plus', category: 'Gaming', alts: [a('GeForce Now', 9.99, 'https://www.nvidia.com/geforce-now', 'Cheaper cloud gaming of games you own.'), a('Prime Gaming', 0, 'https://gaming.amazon.com', 'Free monthly games with Prime.'), a('Epic Games Store', 0, 'https://store.epicgames.com', 'Free weekly games.'), a('EA Play', 5.99, 'https://www.ea.com/ea-play', 'Cheap catalog subscription.')] },
  { name: 'Nintendo Switch Online', category: 'Gaming', alts: [a('Prime Gaming', 0, 'https://gaming.amazon.com', 'Free games with Prime.'), a('Epic Games Store', 0, 'https://store.epicgames.com', 'Free weekly games.'), a('Google Play Pass', 4.99, 'https://play.google.com/pass', 'Cheap mobile game/app bundle.')] },
  { name: 'GeForce Now', category: 'Gaming', alts: [a('Xbox Cloud Gaming', 13.99, 'https://www.xbox.com/play', 'Cloud gaming via PC Game Pass.'), a('Amazon Luna', 9.99, 'https://luna.amazon.com', 'Cheaper cloud gaming; free with Prime tier.'), a('Boosteroid', 8.99, 'https://boosteroid.com', 'Cheap cloud gaming of games you own.')] },
  { name: 'Apple Arcade', category: 'Gaming', alts: [a('Google Play Pass', 4.99, 'https://play.google.com/pass', 'Cheaper bundle of games + apps.'), a('Netflix Games', 0, 'https://www.netflix.com', 'Included free with any Netflix plan.'), a('Prime Gaming', 0, 'https://gaming.amazon.com', 'Free games with Prime.')] },
  { name: 'EA Play', category: 'Gaming', alts: [a('Prime Gaming', 0, 'https://gaming.amazon.com', 'Free games with Prime.'), a('Epic Games Store', 0, 'https://store.epicgames.com', 'Free weekly games.'), a('Humble Choice', 11.99, 'https://www.humblebundle.com/membership', 'Keep games you claim each month.')] },
  { name: 'Ubisoft+', category: 'Gaming', alts: [a('EA Play', 5.99, 'https://www.ea.com/ea-play', 'Cheaper catalog subscription.'), a('PC Game Pass', 13.99, 'https://www.xbox.com/xbox-game-pass/pc-game-pass', 'Includes Ubisoft+ Classics.'), a('Prime Gaming', 0, 'https://gaming.amazon.com', 'Free games with Prime.')] },
  { name: 'Amazon Luna+', category: 'Gaming', alts: [a('GeForce Now', 9.99, 'https://www.nvidia.com/geforce-now', 'Cloud gaming of your own library.'), a('Prime Gaming', 0, 'https://gaming.amazon.com', 'Free games with Prime.'), a('Xbox Cloud Gaming', 13.99, 'https://www.xbox.com/play', 'Cloud gaming via Game Pass.')] },
  { name: 'Google Play Pass', category: 'Gaming', alts: [a('Apple Arcade', 6.99, 'https://www.apple.com/apple-arcade', 'Ad-free premium mobile games.'), a('Netflix Games', 0, 'https://www.netflix.com', 'Free with any Netflix plan.'), a('Prime Gaming', 0, 'https://gaming.amazon.com', 'Free games with Prime.')] },
  { name: 'Humble Choice', category: 'Gaming', alts: [a('Prime Gaming', 0, 'https://gaming.amazon.com', 'Free games monthly with Prime.'), a('Epic Games Store', 0, 'https://store.epicgames.com', 'Free weekly games.'), a('PC Game Pass', 13.99, 'https://www.xbox.com/xbox-game-pass/pc-game-pass', 'Large rotating library.')] },

  // ── Cloud Storage ──
  { name: 'Google One', category: 'Cloud Storage', alts: [A.pcloud, A.protonDrive, A.sync, A.mega, A.onedrive, A.icloud] },
  { name: 'iCloud+', category: 'Cloud Storage', alts: [A.googleOne, A.pcloud, A.protonDrive, A.sync, A.onedrive, A.mega] },
  { name: 'Dropbox', category: 'Cloud Storage', alts: [A.googleOne, A.pcloud, A.sync, A.protonDrive, A.icedrive, A.mega] },
  { name: 'Microsoft OneDrive', category: 'Cloud Storage', alts: [A.googleOne, A.pcloud, A.mega, A.protonDrive, A.sync] },
  { name: 'Box', category: 'Cloud Storage', alts: [A.googleOne, A.pcloud, A.sync, A.mega, A.protonDrive] },
  { name: 'pCloud', category: 'Cloud Storage', alts: [A.mega, A.icedrive, A.sync, A.googleOne] },
  { name: 'Proton Drive', category: 'Cloud Storage', alts: [A.mega, A.sync, A.pcloud, A.icedrive] },
  { name: 'Backblaze', category: 'Cloud Storage', alts: [A.idrive, A.sync, A.pcloud, A.googleOne] },
  { name: 'Sync.com', category: 'Cloud Storage', alts: [A.pcloud, A.icedrive, A.mega, A.protonDrive] },
  { name: 'Mega', category: 'Cloud Storage', alts: [A.pcloud, A.icedrive, A.sync, A.googleOne] },
  { name: 'IDrive', category: 'Cloud Storage', alts: [A.backblaze, A.pcloud, A.sync, A.googleOne] },

  // ── AI Tools ──
  { name: 'ChatGPT Plus', category: 'AI Tools', alts: [A.claude, A.gemini, A.copilotAI, A.perplexityFree, A.deepseek, A.chatgptGo] },
  { name: 'Claude Pro', category: 'AI Tools', alts: [A.claude, A.gemini, A.copilotAI, A.deepseek, A.mistral] },
  { name: 'Google Gemini', category: 'AI Tools', alts: [A.gemini, A.claude, A.copilotAI, A.perplexityFree, A.deepseek] },
  { name: 'Perplexity Pro', category: 'AI Tools', alts: [A.perplexityFree, A.gemini, A.claude, A.copilotAI] },
  { name: 'Microsoft Copilot Pro', category: 'AI Tools', alts: [A.copilotAI, A.gemini, A.claude, A.deepseek] },
  { name: 'SuperGrok', category: 'AI Tools', alts: [A.claude, A.gemini, A.deepseek, A.copilotAI] },
  { name: 'Midjourney', category: 'AI Tools', alts: [A.bingImage, A.leonardo, a('Playground AI', 0, 'https://playground.com', 'Free daily AI image generation.'), a('Stable Diffusion (local)', 0, 'https://stability.ai', 'Free, run open image models yourself.')] },
  { name: 'Runway', category: 'AI Tools', alts: [A.kling, A.pika, a('Luma Dream Machine', 0, 'https://lumalabs.ai/dream-machine', 'Free tier for AI video.'), A.capcutFree] },
  { name: 'ElevenLabs', category: 'AI Tools', alts: [A.playht, a('Google Cloud TTS', 0, 'https://cloud.google.com/text-to-speech', 'Generous free TTS tier.'), a('Microsoft Edge Read Aloud', 0, 'https://www.microsoft.com/edge', 'Free natural voices in the browser.')] },
  { name: 'Suno', category: 'AI Tools', alts: [A.udio, a('Riffusion', 0, 'https://www.riffusion.com', 'Free AI music generation.'), a('Stable Audio', 0, 'https://stableaudio.com', 'Free tier for AI audio.')] },

  // ── Productivity & Office ──
  { name: 'Microsoft 365', category: 'Productivity & Office', alts: [A.gdocs, A.libreoffice, A.onlyoffice, A.wps, A.iwork, A.zoho] },
  { name: 'Google Workspace', category: 'Productivity & Office', alts: [A.gdocs, A.libreoffice, A.zoho, A.onlyoffice] },
  { name: 'Notion', category: 'Productivity & Office', alts: [A.obsidian, A.appflowy, A.logseq, A.coda, A.gdocs] },
  { name: 'Evernote', category: 'Productivity & Office', alts: [A.obsidian, A.joplin, A.keep, A.appleNotes, A.notionFree] },
  { name: 'Todoist', category: 'Productivity & Office', alts: [A.ticktick, A.msToDo, A.keep, A.appleNotes] },
  { name: 'Trello', category: 'Productivity & Office', alts: [A.notionFree, A.clickup, A.ghProjects, A.plane] },
  { name: 'Asana', category: 'Productivity & Office', alts: [A.trello, A.clickup, A.notionFree, A.jira] },
  { name: 'monday.com', category: 'Productivity & Office', alts: [A.trello, A.clickup, A.asana, A.notionFree] },
  { name: 'ClickUp', category: 'Productivity & Office', alts: [A.trello, A.notionFree, A.asana, A.plane] },
  { name: 'Airtable', category: 'Productivity & Office', alts: [A.gsheets, A.notionFree, A.baserow, A.nocodb] },
  { name: 'Coda', category: 'Productivity & Office', alts: [A.notionFree, A.gdocs, A.obsidian, A.gsheets] },

  // ── Communication ──
  { name: 'Slack', category: 'Communication', alts: [A.discord, A.pumble, A.rocketchat, A.teamsFree, A.gchat] },
  { name: 'Zoom', category: 'Communication', alts: [A.meet, A.jitsi, A.teamsFree, A.discord] },
  { name: 'Webex', category: 'Communication', alts: [A.meet, A.jitsi, A.teamsFree, A.discord] },
  { name: 'Loom', category: 'Communication', alts: [A.loomFree, a('Screenity', 0, 'https://screenity.io', 'Free, open-source screen recorder.'), a('CapCut', 0, 'https://www.capcut.com', 'Free recording + editing.')] },
  { name: 'Calendly', category: 'Communication', alts: [A.calcom, A.tidycal, a('Google Calendar Appointments', 0, 'https://calendar.google.com', 'Free booking pages with a Google account.')] },

  // ── Developer & Cloud ──
  { name: 'GitHub Copilot', category: 'Developer & Cloud', alts: [A.windsurf, A.continueDev, A.amazonQ, A.tabnine, A.cline, A.supermaven] },
  { name: 'GitHub Pro', category: 'Developer & Cloud', alts: [a('GitHub Free', 0, 'https://github.com', 'Free unlimited private repos + Actions minutes.'), A.gitlab, A.codeberg] },
  { name: 'Vercel Pro', category: 'Developer & Cloud', alts: [A.cfPages, A.netlify, A.render, A.railway, A.ghPages, A.fly] },
  { name: 'Netlify', category: 'Developer & Cloud', alts: [A.cfPages, A.ghPages, A.render, A.fly] },
  { name: 'AWS', category: 'Developer & Cloud', alts: [A.digitalocean, A.hetzner, A.vultr, A.linode, A.fly, A.oracleFree] },
  { name: 'Google Cloud', category: 'Developer & Cloud', alts: [A.digitalocean, A.hetzner, A.vultr, A.oracleFree, A.fly] },
  { name: 'Microsoft Azure', category: 'Developer & Cloud', alts: [A.digitalocean, A.hetzner, A.vultr, A.oracleFree, A.fly] },
  { name: 'DigitalOcean', category: 'Developer & Cloud', alts: [A.hetzner, A.vultr, A.linode, A.oracleFree] },
  { name: 'Cloudflare', category: 'Developer & Cloud', alts: [A.cfPages, a('bunny.net', 1, 'https://bunny.net', 'Very cheap CDN and storage.'), A.netlify] },
  { name: 'Supabase', category: 'Developer & Cloud', alts: [A.firebase, A.neon, A.appwrite, a('PocketBase', 0, 'https://pocketbase.io', 'Free single-file backend; self-host.')] },
  { name: 'Railway', category: 'Developer & Cloud', alts: [A.render, A.fly, a('Koyeb', 0, 'https://www.koyeb.com', 'Free serverless deployment tier.'), A.digitalocean] },
  { name: 'Render', category: 'Developer & Cloud', alts: [A.railway, A.fly, A.cfPages, A.digitalocean] },
  { name: 'JetBrains', category: 'Developer & Cloud', alts: [A.vscode, A.neovim, a('Eclipse', 0, 'https://www.eclipse.org', 'Free, mature IDE.'), a('JetBrains Community Editions', 0, 'https://www.jetbrains.com', 'Free IntelliJ/PyCharm Community.')] },
  { name: 'Linear', category: 'Developer & Cloud', alts: [A.jira, A.ghProjects, A.plane, A.trello, A.shortcut, A.clickup] },

  // ── Design & Creative ──
  { name: 'Adobe Creative Cloud', category: 'Design & Creative', alts: [A.davinci, A.gimp, A.krita, A.inkscape, A.photopea, A.blender] },
  { name: 'Canva', category: 'Design & Creative', alts: [A.canvaFree, A.vistacreate, A.adobeExpress, A.photopea, A.krita, A.inkscape] },
  { name: 'Figma', category: 'Design & Creative', alts: [A.penpot, A.lunacy, A.framerFree, A.excalidraw, A.canvaFree, A.photopea] },
  { name: 'Sketch', category: 'Design & Creative', alts: [A.penpot, A.lunacy, A.figmaFree, A.excalidraw] },
  { name: 'Framer', category: 'Design & Creative', alts: [A.penpot, A.figmaFree, A.googleSites, A.carrd] },
  { name: 'Capture One', category: 'Design & Creative', alts: [A.darktable, A.rawtherapee, A.gimp, A.photopea] },
  { name: 'CapCut Pro', category: 'Design & Creative', alts: [A.capcutFree, A.davinci, A.shotcut, a('OpenShot', 0, 'https://www.openshot.org', 'Free, open-source video editor.')] },

  // ── Photography ──
  { name: 'Adobe Lightroom', category: 'Photography', alts: [A.darktable, A.rawtherapee, A.snapseed, A.photopea, A.applePhotos] },
  { name: 'VSCO', category: 'Photography', alts: [A.snapseed, A.darktable, a('Polarr', 0, 'https://www.polarr.com', 'Free photo editor with filters.'), A.applePhotos] },
  { name: 'Skylum Luminar', category: 'Photography', alts: [A.darktable, A.rawtherapee, A.gimp, A.photopea] },

  // ── Website & eCommerce ──
  { name: 'Squarespace', category: 'Website & eCommerce', alts: [A.hostinger, A.wordpressOrg, A.webador, A.googleSites, A.carrd] },
  { name: 'Wix', category: 'Website & eCommerce', alts: [A.hostinger, A.webador, A.googleSites, A.wordpressOrg, A.carrd] },
  { name: 'Shopify', category: 'Website & eCommerce', alts: [A.woocommerce, A.squareOnline, A.ecwid, A.wordpressOrg] },
  { name: 'WordPress.com', category: 'Website & eCommerce', alts: [A.wordpressOrg, A.ghostBlog, A.webador, A.googleSites] },
  { name: 'Webflow', category: 'Website & eCommerce', alts: [A.wordpressOrg, A.framerFree, A.carrd, A.googleSites] },
  { name: 'Weebly', category: 'Website & eCommerce', alts: [A.squareOnline, A.googleSites, A.webador, A.wordpressOrg] },
  { name: 'BigCommerce', category: 'Website & eCommerce', alts: [A.woocommerce, A.squareOnline, A.ecwid, A.wordpressOrg] },
  { name: 'Ghost', category: 'Website & eCommerce', alts: [A.wordpressOrg, A.substackFree, A.bearblog, A.beehiiv] },

  // ── Security & Privacy ──
  { name: 'NordVPN', category: 'Security & Privacy', alts: [A.protonVpn, A.windscribe, A.surfshark, A.pia, A.mullvad, A.warp] },
  { name: 'ExpressVPN', category: 'Security & Privacy', alts: [A.protonVpn, A.windscribe, A.surfshark, A.pia, A.mullvad] },
  { name: 'Surfshark', category: 'Security & Privacy', alts: [A.protonVpn, A.windscribe, A.pia, A.warp] },
  { name: 'Proton VPN', category: 'Security & Privacy', alts: [A.windscribe, A.warp, A.mullvad, A.pia] },
  { name: 'Mullvad', category: 'Security & Privacy', alts: [A.protonVpn, A.pia, A.windscribe, A.warp] },
  { name: '1Password', category: 'Security & Privacy', alts: [A.bitwarden, A.protonPass, A.keepass, A.applePw, A.googlePw] },
  { name: 'Bitwarden', category: 'Security & Privacy', alts: [A.protonPass, A.keepass, A.applePw, A.googlePw] },
  { name: 'Dashlane', category: 'Security & Privacy', alts: [A.bitwarden, A.protonPass, A.keepass, A.applePw] },
  { name: 'NordPass', category: 'Security & Privacy', alts: [A.bitwarden, A.protonPass, A.keepass, A.googlePw] },
  { name: 'Norton 360', category: 'Security & Privacy', alts: [A.defender, A.bitdefenderFree, A.malwarebytesFree, A.protonVpn] },
  { name: 'McAfee', category: 'Security & Privacy', alts: [A.defender, A.bitdefenderFree, A.malwarebytesFree] },
  { name: 'Malwarebytes', category: 'Security & Privacy', alts: [A.defender, A.bitdefenderFree, A.malwarebytesFree] },

  // ── Fitness ──
  { name: 'Peloton', category: 'Fitness', alts: [A.ntc, A.fiton, A.appleFitness, A.downdog, A.strava] },
  { name: 'Apple Fitness+', category: 'Fitness', alts: [A.ntc, A.fiton, A.downdog, A.youtube] },
  { name: 'Strava', category: 'Fitness', alts: [A.nikeRun, A.garmin, A.appleFitnessFree, A.googleFit] },
  { name: 'WHOOP', category: 'Fitness', alts: [a('Fitbit', 0, 'https://www.fitbit.com', 'Cheaper wearable with strong sleep tracking.'), A.appleFitnessFree, A.garmin, a('Oura', 5.99, 'https://ouraring.com', 'Ring-based sleep/recovery tracking.')] },
  { name: 'Fitbit Premium', category: 'Fitness', alts: [A.appleFitnessFree, A.googleFit, A.strava, a('Samsung Health', 0, 'https://www.samsung.com/us/apps/samsung-health', 'Free activity and wellness tracking.')] },
  { name: 'MyFitnessPal', category: 'Fitness', alts: [A.cronometerFree, A.loseit, a('FatSecret', 0, 'https://www.fatsecret.com', 'Free calorie counter and food diary.'), A.myfitnesspalFree] },
  { name: 'Nike Training Club', category: 'Fitness', alts: [A.fiton, A.downdog, A.youtube] },
  { name: 'FitOn', category: 'Fitness', alts: [A.ntc, A.downdog, A.youtube] },
  { name: 'Centr', category: 'Fitness', alts: [A.ntc, A.fiton, A.appleFitness, A.downdog] },
  { name: 'Freeletics', category: 'Fitness', alts: [A.ntc, A.fiton, A.downdog, A.youtube] },
  { name: 'Alo Moves', category: 'Fitness', alts: [A.downdog, A.fiton, A.insight, A.youtube] },
  { name: 'ClassPass', category: 'Fitness', alts: [A.fiton, A.ntc, a('Wellhub (Gympass)', 11.99, 'https://wellhub.com', 'Cheaper gym-network membership.'), A.youtube] },

  // ── Mental Health & Meditation ──
  { name: 'Calm', category: 'Mental Health & Meditation', alts: [A.insight, A.smilingmind, A.medito, A.uclamindful, A.plumvillage] },
  { name: 'Headspace', category: 'Mental Health & Meditation', alts: [A.insight, A.medito, A.smilingmind, A.uclamindful] },
  { name: 'BetterHelp', category: 'Mental Health & Meditation', alts: [A.openpath, A.sevencups, a('Talkspace', 69, 'https://www.talkspace.com', 'Comparable online therapy; may take insurance.'), a('Community mental-health clinics', 0, 'https://findtreatment.gov', 'Free/low-cost local counseling.')] },
  { name: 'Talkspace', category: 'Mental Health & Meditation', alts: [A.openpath, A.sevencups, a('Community mental-health clinics', 0, 'https://findtreatment.gov', 'Free/low-cost local counseling.')] },
  { name: 'Insight Timer', category: 'Mental Health & Meditation', alts: [A.medito, A.smilingmind, A.uclamindful, A.plumvillage] },
  { name: 'Balance', category: 'Mental Health & Meditation', alts: [A.insight, A.medito, A.smilingmind, A.uclamindful] },
  { name: 'Ten Percent Happier', category: 'Mental Health & Meditation', alts: [A.insight, A.medito, A.smilingmind, A.uclamindful] },

  // ── Health & Nutrition ──
  { name: 'Noom', category: 'Health & Nutrition', alts: [A.myfitnesspalFree, A.loseit, A.cronometerFree, A.fiton] },
  { name: 'WeightWatchers', category: 'Health & Nutrition', alts: [A.myfitnesspalFree, A.loseit, A.cronometerFree, A.fiton] },
  { name: 'Cronometer', category: 'Health & Nutrition', alts: [A.myfitnesspalFree, A.loseit, a('FatSecret', 0, 'https://www.fatsecret.com', 'Free calorie counter.')] },
  { name: 'Zoe', category: 'Health & Nutrition', alts: [A.cronometerFree, A.myfitnesspalFree, A.loseit] },
  { name: 'Hims', category: 'Health & Nutrition', alts: [A.goodrx, A.costplus, a('Local telehealth / PCP', 0, 'https://www.healthcare.gov', 'Often cheaper via your regular clinic.')] },
  { name: 'Hers', category: 'Health & Nutrition', alts: [A.goodrx, A.costplus, a('Nurx', 0, 'https://www.nurx.com', 'Cheaper online birth control / meds.'), a('Planned Parenthood', 0, 'https://www.plannedparenthood.org', 'Low-cost reproductive care.')] },

  // ── Education & Learning ──
  { name: 'Coursera Plus', category: 'Education & Learning', alts: [A.khan, A.freecodecamp, A.edxAudit, A.courseraAudit, A.mitocw] },
  { name: 'MasterClass', category: 'Education & Learning', alts: [A.youtube, A.domestika, A.khan, A.kanopy] },
  { name: 'Skillshare', category: 'Education & Learning', alts: [A.youtube, A.domestika, A.courseraAudit, A.freecodecamp] },
  { name: 'Udemy', category: 'Education & Learning', alts: [A.freecodecamp, A.youtube, A.courseraAudit, A.mslearn] },
  { name: 'LinkedIn Learning', category: 'Education & Learning', alts: [A.courseraAudit, A.freecodecamp, A.youtube, A.mslearn] },
  { name: 'Brilliant', category: 'Education & Learning', alts: [A.khan, A.mitocw, A.youtube, A.kaggle] },
  { name: 'DataCamp', category: 'Education & Learning', alts: [A.freecodecamp, A.kaggle, A.khan, A.courseraAudit] },
  { name: 'Codecademy', category: 'Education & Learning', alts: [A.freecodecamp, A.odin, A.khan, A.mslearn] },
  { name: 'Pluralsight', category: 'Education & Learning', alts: [A.freecodecamp, A.mslearn, A.youtube, A.courseraAudit] },
  { name: 'Khan Academy', category: 'Education & Learning', alts: [A.freecodecamp, A.mitocw, A.edxAudit, A.youtube] },

  // ── Language Learning ──
  { name: 'Duolingo', category: 'Language Learning', alts: [A.duolingoFree, A.anki, A.memriseFree, A.langtransfer] },
  { name: 'Babbel', category: 'Language Learning', alts: [A.duolingoFree, A.anki, A.langtransfer, A.busuuFree] },
  { name: 'Rosetta Stone', category: 'Language Learning', alts: [A.duolingoFree, A.langtransfer, A.anki, A.busuuFree] },
  { name: 'Busuu', category: 'Language Learning', alts: [A.duolingoFree, A.anki, A.memriseFree, A.langtransfer] },
  { name: 'Pimsleur', category: 'Language Learning', alts: [A.langtransfer, A.duolingoFree, a('Coffee Break Languages', 0, 'https://coffeebreaklanguages.com', 'Free language-learning podcasts.'), A.libby] },
  { name: 'Memrise', category: 'Language Learning', alts: [A.anki, A.duolingoFree, A.clozemaster, A.langtransfer] },

  // ── Writing & Utilities ──
  { name: 'Grammarly', category: 'Writing & Utilities', alts: [A.languagetool, A.quillbot, A.hemingway, A.msEditor, A.prowritingaidFree, A.gdocs] },
  { name: 'ProWritingAid', category: 'Writing & Utilities', alts: [A.languagetool, A.quillbot, A.hemingway, A.msEditor] },
  { name: 'QuillBot', category: 'Writing & Utilities', alts: [A.languagetool, A.hemingway, A.gdocs, A.msEditor] },
  { name: 'LanguageTool', category: 'Writing & Utilities', alts: [A.quillbot, A.msEditor, A.gdocs, A.hemingway] },
  { name: 'Otter.ai', category: 'Writing & Utilities', alts: [A.whisper, A.tldv, a('Google Recorder', 0, 'https://recorder.google.com', 'Free on-device transcription.'), a('Microsoft Word Dictate', 0, 'https://www.microsoft.com/microsoft-365/word', 'Free transcription in Word online.')] },

  // ── News & Magazines ──
  { name: 'The New York Times', category: 'News & Magazines', alts: [A.libraryNews, A.apnews, A.guardian, A.propublica, A.bbc] },
  { name: 'The Wall Street Journal', category: 'News & Magazines', alts: [A.libraryNews, A.yahooFinanceFree, A.apnews, A.reutersFree] },
  { name: 'The Washington Post', category: 'News & Magazines', alts: [A.libraryNews, A.apnews, A.guardian, A.bbc] },
  { name: 'The Economist', category: 'News & Magazines', alts: [A.libraryNews, A.reutersFree, A.apnews, A.bbc] },
  { name: 'Bloomberg', category: 'News & Magazines', alts: [A.yahooFinanceFree, A.reutersFree, A.stockanalysis, A.apnews] },
  { name: 'Financial Times', category: 'News & Magazines', alts: [A.libraryNews, A.reutersFree, A.yahooFinanceFree, A.bbc] },
  { name: 'The Athletic', category: 'News & Magazines', alts: [A.athleticFree, A.libraryNews, A.bbc] },
  { name: 'Apple News+', category: 'News & Magazines', alts: [A.libraryNews, A.apnews, A.guardian, A.bbc] },
  { name: 'Medium', category: 'News & Magazines', alts: [A.substackFree, A.bearblog, A.guardian, A.youtube] },
  { name: 'Reuters', category: 'News & Magazines', alts: [A.apnews, A.bbc, A.guardian, A.yahooFinanceFree] },

  // ── Food & Meal Delivery ──
  { name: 'HelloFresh', category: 'Food & Meal Delivery', alts: [A.everyplate, A.dinnerly, A.mealime, A.storePickup] },
  { name: 'Blue Apron', category: 'Food & Meal Delivery', alts: [A.everyplate, A.dinnerly, A.mealime, A.storePickup] },
  { name: 'Home Chef', category: 'Food & Meal Delivery', alts: [A.everyplate, A.dinnerly, A.mealime, A.storePickup] },
  { name: 'Factor', category: 'Food & Meal Delivery', alts: [A.everyplate, A.mealime, A.storePickup] },
  { name: 'EveryPlate', category: 'Food & Meal Delivery', alts: [A.dinnerly, A.mealime, A.storePickup] },
  { name: 'DoorDash DashPass', category: 'Food & Meal Delivery', alts: [a('Uber One', 9.99, 'https://www.uber.com/us/en/uber-one', 'Comparable delivery membership.'), A.storePickup, A.walmartPlusDelivery] },
  { name: 'Uber One', category: 'Food & Meal Delivery', alts: [a('DoorDash DashPass', 9.99, 'https://www.doordash.com/dashpass', 'Comparable delivery membership.'), A.storePickup, A.walmartPlusDelivery] },
  { name: 'Instacart+', category: 'Food & Meal Delivery', alts: [A.walmartPlusDelivery, A.storePickup, A.subscribeSave] },
  { name: 'Grubhub+', category: 'Food & Meal Delivery', alts: [a('DoorDash DashPass', 9.99, 'https://www.doordash.com/dashpass', 'Comparable membership.'), A.storePickup] },
  { name: 'Thrive Market', category: 'Food & Meal Delivery', alts: [A.subscribeSave, A.aldi, A.storePickup] },

  // ── Retail & Shopping ──
  { name: 'Amazon Prime', category: 'Retail & Shopping', alts: [A.walmartPlus, A.targetCircle, A.targetRedcard, A.subscribeSave] },
  { name: 'Costco', category: 'Retail & Shopping', alts: [A.samsclub, A.bjs, A.aldi] },
  { name: "Sam's Club", category: 'Retail & Shopping', alts: [A.bjs, A.aldi, a('Costco', 5.42, 'https://www.costco.com', 'Comparable warehouse club (~$65/yr).')] },
  { name: 'Walmart+', category: 'Retail & Shopping', alts: [A.targetCircle, A.targetRedcard, A.aldi] },
  { name: 'Target Circle 360', category: 'Retail & Shopping', alts: [A.walmartPlus, A.targetRedcard, A.subscribeSave] },
  { name: "BJ's Wholesale", category: 'Retail & Shopping', alts: [A.samsclub, A.aldi, a('Costco', 5.42, 'https://www.costco.com', 'Comparable warehouse club.')] },
  { name: 'REI Co-op', category: 'Retail & Shopping', alts: [a('Backcountry', 0, 'https://www.backcountry.com', 'No membership; frequent sales.'), a('Sierra', 0, 'https://www.sierra.com', 'Discount outdoor gear, no fee.')] },
  { name: 'Chewy Autoship', category: 'Retail & Shopping', alts: [A.subscribeSave, A.chewy, a('Walmart', 0, 'https://www.walmart.com', 'Cheaper pet staples, no membership.')] },

  // ── Dating ──
  { name: 'Tinder', category: 'Dating', alts: [A.facebookDating, A.pof, A.okcupidFree, A.hingeFree, A.badoo] },
  { name: 'Hinge', category: 'Dating', alts: [A.facebookDating, A.pof, A.okcupidFree, A.badoo] },
  { name: 'Bumble', category: 'Dating', alts: [A.facebookDating, A.pof, A.okcupidFree, A.hingeFree] },
  { name: 'Match', category: 'Dating', alts: [A.pof, A.okcupidFree, A.facebookDating, A.badoo] },
  { name: 'OkCupid', category: 'Dating', alts: [A.facebookDating, A.pof, A.badoo, A.hingeFree] },
  { name: 'Grindr', category: 'Dating', alts: [A.scruff, A.facebookDating, A.okcupidFree] },
  { name: 'Coffee Meets Bagel', category: 'Dating', alts: [A.hingeFree, A.facebookDating, A.pof, A.okcupidFree] },
  { name: 'eharmony', category: 'Dating', alts: [A.pof, A.okcupidFree, A.facebookDating, A.hingeFree] },

  // ── Social & Creator ──
  { name: 'YouTube Premium', category: 'Social & Creator', alts: [A.youtube, a('Brave Browser', 0, 'https://brave.com', 'Blocks YouTube ads + background play on mobile.'), A.spotifyFree] },
  { name: 'X Premium', category: 'Social & Creator', alts: [A.bluesky, A.mastodon, A.threads, a('X (Free)', 0, 'https://x.com', 'Post and read free without the checkmark.')] },
  { name: 'LinkedIn Premium', category: 'Social & Creator', alts: [A.linkedinFree, A.wellfound, a('Welcome to the Jungle', 0, 'https://www.welcometothejungle.com', 'Free job search + company insights.')] },
  { name: 'Snapchat+', category: 'Social & Creator', alts: [a('Snapchat (Free)', 0, 'https://www.snapchat.com', 'Core features remain free.'), A.threads, a('Instagram', 0, 'https://www.instagram.com', 'Free photo/video sharing and DMs.')] },
  { name: 'Discord Nitro', category: 'Social & Creator', alts: [A.discord, A.guilded, a('Revolt', 0, 'https://revolt.chat', 'Free, open-source Discord alternative.')] },
  { name: 'Reddit Premium', category: 'Social & Creator', alts: [a('Reddit (Free)', 0, 'https://www.reddit.com', 'Full access free; just has ads.'), A.mastodon] },
  { name: 'Telegram Premium', category: 'Social & Creator', alts: [a('Telegram (Free)', 0, 'https://telegram.org', 'Core messaging stays free.'), A.signal, a('WhatsApp', 0, 'https://www.whatsapp.com', 'Free messaging and calls.')] },
  { name: 'Twitch Turbo', category: 'Social & Creator', alts: [a('Twitch (Free)', 0, 'https://www.twitch.tv', 'Watch free; support channels individually.'), A.youtube, a('Kick', 0, 'https://kick.com', 'Free live-streaming platform.')] },
  { name: 'Patreon', category: 'Social & Creator', alts: [A.kofi, A.buymeacoffee, A.ghSponsors, A.substackFree] },
  { name: 'Substack', category: 'Social & Creator', alts: [A.beehiiv, A.ghostBlog, A.bearblog, A.kofi] },
  { name: 'OnlyFans', category: 'Social & Creator', alts: [a('Fansly', 0, 'https://fansly.com', 'Lower creator fees.'), A.kofi, A.buymeacoffee] },

  // ── Smart Home & Security ──
  { name: 'Ring Protect', category: 'Smart Home & Security', alts: [A.eufy, A.wyzeCam, A.reolink, A.tapo, A.blinkLocal] },
  { name: 'Nest Aware', category: 'Smart Home & Security', alts: [A.eufy, A.wyzeCam, A.reolink, A.tapo] },
  { name: 'Arlo Secure', category: 'Smart Home & Security', alts: [A.eufy, A.wyzeCam, A.reolink, A.blinkLocal] },
  { name: 'SimpliSafe', category: 'Smart Home & Security', alts: [A.ringAlarmCheap, A.wyzeCam, A.eufy, a('Abode (self-monitor)', 0, 'https://goabode.com', 'Self-monitored security, no required fee.')] },
  { name: 'Wyze Cam Plus', category: 'Smart Home & Security', alts: [A.eufy, A.reolink, A.tapo, A.blinkLocal] },
  { name: 'Blink Subscription', category: 'Smart Home & Security', alts: [A.blinkLocal, A.wyzeCam, A.eufy, A.reolink] },
  { name: 'ADT', category: 'Smart Home & Security', alts: [A.ringAlarmCheap, a('SimpliSafe', 21.99, 'https://simplisafe.com', 'Much cheaper monitoring, no contract.'), A.wyzeCam, A.eufy] },

  // ── Auto & Connected Car ──
  { name: 'Tesla Premium Connectivity', category: 'Auto & Connected Car', alts: [A.phoneHotspot, A.spotifyCar, A.googleMaps] },
  { name: 'OnStar', category: 'Auto & Connected Car', alts: [A.phoneHotspot, A.googleMaps, a('Life360', 0, 'https://www.life360.com', 'Free family location + crash alerts.')] },
  { name: 'FordPass', category: 'Auto & Connected Car', alts: [A.phoneHotspot, A.googleMaps, A.spotifyCar] },
  { name: 'BMW ConnectedDrive', category: 'Auto & Connected Car', alts: [A.phoneHotspot, A.googleMaps, A.spotifyCar] },

  // ── Telecom & Mobile ──
  { name: 'Verizon', category: 'Telecom & Mobile', alts: [A.visible, A.usmobile, A.mint, A.tello] },
  { name: 'AT&T', category: 'Telecom & Mobile', alts: [A.cricket, A.usmobile, A.mint, A.tello] },
  { name: 'T-Mobile', category: 'Telecom & Mobile', alts: [A.mint, A.usmobile, A.tello, A.visible] },
  { name: 'Mint Mobile', category: 'Telecom & Mobile', alts: [A.tello, A.usmobile, A.visible] },
  { name: 'Visible', category: 'Telecom & Mobile', alts: [A.usmobile, A.mint, A.tello] },
  { name: 'Google Fi', category: 'Telecom & Mobile', alts: [A.usmobile, A.mint, A.visible, A.tello] },
  { name: 'US Mobile', category: 'Telecom & Mobile', alts: [A.tello, A.mint, A.visible] },

  // ── Finance & Investing ──
  { name: 'YNAB', category: 'Finance & Investing', alts: [A.rocketMoneyFree, A.empower, A.everydollar, A.goodbudget, A.simplifi] },
  { name: 'Rocket Money', category: 'Finance & Investing', alts: [A.empower, A.walletHub, A.goodbudget, A.everydollar] },
  { name: 'Copilot Money', category: 'Finance & Investing', alts: [A.empower, A.rocketMoneyFree, A.simplifi, A.goodbudget] },
  { name: 'Monarch Money', category: 'Finance & Investing', alts: [A.empower, A.rocketMoneyFree, A.simplifi, A.goodbudget] },
  { name: 'Quicken Simplifi', category: 'Finance & Investing', alts: [A.empower, A.rocketMoneyFree, A.goodbudget, A.everydollar] },
  { name: 'Experian', category: 'Finance & Investing', alts: [A.creditKarma, A.walletHub, a('Chase Credit Journey', 0, 'https://www.chase.com/personal/credit-cards/credit-journey', 'Free credit score + monitoring, no account needed.')] },
  { name: 'Robinhood Gold', category: 'Finance & Investing', alts: [A.fidelity, A.webull, a('Charles Schwab', 0, 'https://www.schwab.com', 'Free trades + strong research.'), a('Public', 0, 'https://public.com', 'Free investing app.')] },
  { name: 'TradingView', category: 'Finance & Investing', alts: [A.finviz, A.stockanalysis, A.yahooFinance] },
  { name: 'Morningstar', category: 'Finance & Investing', alts: [A.finviz, A.stockanalysis, A.yahooFinance, A.simplywallst] },
  { name: 'Seeking Alpha', category: 'Finance & Investing', alts: [A.finviz, A.stockanalysis, A.yahooFinance, A.zacks] },
  { name: 'The Motley Fool', category: 'Finance & Investing', alts: [A.zacks, A.finviz, A.stockanalysis, A.yahooFinance] },
  { name: 'Yahoo Finance Plus', category: 'Finance & Investing', alts: [A.finviz, A.stockanalysis, A.yahooFinance, A.simplywallst] },

  // ── Subscription Boxes ──
  { name: 'Ipsy', category: 'Subscription Boxes', alts: [A.boxycharm, A.sephoraSample, a('Allure Beauty Box', 23, 'https://beautybox.allure.com', 'Curated deluxe/full-size beauty.')] },
  { name: 'FabFitFun', category: 'Subscription Boxes', alts: [a('Birchbox', 17, 'https://www.birchbox.com', 'Cheaper beauty sampling box.'), A.boxycharm, A.sephoraSample] },
  { name: 'Birchbox', category: 'Subscription Boxes', alts: [a('Ipsy', 14, 'https://www.ipsy.com', 'Cheaper monthly beauty bag.'), A.sephoraSample, A.boxycharm] },
  { name: 'BarkBox', category: 'Subscription Boxes', alts: [A.chewy, a('Super Chewer', 29, 'https://www.superchewer.com', 'Compare to buying durable toys retail.'), A.subscribeSave] },
  { name: 'Dollar Shave Club', category: 'Subscription Boxes', alts: [A.harrys, A.retailRazors, A.subscribeSave] },
  { name: 'Stitch Fix', category: 'Subscription Boxes', alts: [a('Amazon Try Before You Buy', 0, 'https://www.amazon.com', 'Free try-on with Prime; no styling fee.'), a('Thrift / outlet shopping', 0, 'https://www.google.com', 'Far cheaper wardrobe refresh.')] },
  { name: 'Book of the Month', category: 'Subscription Boxes', alts: [A.bookLibrary, A.kindleUnlimited, A.hoopla] },
  { name: 'KiwiCo', category: 'Subscription Boxes', alts: [A.kiwicoFree, a('Local library programs', 0, 'https://www.usa.gov/libraries-and-archives', 'Free kids’ STEM/maker activities.')] },
];

async function main() {
  console.log(`Seeding ${SEED.length} services (curated, zero API)…\n`);
  let ok = 0, alts = 0;
  for (const s of SEED) {
    const key = normalizeKey(s.name, s.category);
    const clean = s.alts.filter(Boolean) as Alt[];
    const { error } = await supabase.from('alternatives_catalogue').upsert({
      service_key: key, service_name: s.name, category: s.category,
      raw_payload: clean, payload: clean, quality_score: 90, status: 'active',
      refreshed_at: new Date().toISOString(), resolved_at: new Date().toISOString(),
    }, { onConflict: 'service_key' });
    if (error) { console.log(`${s.name.padEnd(26)} ERROR: ${error.message}`); continue; }
    await reresolve(key, s.name, clean);
    ok++; alts += clean.length;
  }
  console.log(`Done. ${ok}/${SEED.length} services seeded, ${alts} alternatives total.`);
}
main().catch((e) => { console.error(e?.message ?? e); process.exit(1); });
