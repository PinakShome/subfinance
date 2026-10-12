/**
 * Seed the App Review demo account (Guideline 2.1).
 *
 * Creates (or updates) one auth user and loads it with a realistic set of
 * sample subscriptions so every screen has content for the reviewer.
 * Idempotent: re-running wipes that user's subscriptions and reseeds.
 *
 *   cd server && railway run --service jubilant-consideration -- \
 *     ts-node --transpileOnly src/eval/seed-demo-account.ts <email> '<password>'
 *
 * Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment
 * (railway run injects them). The password is taken from argv, never
 * committed to the repo.
 */
import 'dotenv/config';
import { supabase } from '../lib/supabase';

type SeedSub = {
  name: string;
  category: string;
  cost: number;
  billing_cycle: 'monthly' | 'quarterly' | 'annual' | 'custom';
  renew_in_days: number;
  website_url?: string;
  notes?: string;
  is_trial?: boolean;
  trial_in_days?: number;
};

// A spread of categories, cycles, prices, plus one free service (no CTA
// expected) and one active trial, so the reviewer sees every state.
const SAMPLE: SeedSub[] = [
  { name: 'Netflix',               category: 'Streaming', cost: 15.49, billing_cycle: 'monthly', renew_in_days: 6,  website_url: 'https://www.netflix.com' },
  { name: 'Spotify',               category: 'Music',     cost: 11.99, billing_cycle: 'monthly', renew_in_days: 12, website_url: 'https://www.spotify.com' },
  { name: 'Adobe Creative Cloud',  category: 'Software',  cost: 59.99, billing_cycle: 'monthly', renew_in_days: 3,  website_url: 'https://www.adobe.com', notes: 'Photography + design plan' },
  { name: 'ChatGPT Plus',          category: 'Software',  cost: 20.00, billing_cycle: 'monthly', renew_in_days: 21, website_url: 'https://chat.openai.com' },
  { name: 'iCloud+',               category: 'Cloud',     cost: 2.99,  billing_cycle: 'monthly', renew_in_days: 9,  website_url: 'https://www.icloud.com' },
  { name: 'Disney+',               category: 'Streaming', cost: 139.99, billing_cycle: 'annual', renew_in_days: 140, website_url: 'https://www.disneyplus.com', notes: 'Annual plan' },
  { name: 'The New York Times',    category: 'News',      cost: 17.00, billing_cycle: 'monthly', renew_in_days: 18, website_url: 'https://www.nytimes.com' },
  { name: 'Notion',                category: 'Software',  cost: 0,     billing_cycle: 'monthly', renew_in_days: 30, website_url: 'https://www.notion.so', notes: 'Free plan' },
  { name: 'YouTube Premium',       category: 'Streaming', cost: 13.99, billing_cycle: 'monthly', renew_in_days: 5,  website_url: 'https://www.youtube.com/premium', is_trial: true, trial_in_days: 5, notes: 'Free trial' },
];

const isoDate = (daysFromNow: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

async function findUserByEmail(email: string): Promise<string | null> {
  // No getUserByEmail in the admin SDK — page through listUsers.
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) break; // last page
  }
  return null;
}

async function ensureUser(email: string, password: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // reviewer can sign in without an email round-trip
  });
  if (!error && data.user) {
    console.log(`Created demo user ${email}`);
    return data.user.id;
  }
  // Already exists — find it and reset the password so the given one works.
  const existingId = await findUserByEmail(email);
  if (!existingId) throw error ?? new Error('createUser failed and user not found');
  const upd = await supabase.auth.admin.updateUserById(existingId, {
    password,
    email_confirm: true,
  });
  if (upd.error) throw upd.error;
  console.log(`Demo user ${email} already existed — password reset.`);
  return existingId;
}

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: seed-demo-account.ts <email> '<password>'");
    process.exit(2);
  }

  const userId = await ensureUser(email, password);

  // Map category name -> id.
  const { data: cats, error: catErr } = await supabase.from('categories').select('id, name');
  if (catErr) throw catErr;
  const catId = new Map((cats ?? []).map((c: { id: string; name: string }) => [c.name, c.id]));

  // Idempotent: clear this user's subscriptions before reseeding.
  const del = await supabase.from('subscriptions').delete().eq('user_id', userId);
  if (del.error) throw del.error;

  const rows = SAMPLE.map((s) => ({
    user_id: userId,
    name: s.name,
    category_id: catId.get(s.category) ?? null,
    cost: s.cost,
    currency: 'USD',
    billing_cycle: s.billing_cycle,
    next_renewal: isoDate(s.renew_in_days),
    started_on: isoDate(-90),
    notes: s.notes ?? null,
    is_trial: s.is_trial ?? false,
    trial_ends_on: s.is_trial ? isoDate(s.trial_in_days ?? 7) : null,
    is_active: true,
    website_url: s.website_url ?? null,
  }));

  const ins = await supabase.from('subscriptions').insert(rows);
  if (ins.error) throw ins.error;

  console.log(`Seeded ${rows.length} subscriptions for ${email}.`);
  console.log('Demo account is ready for App Review.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
