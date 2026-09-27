import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import {
  reresolve, getFeedbackMap,
  getGlobalBlocklist, getGlobalPromotions,
} from '../lib/catalogue';
import { Alt } from '../lib/alternatives-gen';

const router = Router();
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// ── Auth: a shared admin token in the `x-admin-token` header. If ADMIN_TOKEN is
// unset the whole surface is disabled (503) so it can never be left open in prod.
function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!ADMIN_TOKEN) return res.status(503).json({ error: 'Admin dashboard is disabled. Set ADMIN_TOKEN on the server to enable it.' });
  const token = req.header('x-admin-token') ?? '';
  if (!token || !timingSafeEqual(token, ADMIN_TOKEN)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
router.use(requireAdmin);

// A quick auth ping the dashboard uses to validate a saved token.
router.get('/ping', (_req, res) => res.json({ ok: true }));

// ── Helpers ──
const nAlts = (v: unknown) => (Array.isArray(v) ? v.length : 0);

/** Coerce arbitrary JSON into a clean Alt[]; drops entries with no name. */
function sanitizeAlts(input: unknown): Alt[] {
  if (!Array.isArray(input)) return [];
  const out: Alt[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    if (!name) continue;
    const priceRaw = r.monthly_price;
    const monthly_price =
      priceRaw === null || priceRaw === undefined || priceRaw === ''
        ? null
        : Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : null;
    out.push({
      name,
      description: typeof r.description === 'string' ? r.description : '',
      monthly_price,
      currency: typeof r.currency === 'string' && r.currency ? r.currency : 'USD',
      website: typeof r.website === 'string' && r.website ? r.website : null,
    });
  }
  return out;
}

// ── Stats: headline numbers for the top of the dashboard ──
router.get('/stats', async (_req, res) => {
  const { data, error } = await supabase
    .from('alternatives_catalogue')
    .select('category, status, quality_score, request_count, payload, raw_payload');
  if (error) return res.status(500).json({ error: error.message });
  const rows = (data ?? []) as any[];

  let totalAlts = 0, needsReview = 0, thin = 0, emptyServed = 0, requests = 0;
  const byCategory = new Map<string, { services: number; alts: number }>();
  const byStatus = new Map<string, number>();
  let qSum = 0, qN = 0;
  for (const r of rows) {
    const served = nAlts(r.payload);
    totalAlts += served;
    requests += r.request_count ?? 0;
    if (r.status === 'needs_review') needsReview++;
    if (served < 2) thin++;
    if (served === 0) emptyServed++;
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    const c = byCategory.get(r.category) ?? { services: 0, alts: 0 };
    c.services++; c.alts += served; byCategory.set(r.category, c);
    if (typeof r.quality_score === 'number') { qSum += r.quality_score; qN++; }
  }

  const [block, promote] = await Promise.all([getGlobalBlocklist(), getGlobalPromotions()]);
  const { count: feedbackCount } = await supabase
    .from('alternative_feedback').select('*', { count: 'exact', head: true });
  const { count: overrideCount } = await supabase
    .from('alternative_overrides').select('*', { count: 'exact', head: true });

  res.json({
    totalServices: rows.length,
    totalAlternatives: totalAlts,
    avgAlternatives: rows.length ? +(totalAlts / rows.length).toFixed(1) : 0,
    needsReview, thin, emptyServed,
    totalRequests: requests,
    avgQuality: qN ? Math.round(qSum / qN) : null,
    categories: byCategory.size,
    feedbackCount: feedbackCount ?? 0,
    overrideCount: overrideCount ?? 0,
    globalBlocklist: [...block],
    globalPromotions: [...promote],
    byStatus: Object.fromEntries(byStatus),
    byCategory: [...byCategory.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.services - a.services),
  });
});

// ── List / search / filter ──
router.get('/catalogue', async (req, res) => {
  const search = String(req.query.search ?? '').replace(/[(),*]/g, '').trim();
  const category = String(req.query.category ?? '').trim();
  const status = String(req.query.status ?? '').trim();
  const sort = String(req.query.sort ?? 'request_count');
  const order = String(req.query.order ?? 'desc') === 'asc' ? 'asc' : 'desc';
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const sortCol = ['request_count', 'quality_score', 'refreshed_at', 'service_name', 'resolved_at'].includes(sort)
    ? sort : 'request_count';

  let q = supabase
    .from('alternatives_catalogue')
    .select('service_key, service_name, category, status, quality_score, request_count, refreshed_at, resolved_at, payload, raw_payload', { count: 'exact' });
  if (search) q = q.or(`service_name.ilike.%${search}%,service_key.ilike.%${search}%`);
  if (category) q = q.eq('category', category);
  if (status) q = q.eq('status', status);
  q = q.order(sortCol, { ascending: order === 'asc', nullsFirst: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  const items = (data ?? []).map((r: any) => ({
    service_key: r.service_key, service_name: r.service_name, category: r.category,
    status: r.status, quality_score: r.quality_score, request_count: r.request_count,
    refreshed_at: r.refreshed_at, resolved_at: r.resolved_at,
    n_served: nAlts(r.payload), n_raw: nAlts(r.raw_payload),
  }));
  res.json({ total: count ?? items.length, limit, offset, items });
});

// Distinct categories, for the filter dropdown.
router.get('/categories', async (_req, res) => {
  const { data, error } = await supabase.from('alternatives_catalogue').select('category');
  if (error) return res.status(500).json({ error: error.message });
  const set = [...new Set((data ?? []).map((r: any) => r.category).filter(Boolean))].sort();
  res.json({ categories: set });
});

// ── One entry: raw + served payload + overrides + per-alt feedback ──
router.get('/catalogue/:key', async (req, res) => {
  const key = req.params.key;
  const { data, error } = await supabase
    .from('alternatives_catalogue').select('*').eq('service_key', key).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  // Fetch overrides WITH their id (the shared getOverrides helper omits it, but
  // the dashboard needs the id to delete a specific override).
  const [{ data: overrides }, fb] = await Promise.all([
    supabase.from('alternative_overrides')
      .select('id, alternative_name, action, patch')
      .eq('service_key', key)
      .order('created_at', { ascending: true }),
    getFeedbackMap((data as any).service_name),
  ]);
  res.json({
    ...data,
    overrides: overrides ?? [],
    feedback: Object.fromEntries([...fb.entries()].map(([k, v]) => [k, v])),
  });
});

// ── Edit an entry (quality/status/category/raw list), then recompute payload ──
router.patch('/catalogue/:key', async (req, res) => {
  const key = req.params.key;
  const { data: existing } = await supabase
    .from('alternatives_catalogue').select('service_name, raw_payload').eq('service_key', key).maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const patch: Record<string, unknown> = {};
  if ('quality_score' in req.body) {
    const v = req.body.quality_score;
    patch.quality_score = v === null || v === '' ? null : Math.max(0, Math.min(100, Number(v)));
  }
  if ('status' in req.body && ['active', 'needs_review', 'disabled'].includes(req.body.status)) patch.status = req.body.status;
  if ('category' in req.body && typeof req.body.category === 'string') patch.category = req.body.category;
  let raw: Alt[] | null = null;
  if ('raw_payload' in req.body) {
    raw = sanitizeAlts(req.body.raw_payload);
    patch.raw_payload = raw;
    patch.refreshed_at = new Date().toISOString();
  }
  if (Object.keys(patch).length) {
    const { error } = await supabase.from('alternatives_catalogue').update(patch).eq('service_key', key);
    if (error) return res.status(500).json({ error: error.message });
  }

  // Recompute the served payload from the (possibly new) raw list + live signals,
  // unless the admin explicitly forced a status (then respect it).
  const rawList = raw ?? ((existing as any).raw_payload as Alt[]);
  const [block, promote] = await Promise.all([getGlobalBlocklist(), getGlobalPromotions()]);
  const payload = await reresolve(key, (existing as any).service_name, rawList, block, promote);
  if (patch.status) await supabase.from('alternatives_catalogue').update({ status: patch.status }).eq('service_key', key);

  const { data: updated } = await supabase.from('alternatives_catalogue').select('*').eq('service_key', key).maybeSingle();
  res.json({ ok: true, servedCount: payload.length, entry: updated });
});

// ── Recompute payload from current raw + signals (no edits) ──
router.post('/catalogue/:key/reresolve', async (req, res) => {
  const key = req.params.key;
  const { data: row } = await supabase
    .from('alternatives_catalogue').select('service_name, raw_payload').eq('service_key', key).maybeSingle();
  if (!row) return res.status(404).json({ error: 'Not found' });
  const [block, promote] = await Promise.all([getGlobalBlocklist(), getGlobalPromotions()]);
  const payload = await reresolve(key, (row as any).service_name, (row as any).raw_payload as Alt[], block, promote);
  res.json({ ok: true, servedCount: payload.length, payload });
});

// ── Delete an entry entirely ──
router.delete('/catalogue/:key', async (req, res) => {
  const key = req.params.key;
  const { error } = await supabase.from('alternatives_catalogue').delete().eq('service_key', key);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── Owner overrides: the highest-priority curation lever ──
router.post('/catalogue/:key/overrides', async (req, res) => {
  const key = req.params.key;
  const action = req.body.action;
  const alternative_name = typeof req.body.alternative_name === 'string' ? req.body.alternative_name.trim() : '';
  if (!['pin', 'block', 'edit'].includes(action)) return res.status(400).json({ error: 'action must be pin, block or edit' });
  if (!alternative_name) return res.status(400).json({ error: 'alternative_name required' });
  const patch = (req.body.patch && typeof req.body.patch === 'object') ? req.body.patch : {};

  const { data: row } = await supabase
    .from('alternatives_catalogue').select('service_name, raw_payload').eq('service_key', key).maybeSingle();
  if (!row) return res.status(404).json({ error: 'Not found' });

  const { error } = await supabase.from('alternative_overrides')
    .upsert({ service_key: key, alternative_name, action, patch }, { onConflict: 'service_key,alternative_name,action' });
  if (error) return res.status(500).json({ error: error.message });

  const [block, promote] = await Promise.all([getGlobalBlocklist(), getGlobalPromotions()]);
  const payload = await reresolve(key, (row as any).service_name, (row as any).raw_payload as Alt[], block, promote);
  res.json({ ok: true, servedCount: payload.length });
});

router.delete('/catalogue/:key/overrides/:id', async (req, res) => {
  const key = req.params.key;
  const { error } = await supabase.from('alternative_overrides').delete().eq('id', req.params.id).eq('service_key', key);
  if (error) return res.status(500).json({ error: error.message });
  const { data: row } = await supabase
    .from('alternatives_catalogue').select('service_name, raw_payload').eq('service_key', key).maybeSingle();
  if (row) {
    const [block, promote] = await Promise.all([getGlobalBlocklist(), getGlobalPromotions()]);
    await reresolve(key, (row as any).service_name, (row as any).raw_payload as Alt[], block, promote);
  }
  res.json({ ok: true });
});

export default router;
