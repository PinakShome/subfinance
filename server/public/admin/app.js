'use strict';

// ── State ──
const TKEY = 'sf_admin_token';
let token = '';
const state = { search: '', category: '', status: '', sort: 'request_count', order: 'desc', offset: 0, limit: 50, total: 0, currentKey: null };

// ── DOM helpers ──
const $ = (id) => document.getElementById(id);
function el(tag, props, kids) {
  const n = document.createElement(tag);
  if (props) for (const k in props) {
    if (k === 'class') n.className = props[k];
    else if (k === 'text') n.textContent = props[k];
    else if (k.startsWith('on') && typeof props[k] === 'function') n.addEventListener(k.slice(2), props[k]);
    else if (props[k] !== undefined && props[k] !== null) n.setAttribute(k, props[k]);
  }
  if (kids) (Array.isArray(kids) ? kids : [kids]).forEach((c) => c != null && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return n;
}
function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
let toastTimer;
function toast(msg, kind) {
  const t = $('toast'); t.textContent = msg; t.className = 'toast ' + (kind || ''); t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
function money(p) { return p === null || p === undefined ? '—' : (p === 0 ? 'Free' : '$' + p + '/mo'); }
function fmtDate(s) { if (!s) return '—'; const d = new Date(s); return d.toLocaleDateString() ; }

// ── API ──
async function api(path, opts) {
  const o = opts || {};
  o.headers = Object.assign({ 'x-admin-token': token }, o.headers || {});
  if (o.body && typeof o.body !== 'string') { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(o.body); }
  const r = await fetch('/api/admin' + path, o);
  if (r.status === 401 || r.status === 503) { const j = await r.json().catch(() => ({})); showGate(j.error || 'Unauthorized'); throw new Error(j.error || 'Unauthorized'); }
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || ('HTTP ' + r.status)); }
  return r.status === 204 ? null : r.json();
}

// ── Gate ──
function showGate(err) {
  $('app').hidden = true; $('gate').hidden = false;
  const e = $('gate-error'); if (err) { e.textContent = err; e.hidden = false; } else e.hidden = true;
}
function hideGate() { $('gate').hidden = true; $('app').hidden = false; }

$('gate-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  token = $('gate-token').value.trim();
  if (!token) return;
  try { await api('/ping'); localStorage.setItem(TKEY, token); hideGate(); init(); }
  catch (e) { /* showGate already fired */ }
});
$('signout-btn').addEventListener('click', () => { localStorage.removeItem(TKEY); token = ''; showGate(); });
$('refresh-btn').addEventListener('click', () => init());

// ── Stats + overview ──
function statCard(v, l, cls) { return el('div', { class: 'stat ' + (cls || '') }, [el('div', { class: 'v', text: String(v) }), el('div', { class: 'l', text: l })]); }
async function loadStats() {
  const s = await api('/stats');
  const wrap = $('stats'); clear(wrap);
  wrap.appendChild(statCard(s.totalServices, 'services'));
  wrap.appendChild(statCard(s.totalAlternatives, 'alternatives'));
  wrap.appendChild(statCard(s.avgAlternatives, 'avg / service'));
  wrap.appendChild(statCard(s.needsReview, 'needs review', s.needsReview ? 'warn' : ''));
  wrap.appendChild(statCard(s.thin, 'thin (<2)', s.thin ? 'bad' : ''));
  wrap.appendChild(statCard(s.totalRequests, 'total requests'));
  wrap.appendChild(statCard(s.avgQuality == null ? '—' : s.avgQuality, 'avg quality'));
  wrap.appendChild(statCard(s.feedbackCount, 'feedback votes'));
  wrap.appendChild(statCard(s.overrideCount, 'owner overrides'));

  const p = $('sig-promote'); clear(p);
  (s.globalPromotions.length ? s.globalPromotions : ['—']).forEach((n) => p.appendChild(el('span', { class: 'chip', text: n })));
  const b = $('sig-block'); clear(b);
  (s.globalBlocklist.length ? s.globalBlocklist : ['—']).forEach((n) => b.appendChild(el('span', { class: 'chip', text: n })));

  const cb = $('cat-bars'); clear(cb);
  const top = s.byCategory.slice(0, 8);
  const max = Math.max(1, ...top.map((c) => c.services));
  top.forEach((c) => {
    cb.appendChild(el('div', { class: 'cat-row' }, [
      el('span', { text: c.category }),
      el('span', { class: 'bar' }, el('span', { style: 'width:' + Math.round((c.services / max) * 100) + '%' })),
      el('span', { class: 'muted', text: c.services + ' · ' + c.alts + ' alts' }),
    ]));
  });
}

async function loadCategories() {
  const { categories } = await api('/categories');
  const sel = $('f-category'); const cur = sel.value;
  clear(sel); sel.appendChild(el('option', { value: '', text: 'All categories' }));
  categories.forEach((c) => sel.appendChild(el('option', { value: c, text: c })));
  sel.value = cur;
}

// ── List ──
async function loadList() {
  const qs = new URLSearchParams({ search: state.search, category: state.category, status: state.status, sort: state.sort, order: state.order, limit: state.limit, offset: state.offset });
  const data = await api('/catalogue?' + qs.toString());
  state.total = data.total;
  const list = $('list'); clear(list);
  if (!data.items.length) list.appendChild(el('div', { class: 'row', text: 'No matches.' }));
  data.items.forEach((it) => {
    const thin = it.n_served < 2;
    const row = el('div', { class: 'row' + (it.service_key === state.currentKey ? ' active' : ''), onclick: () => selectRow(it.service_key) }, [
      el('div', { class: 'name', text: it.service_name }),
      el('div', { class: 'sub', text: it.category || '—' }),
      el('div', { class: 'meta' }, [
        el('span', { class: 'badge ' + (thin ? 'thin' : it.status), text: thin ? (it.n_served + ' served') : it.status }),
        el('div', { text: it.n_served + '/' + it.n_raw + ' alts · ' + (it.request_count || 0) + ' req' }),
      ]),
    ]);
    list.appendChild(row);
  });
  $('list-meta').textContent = data.total + ' services';
  const from = state.total ? state.offset + 1 : 0;
  const to = Math.min(state.offset + state.limit, state.total);
  $('page-info').textContent = from + '–' + to + ' of ' + state.total;
  $('prev-btn').disabled = state.offset <= 0;
  $('next-btn').disabled = to >= state.total;
}

// ── Detail ──
async function selectRow(key) {
  state.currentKey = key;
  document.querySelectorAll('.row').forEach((r) => r.classList.remove('active'));
  const e = await api('/catalogue/' + encodeURIComponent(key));
  renderDetail(e);
  loadList();
}

function altView(a, fb) {
  const k = (a.name || '').toLowerCase();
  const f = fb && fb[k];
  return el('div', { class: 'alt' }, [
    el('div', { class: 'aname', text: a.name }),
    el('div', { class: 'aprice', text: money(a.monthly_price) }),
    el('div', { class: 'adesc', text: a.description || (a.website || '') }),
    el('div', { class: 'afb' }, f ? [el('span', { class: 'up', text: '▲ ' + f.up }), document.createTextNode('  '), el('span', { class: 'down', text: '▼ ' + f.down })] : [el('span', { class: 'muted', text: '' })]),
    el('div', { class: 'alt-actions' }, [
      el('button', { text: 'Pin', onclick: () => addOverride('pin', a.name, {}) }),
      el('button', { text: 'Block', onclick: () => addOverride('block', a.name, {}) }),
    ]),
  ]);
}

function editorRow(a) {
  const row = el('div', { class: 'editor-row' }, [
    el('input', { value: a.name || '', placeholder: 'Name', 'data-f': 'name' }),
    el('input', { value: a.monthly_price == null ? '' : a.monthly_price, placeholder: '$/mo', type: 'number', step: '0.01', 'data-f': 'price' }),
    el('input', { value: a.website || '', placeholder: 'https://', 'data-f': 'website' }),
    el('button', { class: 'rm', text: '✕', title: 'Remove', onclick: () => { row.remove(); nextDesc.remove(); } }),
  ]);
  const nextDesc = el('input', { class: 'editor-desc', value: a.description || '', placeholder: 'Short description', 'data-f': 'desc' });
  const frag = document.createDocumentFragment(); frag.appendChild(row); frag.appendChild(nextDesc);
  row._desc = nextDesc;
  return frag;
}

function renderDetail(e) {
  const d = $('detail'); clear(d);
  const served = Array.isArray(e.payload) ? e.payload : [];
  const raw = Array.isArray(e.raw_payload) ? e.raw_payload : [];
  const fb = e.feedback || {};

  // Head + controls
  const statusSel = el('select', {}, ['active', 'needs_review', 'disabled'].map((s) => el('option', { value: s, text: s, selected: e.status === s ? 'selected' : null })));
  const qInput = el('input', { type: 'number', min: '0', max: '100', value: e.quality_score == null ? '' : e.quality_score });
  const catInput = el('input', { value: e.category || '', style: 'width:150px' });
  d.appendChild(el('div', { class: 'detail-head' }, [
    el('h2', { text: e.service_name }),
    el('div', { class: 'key', text: 'key: ' + e.service_key + '  ·  refreshed ' + fmtDate(e.refreshed_at) }),
    el('div', { class: 'detail-controls' }, [
      el('label', {}, ['Category', catInput]),
      el('label', {}, ['Status', statusSel]),
      el('label', {}, ['Quality', qInput]),
      el('button', { class: 'primary', text: 'Save', onclick: () => patchEntry(e.service_key, { category: catInput.value, status: statusSel.value, quality_score: qInput.value === '' ? null : Number(qInput.value) }) }),
      el('button', { class: 'ghost', text: 'Re-resolve', onclick: () => reresolve(e.service_key) }),
      el('button', { class: 'danger', text: 'Delete', onclick: () => delEntry(e.service_key, e.service_name) }),
    ]),
  ]));

  // Served
  const servedSec = el('div', { class: 'section' }, [el('h3', { text: 'Served to users (' + served.length + ')' })]);
  if (!served.length) servedSec.appendChild(el('div', { class: 'muted', text: 'Nothing served — thin or filtered out.' }));
  served.forEach((a) => servedSec.appendChild(altView(a, fb)));
  d.appendChild(servedSec);

  // Overrides
  const ovSec = el('div', { class: 'section' }, [el('h3', { text: 'Owner overrides (' + (e.overrides || []).length + ')' })]);
  (e.overrides || []).forEach((o) => {
    ovSec.appendChild(el('div', { class: 'override' }, [
      el('div', {}, [el('span', { class: 'ov-tag ' + o.action, text: o.action }), document.createTextNode(' ' + o.alternative_name)]),
      el('button', { class: 'danger', text: 'Remove', onclick: () => delOverride(e.service_key, o.id) }),
    ]));
  });
  const ovAction = el('select', {}, ['pin', 'block', 'edit'].map((a) => el('option', { value: a, text: a })));
  const ovName = el('input', { placeholder: 'Alternative name' });
  ovSec.appendChild(el('div', { class: 'addform' }, [
    ovAction, ovName,
    el('button', { class: 'ghost', text: 'Add override', onclick: () => addOverride(ovAction.value, ovName.value.trim(), {}) }),
  ]));
  d.appendChild(ovSec);

  // Raw editor
  const rawSec = el('div', { class: 'section' }, [el('h3', { text: 'Raw alternatives — editable (' + raw.length + ')' })]);
  const rowsWrap = el('div', {});
  raw.forEach((a) => rowsWrap.appendChild(editorRow(a)));
  rawSec.appendChild(rowsWrap);
  rawSec.appendChild(el('div', { class: 'row-actions' }, [
    el('button', { class: 'ghost', text: '+ Add alternative', onclick: () => rowsWrap.appendChild(editorRow({})) }),
    el('button', { class: 'primary', text: 'Save raw list', onclick: () => saveRaw(e.service_key, rowsWrap) }),
  ]));
  d.appendChild(rawSec);
}

// ── Mutations ──
async function patchEntry(key, body) {
  try { await api('/catalogue/' + encodeURIComponent(key), { method: 'PATCH', body }); toast('Saved', 'ok'); selectRow(key); loadStats(); }
  catch (e) { toast(e.message, 'err'); }
}
async function saveRaw(key, wrap) {
  const rows = [...wrap.querySelectorAll('.editor-row')];
  const list = rows.map((r) => {
    const g = (f) => { const i = r.querySelector('[data-f="' + f + '"]'); return i ? i.value.trim() : ''; };
    const price = g('price');
    return { name: g('name'), monthly_price: price === '' ? null : Number(price), website: g('website'), description: r._desc ? r._desc.value.trim() : '' };
  }).filter((a) => a.name);
  try { const res = await api('/catalogue/' + encodeURIComponent(key), { method: 'PATCH', body: { raw_payload: list } }); toast('Raw saved · ' + res.servedCount + ' served', 'ok'); selectRow(key); loadStats(); }
  catch (e) { toast(e.message, 'err'); }
}
async function reresolve(key) {
  try { const res = await api('/catalogue/' + encodeURIComponent(key) + '/reresolve', { method: 'POST' }); toast('Re-resolved · ' + res.servedCount + ' served', 'ok'); selectRow(key); }
  catch (e) { toast(e.message, 'err'); }
}
async function delEntry(key, name) {
  if (!confirm('Delete "' + name + '" from the catalogue? This cannot be undone.')) return;
  try { await api('/catalogue/' + encodeURIComponent(key), { method: 'DELETE' }); toast('Deleted', 'ok'); state.currentKey = null; clear($('detail')); $('detail').appendChild(el('div', { class: 'detail-empty muted', text: 'Select a service to inspect and edit its alternatives.' })); loadList(); loadStats(); }
  catch (e) { toast(e.message, 'err'); }
}
async function addOverride(action, name, patch) {
  if (!name) { toast('Enter an alternative name', 'err'); return; }
  try { const res = await api('/catalogue/' + encodeURIComponent(state.currentKey) + '/overrides', { method: 'POST', body: { action, alternative_name: name, patch } }); toast(action + ' applied · ' + res.servedCount + ' served', 'ok'); selectRow(state.currentKey); loadStats(); }
  catch (e) { toast(e.message, 'err'); }
}
async function delOverride(key, id) {
  try { await api('/catalogue/' + encodeURIComponent(key) + '/overrides/' + encodeURIComponent(id), { method: 'DELETE' }); toast('Override removed', 'ok'); selectRow(key); loadStats(); }
  catch (e) { toast(e.message, 'err'); }
}

// ── Filter wiring ──
let searchTimer;
$('f-search').addEventListener('input', (ev) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.search = ev.target.value.trim(); state.offset = 0; loadList(); }, 250); });
$('f-category').addEventListener('change', (ev) => { state.category = ev.target.value; state.offset = 0; loadList(); });
$('f-status').addEventListener('change', (ev) => { state.status = ev.target.value; state.offset = 0; loadList(); });
$('f-sort').addEventListener('change', (ev) => { state.sort = ev.target.value; state.offset = 0; loadList(); });
$('prev-btn').addEventListener('click', () => { state.offset = Math.max(0, state.offset - state.limit); loadList(); });
$('next-btn').addEventListener('click', () => { state.offset += state.limit; loadList(); });

// ── Boot ──
async function init() {
  try { await Promise.all([loadStats(), loadCategories()]); await loadList(); }
  catch (e) { /* gate shown on auth error */ }
}
(function boot() {
  token = localStorage.getItem(TKEY) || '';
  if (!token) { showGate(); return; }
  api('/ping').then(() => { hideGate(); init(); }).catch(() => {});
})();
