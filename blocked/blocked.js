'use strict';
const api = globalThis.browser || globalThis.chrome;
const $ = (id) => document.getElementById(id);
const token = location.hash.slice(1);
const framed = window.top !== window;

const H = globalThis.GSBHanger;
const st = document.createElement('style');
st.textContent = H.css;
document.head.appendChild(st);
document.getElementById('door').outerHTML = H.html({
  night: H.isNight('auto'),
  compact: framed,
  content: `
    <p class="gsb-lead">That link was about the game.</p>
    <p class="gsb-note">I stopped it before it loaded, so you haven’t seen a thing.</p>
    <p class="gsb-why">I could tell from <b>the web address</b>.</p>
    <div class="gsb-actions">
      <button class="gsb-btn gsb-solid" id="out" type="button">Take me back</button>
      <button class="gsb-btn gsb-hold" id="go" type="button" style="--hold:2s"><span class="lbl">Hold to open it anyway</span></button>
    </div>
    <button class="gsb-link" id="allow" type="button">Don’t stop links to this site</button>
    <p class="gsb-note" id="expired" hidden>This stop page has expired, so there’s nothing left to open. You can close this tab.</p>`,
});
api.storage.local.get({ tone: 'auto' }).then((s) => H.applyTone(s.tone), () => {});

let info = null;
api.runtime.sendMessage({ type: 'blockedInfo', token }).then((r) => {
  info = r;
  if (!r) {
    $('go').disabled = true;
    $('allow').hidden = true;
    $('expired').hidden = false;
  }
}, () => {});

$('out').addEventListener('click', async () => {
  if (framed) {
    location.replace('about:blank');
    return;
  }
  if (history.length > 1) {
    history.back();
    // If back had nowhere to go, close the tab.
    setTimeout(async () => {
      const t = await api.tabs.getCurrent();
      if (t) api.tabs.remove(t.id);
    }, 600);
  } else {
    const t = await api.tabs.getCurrent();
    if (t) api.tabs.remove(t.id);
  }
});

$('allow').addEventListener('click', async () => {
  const url = await api.runtime.sendMessage({ type: 'allowBlockedSite', token });
  if (url) location.replace(url);
});

(() => {
  const btn = $('go');
  const lbl = btn.querySelector('.lbl');
  let t = 0;
  const start = (e) => {
    if (btn.disabled) return;
    e.preventDefault();
    btn.classList.add('on');
    lbl.textContent = 'Keep holding…';
    t = setTimeout(async () => {
      const url = await api.runtime.sendMessage({ type: 'continueBlocked', token });
      if (url) location.replace(url);
    }, 2000);
  };
  const stop = () => {
    clearTimeout(t);
    btn.classList.remove('on');
    lbl.textContent = 'Hold to open it anyway';
  };
  btn.addEventListener('pointerdown', start);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stop);
  btn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start(e); });
  btn.addEventListener('keyup', stop);
})();
