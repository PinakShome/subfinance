/**
 * Zero-API catalogue seed. Loads a hand-curated dataset — researched and price-
 * verified via web search (Sep 2026) — straight into alternatives_catalogue.
 * Unlike build:catalog it makes NO Anthropic API calls, so it costs nothing to
 * run and gives the live app an instant, high-quality baseline. The nightly
 * flywheel later re-verifies prices with a single grounded call per stale entry.
 *
 * Run from server/:  railway run --service jubilant-consideration npm run seed:catalog
 */
import 'dotenv/config';
import { supabase } from '../lib/supabase';
import { normalizeKey, reresolve } from '../lib/catalogue';
import { Alt } from '../lib/alternatives-gen';

interface Seed { name: string; category: string; alts: Alt[]; }
const a = (name: string, monthly_price: number | null, website: string, description: string): Alt =>
  ({ name, monthly_price, website, currency: 'USD', description });

const SEED: Seed[] = [
  { name: 'Netflix', category: 'Streaming Video', alts: [
    a('Tubi', 0, 'https://tubitv.com', 'Completely free, ad-supported movies and TV; no originals.'),
    a('Pluto TV', 0, 'https://pluto.tv', 'Free live channels and on-demand from Paramount; ad-supported.'),
    a('The Roku Channel', 0, 'https://therokuchannel.roku.com', 'Free ad-supported movies, shows and live TV; no Roku device needed.'),
    a('Peacock', 7.99, 'https://www.peacocktv.com', 'NBCUniversal shows, movies and live sport; cheapest tier has ads.'),
    a('Paramount+', 7.99, 'https://www.paramountplus.com', 'CBS/Paramount library and originals; Essential tier includes ads.'),
    a('Apple TV+', 9.99, 'https://tv.apple.com', 'High-budget originals only (no back-catalog) at half Netflix’s price.'),
    a('Crunchyroll', 7.99, 'https://www.crunchyroll.com', 'Huge anime catalog; not a general-entertainment replacement.'),
  ]},
  { name: 'Disney+', category: 'Streaming Video', alts: [
    a('Tubi', 0, 'https://tubitv.com', 'Free, ad-supported movies and TV incl. family titles.'),
    a('Pluto TV', 0, 'https://pluto.tv', 'Free live + on-demand with kids channels; ad-supported.'),
    a('The Roku Channel', 0, 'https://therokuchannel.roku.com', 'Free ad-supported streaming; broad family catalog.'),
    a('Peacock', 7.99, 'https://www.peacocktv.com', 'Family films plus NBCU catalog; cheaper ad tier.'),
    a('Hoopla', 0, 'https://www.hoopladigital.com', 'Free with a library card; monthly borrow limit.'),
  ]},
  { name: 'Hulu', category: 'Streaming Video', alts: [
    a('Tubi', 0, 'https://tubitv.com', 'Free, ad-supported on-demand movies and TV.'),
    a('Pluto TV', 0, 'https://pluto.tv', 'Free ad-supported live TV and on-demand.'),
    a('Peacock', 7.99, 'https://www.peacocktv.com', 'Next-day network TV like Hulu, plus NBC sports; ad tier.'),
    a('Paramount+', 7.99, 'https://www.paramountplus.com', 'Current CBS shows next day; cheaper than Hulu.'),
    a('Xumo Play', 0, 'https://play.xumo.com', 'Free live + on-demand, ad-supported.'),
  ]},
  { name: 'Max', category: 'Streaming Video', alts: [
    a('Tubi', 0, 'https://tubitv.com', 'Free, ad-supported films and TV; no HBO originals.'),
    a('Pluto TV', 0, 'https://pluto.tv', 'Free live + on-demand; ad-supported.'),
    a('Peacock', 7.99, 'https://www.peacocktv.com', 'Movies, shows and live sport; cheapest tier has ads.'),
    a('Paramount+', 7.99, 'https://www.paramountplus.com', 'Large film/TV library with Showtime add-on; ad tier.'),
    a('Apple TV+', 9.99, 'https://tv.apple.com', 'Prestige originals at a lower price; no back-catalog.'),
  ]},
  { name: 'YouTube Premium', category: 'Social & Creator', alts: [
    a('YouTube', 0, 'https://www.youtube.com', 'The same videos free — you just watch ads and lose background play.'),
    a('Brave Browser', 0, 'https://brave.com', 'Free browser that blocks YouTube ads and allows background play on mobile.'),
    a('Spotify Free', 0, 'https://www.spotify.com', 'Free ad-supported music replaces the YouTube Music half.'),
  ]},
  { name: 'Amazon Prime', category: 'Retail & Shopping', alts: [
    a('Walmart+', 12.95, 'https://www.walmart.com/plus', 'Cheaper bundle: free shipping + Paramount+ included; no Prime Video.'),
    a('Tubi', 0, 'https://tubitv.com', 'Free, ad-supported streaming (covers the Prime Video side).'),
    a('Pluto TV', 0, 'https://pluto.tv', 'Free live + on-demand video; ad-supported.'),
    a('Peacock', 7.99, 'https://www.peacocktv.com', 'Cheap streaming with live sport if you only want the video part.'),
  ]},
  { name: 'Spotify', category: 'Music Streaming', alts: [
    a('Spotify Free', 0, 'https://www.spotify.com', 'Same catalog, ad-supported, with playback limits on mobile.'),
    a('Apple Music', 10.99, 'https://music.apple.com', 'Cheaper, with lossless and spatial audio included; no free tier.'),
    a('Amazon Music', 11.99, 'https://music.amazon.com', 'Cheaper than Spotify, especially bundled with Prime.'),
    a('YouTube Music', 11.99, 'https://music.youtube.com', 'Includes music videos and live tracks; weaker curated playlists.'),
    a('Deezer', 11.99, 'https://www.deezer.com', 'Similar catalog with HiFi; smaller podcast selection.'),
    a('Pandora', 0, 'https://www.pandora.com', 'Free radio-style streaming; less on-demand control.'),
  ]},
  { name: 'Apple Music', category: 'Music Streaming', alts: [
    a('Spotify Free', 0, 'https://www.spotify.com', 'Free ad-supported streaming; best-in-class playlists.'),
    a('Amazon Music', 0, 'https://music.amazon.com', 'A large catalog is included free with Amazon Prime.'),
    a('Pandora', 0, 'https://www.pandora.com', 'Free personalized radio; limited on-demand.'),
    a('YouTube Music', 0, 'https://music.youtube.com', 'Free ad-supported tier; screen-on required on mobile.'),
    a('Deezer', 0, 'https://www.deezer.com', 'Free ad-supported tier with a big catalog.'),
    a('SoundCloud', 0, 'https://soundcloud.com', 'Free tier; strong for indie/underground, weaker mainstream.'),
  ]},
  { name: 'iCloud+', category: 'Cloud Storage', alts: [
    a('Google One', 9.99, 'https://one.google.com', 'Same 2TB price, works across every platform; cheaper annually.'),
    a('pCloud', 4.99, 'https://www.pcloud.com', '500GB for $5/mo, or a one-time lifetime plan that ends recurring fees.'),
    a('Proton Drive', 9.99, 'https://proton.me/drive', 'End-to-end encrypted at a similar price; stronger privacy.'),
    a('Sync.com', 8.00, 'https://www.sync.com', 'Zero-knowledge encrypted 2TB; among the cheapest annually.'),
    a('OneDrive', 1.99, 'https://www.microsoft.com/microsoft-365/onedrive', '100GB for $1.99/mo, or 1TB bundled with Microsoft 365.'),
    a('Mega', 0, 'https://mega.io', '20GB free, end-to-end encrypted; competitive paid tiers.'),
  ]},
  { name: 'Dropbox', category: 'Cloud Storage', alts: [
    a('Google One', 9.99, 'https://one.google.com', 'Cheaper 2TB with tight Google app integration.'),
    a('pCloud', 4.99, 'https://www.pcloud.com', 'Cheaper tiers plus a one-time lifetime option.'),
    a('Sync.com', 8.00, 'https://www.sync.com', 'Zero-knowledge encrypted 2TB, cheaper than Dropbox.'),
    a('Proton Drive', 9.99, 'https://proton.me/drive', 'Encrypted storage; privacy-first.'),
    a('Icedrive', 4.17, 'https://icedrive.net', 'Cheap encrypted storage; smaller ecosystem.'),
    a('Mega', 0, 'https://mega.io', '20GB free with end-to-end encryption.'),
  ]},
  { name: 'ChatGPT Plus', category: 'AI Tools', alts: [
    a('Claude', 0, 'https://claude.ai', 'Free access to a highly capable model; usage limits.'),
    a('Google Gemini', 0, 'https://gemini.google.com', 'Strong free tier; Pro is $19.99 if you need more.'),
    a('Microsoft Copilot', 0, 'https://copilot.microsoft.com', 'Free GPT-class chat with web grounding.'),
    a('Perplexity', 0, 'https://www.perplexity.ai', 'Free tier gives sourced, cited answers for research.'),
    a('DeepSeek', 0, 'https://www.deepseek.com', 'Free, capable chat and reasoning model.'),
    a('ChatGPT Go', 8, 'https://chatgpt.com', 'OpenAI’s cheaper paid tier at $8/mo.'),
  ]},
  { name: 'GitHub Copilot', category: 'Developer & Cloud', alts: [
    a('Windsurf (Codeium)', 0, 'https://windsurf.com', 'Free AI autocomplete + chat with a generous personal tier.'),
    a('Continue.dev', 0, 'https://www.continue.dev', 'Open-source, bring-your-own-model; $0 forever.'),
    a('Amazon Q Developer', 0, 'https://aws.amazon.com/q/developer', 'Generous free tier for individuals.'),
    a('Tabnine', 0, 'https://www.tabnine.com', 'Free basic completions; privacy-focused, paid for teams.'),
    a('Cline', 0, 'https://cline.bot', 'Open-source VS Code agent; pay only your own LLM API.'),
    a('Supermaven', 0, 'https://supermaven.com', 'Very fast free autocomplete; optional paid Pro.'),
  ]},
  { name: 'Vercel Pro', category: 'Developer & Cloud', alts: [
    a('Cloudflare Pages', 0, 'https://pages.cloudflare.com', 'Free tier with unlimited bandwidth; Pro $20 for more builds.'),
    a('Netlify', 0, 'https://www.netlify.com', 'Free Starter tier; Pro $19 with more bandwidth and features.'),
    a('Render', 0, 'https://render.com', 'Free static hosting; usage-based for dynamic services.'),
    a('Railway', 5, 'https://railway.com', 'Usage-based from $5/mo; great for full-stack apps + databases.'),
    a('GitHub Pages', 0, 'https://pages.github.com', 'Free static hosting from a repo; static sites only.'),
    a('Fly.io', 0, 'https://fly.io', 'Free allowances; pay-as-you-go global app hosting.'),
  ]},
  { name: 'AWS', category: 'Developer & Cloud', alts: [
    a('DigitalOcean', 4, 'https://www.digitalocean.com', 'Predictable pricing; Droplets from $4/mo, far simpler than AWS.'),
    a('Hetzner', 4.50, 'https://www.hetzner.com', '3–5× cheaper compute with generous included egress.'),
    a('Vultr', 2.50, 'https://www.vultr.com', 'Instances from $2.50/mo across 30+ locations.'),
    a('Linode (Akamai)', 5, 'https://www.linode.com', 'Simple VPS pricing from $5/mo with US availability.'),
    a('Fly.io', 0, 'https://fly.io', 'Run apps close to users; pay-as-you-go, free allowances.'),
    a('Cloudflare', 0, 'https://www.cloudflare.com', 'Free tier for Workers/Pages/R2; egress-free object storage.'),
  ]},
  { name: 'Notion', category: 'Productivity & Office', alts: [
    a('Obsidian', 0, 'https://obsidian.md', 'Free local Markdown files you own; optional $4/mo sync.'),
    a('AppFlowy', 0, 'https://appflowy.io', 'Open-source Notion clone; local-first and free.'),
    a('Anytype', 0, 'https://anytype.io', 'Free, end-to-end encrypted, local-first workspace.'),
    a('Logseq', 0, 'https://logseq.com', 'Free outliner for networked notes.'),
    a('Coda', 0, 'https://coda.io', 'Free tier for docs + tables; paid only for large teams.'),
    a('Google Docs', 0, 'https://docs.google.com', 'Free real-time docs; less database/wiki structure.'),
  ]},
  { name: 'Linear', category: 'Productivity & Office', alts: [
    a('Jira', 0, 'https://www.atlassian.com/software/jira', 'Free for up to 10 users; more configurable, heavier.'),
    a('GitHub Projects', 0, 'https://github.com/features/issues', 'Free issue tracking tied to your repos.'),
    a('Plane', 0, 'https://plane.so', 'Open-source Linear-style tracker; free tier or self-host.'),
    a('Trello', 0, 'https://trello.com', 'Free Kanban boards; simpler, less engineering-focused.'),
    a('Shortcut', 0, 'https://www.shortcut.com', 'Free up to 10 users; sprints and milestones.'),
    a('ClickUp', 0, 'https://clickup.com', 'Generous free plan; very broad feature set.'),
  ]},
  { name: 'Figma', category: 'Design & Creative', alts: [
    a('Penpot', 0, 'https://penpot.app', 'Open-source, unlimited collaborators, self-hostable; free.'),
    a('Lunacy', 0, 'https://icons8.com/lunacy', 'Free native design app; opens .sketch, built-in assets.'),
    a('Framer', 0, 'https://www.framer.com', 'Free tier to design and publish sites.'),
    a('Excalidraw', 0, 'https://excalidraw.com', 'Free whiteboarding/wireframing; not full UI design.'),
    a('Canva', 0, 'https://www.canva.com', 'Free tier for simpler design; less precise UI tooling.'),
    a('Photopea', 0, 'https://www.photopea.com', 'Free browser Photoshop-like editor for image work.'),
  ]},
  { name: 'Canva', category: 'Design & Creative', alts: [
    a('Canva Free', 0, 'https://www.canva.com', 'The free tier covers most casual design needs.'),
    a('VistaCreate', 0, 'https://create.vista.com', 'Closest Canva-style tool; generous free tier, paid ~$10.'),
    a('Adobe Express', 0, 'https://www.adobe.com/express', 'Free tier with Firefly AI; paid ~$9.99.'),
    a('Photopea', 0, 'https://www.photopea.com', 'Free browser image editor with PSD support.'),
    a('Krita', 0, 'https://krita.org', 'Free, open-source painting and illustration.'),
    a('Inkscape', 0, 'https://inkscape.org', 'Free, open-source vector graphics.'),
  ]},
  { name: 'Adobe Creative Cloud', category: 'Design & Creative', alts: [
    a('DaVinci Resolve', 0, 'https://www.blackmagicdesign.com/products/davinciresolve', 'Free pro-grade video editing and color (vs Premiere).'),
    a('GIMP', 0, 'https://www.gimp.org', 'Free photo editor (vs Photoshop).'),
    a('Krita', 0, 'https://krita.org', 'Free digital painting/illustration.'),
    a('Inkscape', 0, 'https://inkscape.org', 'Free vector graphics (vs Illustrator).'),
    a('Photopea', 0, 'https://www.photopea.com', 'Free browser Photoshop clone; opens PSD files.'),
    a('Blender', 0, 'https://www.blender.org', 'Free 3D creation plus a capable video editor.'),
  ]},
  { name: 'Microsoft 365', category: 'Productivity & Office', alts: [
    a('Google Docs', 0, 'https://docs.google.com', 'Free browser Docs/Sheets/Slides with real-time collaboration.'),
    a('LibreOffice', 0, 'https://www.libreoffice.org', 'Free, full desktop office suite you install and own.'),
    a('OnlyOffice', 0, 'https://www.onlyoffice.com', 'Free desktop suite; best .docx/.xlsx compatibility.'),
    a('WPS Office', 0, 'https://www.wps.com', 'Free tier with a familiar Office-like interface.'),
    a('Apple iWork', 0, 'https://www.apple.com/iwork', 'Free Pages/Numbers/Keynote on Apple devices.'),
    a('Zoho Workplace', 0, 'https://www.zoho.com/workplace', 'Free for personal use; full online office suite.'),
  ]},
  { name: 'Grammarly', category: 'Writing & Utilities', alts: [
    a('LanguageTool', 0, 'https://languagetool.org', 'Free grammar/style in 30+ languages; Premium ~$5/mo.'),
    a('QuillBot', 0, 'https://quillbot.com', 'Free unlimited grammar checker plus paraphraser.'),
    a('Hemingway Editor', 0, 'https://hemingwayapp.com', 'Free web app for readability; one-time $20 desktop.'),
    a('Microsoft Editor', 0, 'https://www.microsoft.com/microsoft-365/microsoft-editor', 'Free grammar/spelling in the browser and Word.'),
    a('ProWritingAid', 0, 'https://prowritingaid.com', 'Free tier (500 words) with deep style reports.'),
    a('Google Docs', 0, 'https://docs.google.com', 'Built-in free grammar and spelling suggestions.'),
  ]},
  { name: 'Audible', category: 'Books & Audiobooks', alts: [
    a('Libby', 0, 'https://libbyapp.com', 'Free audiobooks with a library card; may have holds.'),
    a('Hoopla', 0, 'https://www.hoopladigital.com', 'Free with a library card; monthly borrow limit.'),
    a('LibriVox', 0, 'https://librivox.org', 'Free public-domain audiobooks read by volunteers.'),
    a('Everand', 11.99, 'https://www.everand.com', 'Cheaper monthly; audiobooks + ebooks + magazines.'),
    a('Spotify', 11.99, 'https://www.spotify.com', '15 hrs/mo of audiobooks included with Premium.'),
    a('Google Play Books', 0, 'https://play.google.com/books', 'No subscription — buy only the audiobooks you want.'),
  ]},
  { name: 'Peloton', category: 'Fitness', alts: [
    a('Nike Training Club', 0, 'https://www.nike.com/ntc-app', 'Completely free strength, cardio and yoga workouts.'),
    a('FitOn', 0, 'https://fiton.com', 'Free guided classes; premium optional.'),
    a('Peloton App One', 0, 'https://www.onepeloton.com/app', 'Peloton’s own free tier; limited class access.'),
    a('Apple Fitness+', 9.99, 'https://www.apple.com/apple-fitness-plus', 'Cheaper studio-style classes; included in Apple One.'),
    a('Down Dog', 0, 'https://www.downdogapp.com', 'Free/cheap customizable yoga and HIIT.'),
    a('Strava', 0, 'https://www.strava.com', 'Free activity tracking; paid for advanced analytics.'),
  ]},
  { name: 'NordVPN', category: 'Security & Privacy', alts: [
    a('Proton VPN', 0, 'https://protonvpn.com', 'The only major free tier with unlimited data; open-source.'),
    a('Windscribe', 0, 'https://windscribe.com', 'Free 10GB/mo; flexible build-a-plan paid tiers.'),
    a('Surfshark', 2.49, 'https://surfshark.com', 'Cheap on 2-yr plans; unlimited device connections.'),
    a('Private Internet Access', 2.19, 'https://www.privateinternetaccess.com', 'Very cheap long-term; unlimited connections.'),
    a('Mullvad', 5, 'https://mullvad.net', 'Flat €5/mo, no account email; strong privacy.'),
    a('Cloudflare WARP', 0, 'https://one.one.one.one', 'Free fast privacy tunnel (not geo-spoofing).'),
  ]},
  { name: '1Password', category: 'Security & Privacy', alts: [
    a('Bitwarden', 0, 'https://bitwarden.com', 'Free unlimited passwords + device sync; Premium just $10/yr.'),
    a('Proton Pass', 0, 'https://proton.me/pass', 'Free unlimited logins/devices plus email aliases.'),
    a('KeePassXC', 0, 'https://keepassxc.org', 'Free, fully local/offline vault; no cloud.'),
    a('Apple Passwords', 0, 'https://support.apple.com/passwords', 'Free, built into Apple devices with iCloud sync.'),
    a('Google Password Manager', 0, 'https://passwords.google.com', 'Free, built into Chrome and Android.'),
  ]},
  { name: 'Xbox Game Pass', category: 'Gaming', alts: [
    a('PC Game Pass', 13.99, 'https://www.xbox.com/xbox-game-pass/pc-game-pass', 'Cheaper if you only play on PC.'),
    a('GeForce Now', 9.99, 'https://www.nvidia.com/geforce-now', 'Stream games you already own; no library included.'),
    a('Amazon Luna', 9.99, 'https://luna.amazon.com', 'Luna+ $9.99; a base library is free with Prime.'),
    a('PlayStation Plus', 9.99, 'https://www.playstation.com/ps-plus', 'Cheaper base tier; online play + monthly games.'),
    a('EA Play', 5.99, 'https://www.ea.com/ea-play', '$5.99/mo for EA’s catalog; narrower than Game Pass.'),
    a('Prime Gaming', 0, 'https://gaming.amazon.com', 'Free games each month with a Prime membership.'),
  ]},
];

async function main() {
  console.log(`Seeding ${SEED.length} services (curated, zero API)…\n`);
  let ok = 0, alts = 0;
  for (const s of SEED) {
    const key = normalizeKey(s.name, s.category);
    const { error } = await supabase.from('alternatives_catalogue').upsert({
      service_key: key, service_name: s.name, category: s.category,
      raw_payload: s.alts, payload: s.alts, quality_score: 90, status: 'active',
      refreshed_at: new Date().toISOString(), resolved_at: new Date().toISOString(),
    }, { onConflict: 'service_key' });
    if (error) { console.log(`${s.name.padEnd(24)} ERROR: ${error.message}`); continue; }
    await reresolve(key, s.name, s.alts); // bake in any existing feedback/overrides
    ok++; alts += s.alts.length;
    console.log(`${s.name.padEnd(24)} ${String(s.alts.length).padStart(2)} alts  [${key}]`);
  }
  console.log(`\nDone. ${ok}/${SEED.length} services seeded, ${alts} alternatives total.`);
}
main().catch((e) => { console.error(e?.message ?? e); process.exit(1); });
