/* Spoiler Shield for GTA VI: background (event page). */
'use strict';

// Chrome runs this as a service worker (no manifest script list), Firefox as an event page.
if (typeof importScripts === 'function' && !globalThis.GSBPatterns) importScripts('patterns.js');

const P = globalThis.GSBPatterns;
const api = globalThis.browser || globalThis.chrome;
const IS_FIREFOX = typeof globalThis.browser !== 'undefined' && !!globalThis.browser.runtime.getBrowserInfo;
const menus = api.menus || api.contextMenus;
const CAN_BLOCK = (api.runtime.getManifest().permissions || []).includes('webRequestBlocking');

let settings = Object.assign({}, P.DEFAULTS);
let matcher = P.buildMatcher(settings);
const ready = api.storage.local.get(P.DEFAULTS).then((s) => {
  // Save renamed styles once so every page agrees.
  if (P.LEGACY_STYLES[s.style]) api.storage.local.set({ style: P.LEGACY_STYLES[s.style] }).catch(() => {});
  settings = P.migrate(s);
  matcher = P.buildMatcher(settings);
});

api.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (!Object.keys(changes).some((k) => k in P.DEFAULTS)) return;
  api.storage.local.get(P.DEFAULTS).then((s) => {
    settings = P.migrate(s);
    matcher = P.buildMatcher(settings);
    updateBadgeColor();
  });
});

const session = api.storage.session;

function stripHash(u) {
  const i = String(u).indexOf('#');
  return i === -1 ? String(u) : String(u).slice(0, i);
}

function hostOf(u) {
  try { return new URL(u).hostname; } catch (_) { return ''; }
}

// ------------------------------------------------ navigation interception ---
// Returns the stop-page URL to send this navigation to, or null to let it through.
async function stopPageFor(url, tabId, frame) {
  await ready;
  if (!settings.enabled || !settings.blockNavigation) return null;
  if (!/^https?:/i.test(url)) return null;
  if (P.hostAllowed(hostOf(url), settings.allowlist)) return null;
  if (!matcher.url(url)) return null;

  const key = stripHash(url);
  const { allowOnce = {} } = await session.get('allowOnce');
  const now = Date.now();
  if (allowOnce[key] && allowOnce[key] > now) {
    delete allowOnce[key];
    await session.set({ allowOnce });
    return null;
  }
  const { bypass = {} } = await session.get('bypass');
  if (tabId >= 0 && bypass[tabId] === key) return null;

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const { blocked = {} } = await session.get('blocked');
  for (const [t, v] of Object.entries(blocked)) if (now - v.at > 6 * 3600e3) delete blocked[t];
  blocked[token] = { url, tabId, frame, at: now };
  await session.set({ blocked });
  bump(1);
  return api.runtime.getURL('blocked/blocked.html') + '#' + token;
}

if (CAN_BLOCK) {
  // Firefox: cancel the request itself, before a single byte loads.
  api.webRequest.onBeforeRequest.addListener(
    async (details) => {
      const to = await stopPageFor(details.url, details.tabId, details.type);
      return to ? { redirectUrl: to } : {};
    },
    { urls: ['http://*/*', 'https://*/*'], types: ['main_frame', 'sub_frame'] },
    ['blocking'],
  );
} else if (api.webNavigation) {
  // Chrome (no blocking webRequest in MV3): swap the tab to the stop page as the
  // navigation starts. The content script's page shield covers the brief gap.
  api.webNavigation.onBeforeNavigate.addListener(async (d) => {
    if (d.frameId !== 0 || d.tabId < 0) return;
    const to = await stopPageFor(d.url, d.tabId, 'main_frame');
    if (to) api.tabs.update(d.tabId, { url: to }).catch(() => {});
  });
}

// -------------------------------------------------------------- counts ---
const tabCounts = new Map(); // tabId -> Map(frameId -> count)

function setBadge(tabId) {
  const frames = tabCounts.get(tabId);
  let total = 0;
  if (frames) for (const c of frames.values()) total += c;
  const text = !settings.enabled ? 'off' : total > 999 ? '999+' : total ? String(total) : '';
  api.action.setBadgeText({ tabId, text }).catch(() => {});
}

function updateBadgeColor() {
  api.action.setBadgeBackgroundColor({ color: settings.enabled ? '#E5604F' : '#7A8C90' }).catch(() => {});
  if (api.action.setBadgeTextColor) api.action.setBadgeTextColor({ color: '#ffffff' }).catch(() => {});
  api.tabs.query({}).then((tabs) => tabs.forEach((t) => setBadge(t.id))).catch(() => {});
}

let bumpPending = 0;
let bumpTimer = 0;
function bump(n) {
  bumpPending += n;
  if (bumpTimer) return;
  bumpTimer = setTimeout(async () => {
    bumpTimer = 0;
    const add = bumpPending;
    bumpPending = 0;
    const { stats = { dodged: 0, since: Date.now() } } = await api.storage.local.get('stats');
    stats.dodged = (stats.dodged || 0) + add;
    await api.storage.local.set({ stats });
  }, 1500);
}

api.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading' && info.url) {
    tabCounts.delete(tabId);
    setBadge(tabId);
    session.get('bypass').then(({ bypass = {} }) => {
      if (bypass[tabId] && bypass[tabId] !== stripHash(info.url)) {
        delete bypass[tabId];
        session.set({ bypass });
      }
    });
  }
});
api.tabs.onRemoved.addListener((tabId) => {
  tabCounts.delete(tabId);
  session.get('bypass').then(({ bypass = {} }) => {
    if (bypass[tabId]) {
      delete bypass[tabId];
      session.set({ bypass });
    }
  });
});

// ------------------------------------------------------------ messages ---
async function addToAllowlist(host) {
  host = String(host || '').toLowerCase().replace(/^www\./, '');
  if (!host) return;
  const { allowlist = [] } = await api.storage.local.get('allowlist');
  if (!allowlist.includes(host)) allowlist.push(host);
  await api.storage.local.set({ allowlist });
}

// Promise results are delivered with sendResponse so this works in Chrome too.
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const out = handleMessage(msg, sender);
  if (out && typeof out.then === 'function') {
    out.then((v) => sendResponse(v), () => sendResponse(undefined));
    return true;
  }
  return undefined;
});

function handleMessage(msg, sender) {
  if (!msg || typeof msg !== 'object') return undefined;
  const tabId = sender.tab ? sender.tab.id : -1;

  switch (msg.type) {
    case 'count': {
      if (tabId < 0) return undefined;
      if (!tabCounts.has(tabId)) tabCounts.set(tabId, new Map());
      tabCounts.get(tabId).set(sender.frameId || 0, msg.count | 0);
      if (msg.delta > 0) bump(msg.delta);
      setBadge(tabId);
      return undefined;
    }
    case 'getTabCount': {
      const frames = tabCounts.get(msg.tabId);
      let total = 0;
      if (frames) for (const c of frames.values()) total += c;
      return Promise.resolve(total);
    }
    case 'isBypassed':
      return session.get('bypass').then(({ bypass = {} }) => tabId >= 0 && bypass[tabId] === stripHash(msg.url));
    case 'bypassPage':
      return session.get('bypass').then(({ bypass = {} }) => {
        if (tabId >= 0) bypass[tabId] = stripHash(msg.url);
        return session.set({ bypass });
      });
    case 'allowSite':
      return addToAllowlist(msg.host);
    case 'getMeOut':
      if (tabId < 0) return undefined;
      return api.tabs.goBack(tabId).catch(() => api.tabs.update(tabId, { url: 'about:home' }).catch(() => api.tabs.remove(tabId)));
    // From the blocked page.
    case 'blockedInfo':
      return session.get('blocked').then(({ blocked = {} }) => {
        const b = blocked[msg.token];
        return b ? { host: hostOf(b.url), frame: b.frame } : null;
      });
    case 'continueBlocked':
      return session.get(['blocked', 'allowOnce', 'bypass']).then(async ({ blocked = {}, allowOnce = {}, bypass = {} }) => {
        const b = blocked[msg.token];
        if (!b) return null;
        const key = stripHash(b.url);
        allowOnce[key] = Date.now() + 60e3;
        if (tabId >= 0 && b.frame === 'main_frame') bypass[tabId] = key;
        await session.set({ allowOnce, bypass });
        return b.url;
      });
    case 'allowBlockedSite':
      return session.get('blocked').then(async ({ blocked = {} }) => {
        const b = blocked[msg.token];
        if (!b) return null;
        await addToAllowlist(hostOf(b.url));
        return b.url;
      });
    default:
      return undefined;
  }
}

// --------------------------------------------------------- context menu ---
function createMenus() {
  // Only Firefox accepts per-item icons.
  const icons = IS_FIREFOX ? { icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } } : {};
  const make = (item) => {
    try {
      menus.create(item, () => void api.runtime.lastError);
    } catch (_) { /* duplicate id after restart */ }
  };
  menus.removeAll(() => {
    make({ id: 'gsb-hide', title: 'Hide this from me', contexts: ['page', 'link', 'image', 'video', 'audio', 'frame'], ...icons });
    make({ id: 'gsb-keyword', title: 'Hide anything that mentions \u201c%s\u201d', contexts: ['selection'], ...icons });
    make({ id: 'gsb-reveal-all', title: 'Show me everything on this page', contexts: ['action'] });
    make({ id: 'gsb-toggle', title: 'Turn the shield on or off', contexts: ['action'] });
  });
}
api.runtime.onInstalled.addListener((details) => {
  createMenus();
  updateBadgeColor();
  if (details.reason === 'install') api.runtime.openOptionsPage();
});
api.runtime.onStartup.addListener(() => {
  createMenus();
  updateBadgeColor();
});

menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'gsb-hide' && tab) {
    api.tabs.sendMessage(tab.id, { type: 'hideTarget', targetElementId: info.targetElementId }, { frameId: info.frameId || 0 }).catch(() => {});
  } else if (info.menuItemId === 'gsb-keyword' && info.selectionText) {
    const kw = info.selectionText.trim().slice(0, 120);
    const { customKeywords = [] } = await api.storage.local.get('customKeywords');
    if (kw && !customKeywords.includes(kw)) customKeywords.push(kw);
    await api.storage.local.set({ customKeywords });
  } else if (info.menuItemId === 'gsb-reveal-all' && tab) {
    api.tabs.sendMessage(tab.id, { type: 'revealAll' }).catch(() => {});
  } else if (info.menuItemId === 'gsb-toggle') {
    toggleEnabled();
  }
});

// ------------------------------------------------------------ commands ---
async function toggleEnabled() {
  await ready;
  await api.storage.local.set({ enabled: !settings.enabled });
}
api.commands.onCommand.addListener((cmd) => {
  if (cmd === 'toggle-shield') toggleEnabled();
});

ready.then(updateBadgeColor);
