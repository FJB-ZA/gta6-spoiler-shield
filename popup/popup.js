'use strict';
const P = globalThis.GSBPatterns;
const api = globalThis.browser || globalThis.chrome;
const $ = (id) => document.getElementById(id);

const HINTS = {
  standard: 'Only the game itself: its name, places and characters.',
  paranoid: 'The game, plus the rest of the series, the studio and the publisher.',
};

let tab = null;
let host = '';
let dodged = 0;
let onPage = 0;

function renderTally() {
  const el = $('tally');
  const fmt = (n) => n.toLocaleString();
  const page = onPage ? `<b>${fmt(onPage)}</b> hidden on this page.` : 'Nothing to hide on this page.';
  const total = dodged ? ` ${fmt(dodged)} hidden in total.` : '';
  el.innerHTML = page + total;
}

async function load() {
  const raw = await api.storage.local.get(Object.assign({}, P.DEFAULTS, { stats: { dodged: 0 } }));
  const s = Object.assign(P.migrate(raw), { stats: raw.stats });
  document.documentElement.dataset.tone = s.tone;
  $('enabled').checked = s.enabled;
  document.body.classList.toggle('off', !s.enabled);
  $('status').textContent = s.enabled ? 'Watching for spoilers' : 'Paused';
  for (const r of document.querySelectorAll('input[name="strictness"]')) r.checked = r.value === s.strictness;
  for (const r of document.querySelectorAll('input[name="style"]')) r.checked = r.value === s.style;
  for (const r of document.querySelectorAll('input[name="tone"]')) r.checked = r.value === s.tone;
  $('strictHint').textContent = HINTS[s.strictness] || '';
  dodged = Number(s.stats.dodged || 0);
  renderTally();

  const allowed = host && P.hostAllowed(host, s.allowlist);
  $('siteRow').classList.toggle('allowed', !!allowed);
  $('siteState').textContent = !host ? 'Nothing to check on this page' : allowed ? 'You trust this site, so I leave it alone' : 'I’m checking this site';
  $('siteBtn').textContent = allowed ? 'Check it' : 'Skip it';
  $('siteBtn').disabled = !host;
}

async function init() {
  [tab] = await api.tabs.query({ active: true, currentWindow: true });
  try {
    const u = new URL(tab.url);
    if (/^https?:$/.test(u.protocol)) host = u.hostname.replace(/^www\./, '');
  } catch (_) { /* no url access */ }
  $('host').textContent = host || 'This tab';


  await load();
  refreshCount();
}

async function refreshCount() {
  if (!tab) return;
  const n = await api.runtime.sendMessage({ type: 'getTabCount', tabId: tab.id }).catch(() => 0);
  onPage = Number(n || 0);
  renderTally();
}


$('enabled').addEventListener('change', (e) => api.storage.local.set({ enabled: e.target.checked }));
for (const r of document.querySelectorAll('input[name="strictness"]')) {
  r.addEventListener('change', () => api.storage.local.set({ strictness: r.value }));
}
for (const r of document.querySelectorAll('input[name="tone"]')) {
  r.addEventListener('change', () => api.storage.local.set({ tone: r.value }));
}
for (const r of document.querySelectorAll('input[name="style"]')) {
  r.addEventListener('change', () => api.storage.local.set({ style: r.value }));
}

$('siteBtn').addEventListener('click', async () => {
  if (!host) return;
  const { allowlist = [] } = await api.storage.local.get('allowlist');
  const allowed = P.hostAllowed(host, allowlist);
  const next = allowed
    ? allowlist.filter((e) => !P.hostAllowed(host, [e]))
    : allowlist.concat(host);
  await api.storage.local.set({ allowlist: next });
});

$('settings').addEventListener('click', () => {
  api.runtime.openOptionsPage();
  window.close();
});

// Revealing a whole page is deliberate: hold for 1.5s.
(() => {
  const btn = $('reveal');
  const lbl = btn.querySelector('.lbl');
  let t = 0;
  const start = (e) => {
    e.preventDefault();
    btn.classList.add('holding');
    lbl.textContent = 'Keep holding…';
    t = setTimeout(() => {
      if (tab) api.tabs.sendMessage(tab.id, { type: 'revealAll' }).catch(() => {});
      lbl.textContent = 'All shown';
      setTimeout(refreshCount, 700);
    }, 1500);
  };
  const stop = () => {
    clearTimeout(t);
    btn.classList.remove('holding');
    if (lbl.textContent !== 'All shown') lbl.textContent = 'Hold to show all';
  };
  btn.addEventListener('pointerdown', start);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stop);
})();

api.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') load();
});
setInterval(refreshCount, 1500);
init();

