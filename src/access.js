/* The "I can't read pages yet" banner in the popup and settings page.
 * Shows when the browser hasn't given the extension access to websites, asks
 * for it, and says how to fix it by hand if the browser says no. */
(function () {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const IS_FIREFOX = typeof globalThis.browser !== 'undefined' && !!globalThis.browser.runtime.getBrowserInfo;
  const SITES = { origins: ['http://*/*', 'https://*/*'] };

  const box = document.getElementById('perm');
  const btn = document.getElementById('grant');
  if (!box || !btn) return;
  const msg = box.querySelector('p');
  const intro = msg.innerHTML;

  function reset() {
    msg.innerHTML = intro;
    btn.textContent = 'Allow';
    delete btn.dataset.mode;
  }

  async function check() {
    let has = false;
    try { has = await api.permissions.contains(SITES); } catch (_) { /* treat as no */ }
    box.hidden = has;
    if (has) reset();
    return has;
  }

  btn.addEventListener('click', async () => {
    if (btn.dataset.mode === 'details') {
      api.tabs.create({ url: 'chrome://extensions/?id=' + api.runtime.id }).catch(() => {});
      return;
    }
    btn.disabled = true;
    try { await api.permissions.request(SITES); } catch (_) { /* handled below */ }
    btn.disabled = false;
    if (await check()) return;
    if (IS_FIREFOX) {
      msg.innerHTML = '<b>Firefox didn’t allow it.</b> Open about:addons, choose Spoiler Shield, go to <i>Permissions</i> and turn on access to all websites.';
      btn.textContent = 'Try again';
    } else {
      msg.innerHTML = '<b>Chrome didn’t allow it.</b> On the extension’s details page, set <i>Site access</i> to <i>On all sites</i>.';
      btn.textContent = 'Open details';
      btn.dataset.mode = 'details';
    }
  });

  // Access can change elsewhere (install, the extensions menu, the details page).
  if (api.permissions.onAdded) api.permissions.onAdded.addListener(check);
  if (api.permissions.onRemoved) api.permissions.onRemoved.addListener(check);
  // Right after install the browser may still be granting access, so look again shortly.
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  check();
  setTimeout(check, 1000);
  setTimeout(check, 4000);
})();
