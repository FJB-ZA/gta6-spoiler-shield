'use strict';
const P = globalThis.GSBPatterns;
const api = globalThis.browser || globalThis.chrome;
const $ = (id) => document.getElementById(id);
const IS_FIREFOX = typeof globalThis.browser !== 'undefined' && !!globalThis.browser.runtime.getBrowserInfo;
document.querySelector('.tips-firefox').hidden = !IS_FIREFOX;
document.querySelector('.tips-chrome').hidden = IS_FIREFOX;

const STRICT_HINTS = {
  standard: 'Only the game itself, however it’s spelled: its name, places, characters and codename.',
  paranoid: 'The game, plus the rest of the series, the studio and the publisher. Expect a few false alarms.',
};
const STYLE_HINTS = {
  blinds: 'Closed blinds over the post. Hold it and they open.',
  awning: 'A striped awning pulled down over the post.',
  frosted: 'Frosted glass. You can tell something’s there, but not what.',
  blackout: 'A solid block, like a redacted document.',
  vanish: 'Removed from the page completely. Use the popup if you want things back.',
};

let saveTimer = 0;
function flashSaved() {
  const el = $('saved');
  el.classList.add('on');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => el.classList.remove('on'), 1200);
}
async function save(obj) {
  await api.storage.local.set(obj);
  flashSaved();
}

function applyDemo(style, tone) {
  const demo = $('demo1');
  demo.setAttribute('data-gsb', style === 'vanish' ? 'frosted' : style);
  demo.setAttribute('data-gsb-tone', tone || 'auto');
  demo.setAttribute('data-gsb-pos', '');
}

async function load() {
  const raw = await api.storage.local.get(Object.assign({}, P.DEFAULTS, { stats: { dodged: 0 } }));
  const s = Object.assign(P.migrate(raw), { stats: raw.stats });
  document.documentElement.dataset.tone = s.tone;
  for (const cb of document.querySelectorAll('input[data-key]')) cb.checked = !!s[cb.dataset.key];
  for (const r of document.querySelectorAll('input[name="strictness"]')) r.checked = r.value === s.strictness;
  for (const r of document.querySelectorAll('input[name="style"]')) r.checked = r.value === s.style;
  for (const r of document.querySelectorAll('input[name="tone"]')) r.checked = r.value === s.tone;
  $('strictHint').textContent = STRICT_HINTS[s.strictness] || '';
  $('styleHint').textContent = STYLE_HINTS[s.style] || '';
  $('patternCount').textContent = s.strictness === 'standard' ? P.counts.standard : P.counts.paranoid;
  if (document.activeElement !== $('customKeywords')) $('customKeywords').value = (s.customKeywords || []).join('\n');
  if (document.activeElement !== $('allowlist')) $('allowlist').value = (s.allowlist || []).join('\n');
  const n = Number(s.stats.dodged || 0);
  $('dodgedLine').textContent = n ? `So far I’ve hidden ${n.toLocaleString()} thing${n === 1 ? '' : 's'} for you.` : '';
  applyDemo(s.style, s.tone);
}

for (const cb of document.querySelectorAll('input[data-key]')) {
  cb.addEventListener('change', () => save({ [cb.dataset.key]: cb.checked }));
}
for (const r of document.querySelectorAll('input[name="strictness"]')) {
  r.addEventListener('change', () => save({ strictness: r.value }));
}
for (const r of document.querySelectorAll('input[name="tone"]')) {
  r.addEventListener('change', () => save({ tone: r.value }));
}
for (const r of document.querySelectorAll('input[name="style"]')) {
  r.addEventListener('change', () => save({ style: r.value }));
}

function debounceSave(id, transform) {
  let t = 0;
  $(id).addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => save({ [id]: transform($(id).value) }), 600);
  });
  $(id).addEventListener('blur', () => {
    clearTimeout(t);
    save({ [id]: transform($(id).value) });
  });
}
debounceSave('customKeywords', (v) => P.cleanList(v));
debounceSave('allowlist', (v) =>
  P.cleanList(v).map((h) => h.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./, '').toLowerCase()),
);

$('resetStats').addEventListener('click', () => save({ stats: { dodged: 0, since: Date.now() } }));

// Hold-to-peek demo, same timing as on real pages.
(() => {
  const demo = $('demo1');
  let t = 0;
  demo.addEventListener('pointerdown', (e) => {
    if (!demo.hasAttribute('data-gsb')) return;
    e.preventDefault();
    demo.setAttribute('data-gsb-holding', '');
    t = setTimeout(() => {
      demo.removeAttribute('data-gsb-holding');
      demo.removeAttribute('data-gsb');
      demo.setAttribute('data-gsb-revealed', '');
      setTimeout(() => {
        demo.removeAttribute('data-gsb-revealed');
        load();
      }, 2500);
    }, 1200);
  });
  const stop = () => {
    clearTimeout(t);
    demo.removeAttribute('data-gsb-holding');
  };
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) demo.addEventListener(ev, stop);
})();


api.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') load();
});
load();

