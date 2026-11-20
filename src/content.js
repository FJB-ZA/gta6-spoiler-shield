/* GTA VI Spoiler Shield: content script.
 * Runs at document_start in every frame. It fails closed: it shields with the
 * default (strictest) settings until the saved settings arrive. */
(() => {
  'use strict';
  if (window.__gsbLoaded) return;
  window.__gsbLoaded = true;

  const P = globalThis.GSBPatterns;
  const api = globalThis.browser || globalThis.chrome;
  const IS_TOP = window === window.top;

  let settings = Object.assign({}, P.DEFAULTS);
  let matcher = P.buildMatcher(settings);
  let active = !P.hostAllowed(location.hostname, settings.allowlist);
  let pageBypass = false;
  let initialUrl = location.href;

  const hidden = new Set(); // elements currently shielded
  const manual = new WeakSet(); // shielded by the user via context menu: never auto-unhide
  const knownRoots = new Set(); // shadow roots being observed
  let shieldCssText = null;
  const pendingCssRoots = [];

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'HEAD', 'TITLE', 'META', 'LINK',
    'OPTION', 'SELECT', 'INPUT', 'GSB-PAGE-SHIELD', 'BR', 'HR', 'WBR',
  ]);
  const TEXT_ATTRS = ['alt', 'title', 'aria-label', 'data-title', 'data-tooltip', 'data-original-title', 'data-gsb-title', 'aria-description', 'placeholder', 'label'];
  const URL_ATTRS = ['href', 'src', 'poster', 'data-src', 'data-href', 'data-url', 'action'];
  const ATTR_FILTER = ['alt', 'title', 'aria-label', 'data-title', 'href', 'src', 'poster', 'data-src', 'placeholder', 'label'];

  // ---------------------------------------------------- container picking ---
  const SITE_CONTAINERS = [
    [/(^|\.)(youtube|youtube-nocookie)\.com$/, [
      'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer', 'ytd-grid-video-renderer',
      'ytd-reel-item-renderer', 'ytd-playlist-renderer', 'ytd-compact-playlist-renderer', 'ytd-radio-renderer',
      'ytd-compact-radio-renderer', 'ytd-playlist-video-renderer', 'ytd-playlist-panel-video-renderer',
      'ytd-movie-renderer', 'ytd-channel-renderer', 'ytd-post-renderer', 'ytd-backstage-post-thread-renderer',
      'ytd-comment-thread-renderer', 'ytd-comment-view-model', 'ytd-comment-renderer', 'ytd-notification-renderer',
      'ytd-guide-entry-renderer', 'ytd-universal-watch-card-renderer', 'ytd-horizontal-card-renderer',
      'ytd-search-refinement-card-renderer', 'ytd-video-description-infocards-section-renderer',
      'ytd-structured-description-video-lockup-renderer', 'ytd-compact-infocard-renderer', 'ytd-ad-slot-renderer',
      'yt-lockup-view-model', 'ytm-shorts-lockup-view-model', 'ytm-shorts-lockup-view-model-v2',
      'yt-chip-cloud-chip-renderer', 'yt-live-chat-text-message-renderer', 'yt-live-chat-paid-message-renderer',
      'ytm-video-with-context-renderer', 'ytm-compact-video-renderer', 'ytm-reel-item-renderer',
      'ytm-comment-thread-renderer', 'ytm-rich-item-renderer', 'ytm-playlist-renderer',
      '.ytp-videowall-still', '.ytp-modern-videowall-still', '.ytp-ce-element', '.ytp-autonav-endscreen-upnext-container',
      '.ytp-suggestion-set', '.ytSuggestionComponentSuggestion', '.sbsb_c', '[role="option"]',
    ]],
    [/(^|\.)reddit\.com$/, [
      'shreddit-post', 'shreddit-comment', 'shreddit-ad-post', 'shreddit-gallery-carousel', 'reddit-pdp-right-rail-post',
      'search-telemetry-tracker', '[data-testid="search-post-unit"]', '[data-testid="post-container"]',
      'community-highlight-card', 'faceplate-tracker[noun="post"]', 'faceplate-tracker[noun="trending_search"]',
      'reddit-recent-pages li', 'left-nav-community-item', 'div.thing', '.comment', 'li[role="presentation"]',
      '[role="option"]',
    ]],
    [/(^|\.)(twitter|x)\.com$/, [
      'article[data-testid="tweet"]', '[data-testid="trend"]', '[data-testid="UserCell"]',
      '[data-testid="typeaheadResult"]', '[data-testid="TypeaheadUser"]', '[data-testid="card.wrapper"]',
      '[data-testid="cellInnerDiv"]', '[role="option"]',
    ]],
    [/(^|\.)google\.[a-z.]+$/, [
      'div.MjjYud', 'div.g', '.related-question-pair', 'g-inner-card', '.WlydOe', 'div.SoaBEf',
      '[data-attrid]', 'div.isv-r', 'div[data-ri]', 'div[data-lpage]', 'li.sbct', '.ULSxyf', 'video-voyager',
      'article', 'c-wiz[jsrenderer] article', '[role="option"]', '[role="listitem"]',
    ]],
    [/(^|\.)bing\.com$/, ['li.b_algo', '.b_ans', '.na_card', '.sa_sg', '.mc_vtvc', '.tobitem', '.iuscp', '.dg_u']],
    [/(^|\.)duckduckgo\.com$/, ['article[data-testid="result"]', 'li[data-layout]', '.result', '.tile', '.module', '[role="option"]']],
    [/(^|\.)twitch\.tv$/, [
      'article', '.side-nav-card', '[data-a-target="side-nav-card"]', '[data-test-selector="shelf-card-selector"]',
      '.tw-tower > div', '.chat-line__message', '.game-card', '[data-a-target="card"]',
    ]],
    [/(^|\.)(facebook|messenger)\.com$/, ['div[role="article"]', 'div[data-pagelet^="FeedUnit"]']],
    [/(^|\.)instagram\.com$/, ['article', 'div[data-pressable-container="true"]', 'a[href^="/p/"]', 'a[href^="/reel/"]']],
    [/(^|\.)threads\.(net|com)$/, ['div[data-pressable-container="true"]']],
    [/(^|\.)tiktok\.com$/, [
      '[data-e2e="recommend-list-item-container"]', '[data-e2e="search_top-item"]', '[data-e2e="search-card-item"]',
      '[data-e2e="user-post-item"]', '[data-e2e="comment-level-1"]', '[data-e2e="search_video-item"]',
      '[data-e2e="explore-item"]',
    ]],
    [/(^|\.)discord\.com$/, ['li[id^="chat-messages-"]', '[class*="embedWrapper"]']],
    [/(^|\.)(steampowered|steamcommunity)\.com$/, [
      '.tab_item', '.search_result_row', '.store_capsule', '.home_area_spotlight', '.apphub_Card',
      '.discussion_search_result', '.forum_topic', '.match', '.dailydeal_ctn', '.salepreviewwidgets_SaleItemBrowserRow_y9MSd',
    ]],
    [/(^|\.)bsky\.app$/, ['[data-testid^="feedItem-"]', '[data-testid^="postThreadItem-"]']],
    [/(^|\.)linkedin\.com$/, ['.feed-shared-update-v2', '.update-components-article']],
    [/(^|\.)news\.ycombinator\.com$/, ['tr.athing']],
    [/(^|\.)amazon\.[a-z.]+$/, ['[data-component-type="s-search-result"]', '[data-asin]:not([data-asin=""])']],
    [/(^|\.)(9gag|imgur|tumblr)\.com$/, ['article', '.Post-item', '[data-id]']],
    [/(^|\.)(playstation|xbox)\.com$/, ['li', '[data-qa*="product"]', '[class*="ProductCard"]']],
  ];
  const SITE_SELECTOR = (() => {
    const host = location.hostname;
    const out = [];
    for (const [re, sels] of SITE_CONTAINERS) if (re.test(host)) out.push(...sels);
    return out.join(',');
  })();
  const SEMANTIC_SELECTOR = [
    'article', '[role="article"]', '[itemtype*="Article"]', '[itemtype*="Comment"]', 'li', '[role="listitem"]',
    '[role="option"]', '[role="row"]', 'tr', 'figure', 'blockquote', 'dd', 'dt', 'details',
  ].join(',');
  const TAGLIKE_SELECTOR = [
    'a[rel~="tag"]', 'a[href*="/tag/"]', 'a[href*="/tags/"]', 'a[href*="/hashtag/"]', 'a[href*="/topics/"]',
    'a[href*="/topic/"]', 'a[href*="tagged"]', '[class*="hashtag" i]', '[class~="tag"]', '[class*="tag-" i]',
    '[class*="-tag" i]', '[class*="tags" i]', '[class*="keyword" i]', '[class*="category" i]', '[class*="genre" i]',
  ].join(',');
  const POSTLIKE_SELECTOR = 'article,[role="article"],[itemtype*="Article"],[class*="post" i],[class*="card" i],[class*="entry" i],[class*="story" i],[class*="item" i],li';
  const STOP_TAGS = new Set(['HTML', 'BODY', 'MAIN', 'HEADER', 'FOOTER', 'NAV', 'ASIDE', 'FORM', 'DIALOG', 'TABLE', 'TBODY', 'UL', 'OL']);

  function parentAcross(el) {
    if (el.parentElement) return el.parentElement;
    const r = el.getRootNode && el.getRootNode();
    return r && r.host ? r.host : null;
  }

  function closestAcross(el, selector) {
    if (!selector) return null;
    let node = el;
    while (node) {
      let hit = null;
      try { hit = node.closest(selector); } catch (_) { return null; }
      if (hit) return hit;
      const r = node.getRootNode && node.getRootNode();
      node = r && r.host ? r.host : null;
    }
    return null;
  }

  function textLen(el) {
    const t = el.textContent;
    return t ? t.length : 0;
  }

  function linkCount(el, cap) {
    const links = el.querySelectorAll('a[href]');
    return Math.min(links.length, cap);
  }

  function okSize(el, maxText) {
    if (!el || STOP_TAGS.has(el.tagName)) return false;
    return textLen(el) <= maxText;
  }

  // Climb while the ancestor still looks like one "card": few links, short text.
  function climbCard(el) {
    let best = el;
    let node = el;
    for (let i = 0; i < 10; i++) {
      const p = parentAcross(node);
      if (!p || STOP_TAGS.has(p.tagName) || p === document.documentElement) break;
      if (p.getAttribute && (p.getAttribute('role') === 'main' || p.getAttribute('role') === 'navigation' || p.getAttribute('role') === 'feed')) break;
      if (textLen(p) > 700) break;
      if (linkCount(p, 5) > 4) break;
      best = p;
      node = p;
    }
    return best;
  }

  function nearestBlock(el) {
    let node = el;
    for (let i = 0; i < 4 && node; i++) {
      const d = safeDisplay(node);
      if (d && d !== 'inline' && d !== 'contents') return node;
      const p = parentAcross(node);
      if (!p || STOP_TAGS.has(p.tagName) || textLen(p) > 600) break;
      node = p;
    }
    return node || el;
  }

  function pickContainer(el) {
    if (!el || el.nodeType !== 1) return null;
    // Tags / hashtags / categories mark the whole post, not just the chip.
    const tagChip = closestAcross(el, TAGLIKE_SELECTOR);
    if (tagChip && tagChip !== el.ownerDocument.body) {
      const site = closestAcross(tagChip, SITE_SELECTOR);
      if (site && okSize(site, 8000)) return site;
      const post = closestAcross(parentAcross(tagChip) || tagChip, POSTLIKE_SELECTOR);
      if (post && okSize(post, 8000)) return post;
    }
    const site = closestAcross(el, SITE_SELECTOR);
    if (site && okSize(site, 12000)) return site;
    const sem = closestAcross(el, SEMANTIC_SELECTOR);
    if (sem && okSize(sem, 2500) && linkCount(sem, 12) <= 10) return sem;
    const card = climbCard(el);
    if (card && card !== el && okSize(card, 2500)) return card;
    return nearestBlock(el);
  }

  // ------------------------------------------------------------ styling ---
  function safeDisplay(el) {
    try {
      const cs = el.ownerDocument.defaultView.getComputedStyle(el);
      return cs ? cs.display : '';
    } catch (_) {
      return '';
    }
  }

  function safePosition(el) {
    try {
      const cs = el.ownerDocument.defaultView.getComputedStyle(el);
      return cs ? cs.position : '';
    } catch (_) {
      return '';
    }
  }

  function loadShieldCss() {
    try {
      fetch(api.runtime.getURL('src/content.css'))
        .then((r) => r.text())
        .then((t) => {
          // Font URLs only get the extension id filled in for manifest-injected CSS.
          shieldCssText = t.replace(/__MSG_@@extension_id__/g, api.runtime.id);
          while (pendingCssRoots.length) injectCss(pendingCssRoots.pop());
        })
        .catch(() => {});
    } catch (_) { /* ignore */ }
  }

  function injectCss(root) {
    if (!shieldCssText) {
      pendingCssRoots.push(root);
      return;
    }
    if (root.__gsbCss) return;
    root.__gsbCss = true;
    try {
      const sheet = new root.ownerDocument.defaultView.CSSStyleSheet();
      sheet.replaceSync(shieldCssText);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      return;
    } catch (_) { /* fall through */ }
    try {
      const st = root.ownerDocument.createElement('style');
      st.textContent = shieldCssText;
      st.setAttribute('data-gsb-style', '');
      root.appendChild(st);
    } catch (_) { /* ignore */ }
  }

  function mark(el, isManual) {
    if (!el || el.nodeType !== 1 || el.hasAttribute('data-gsb')) return;
    if (SKIP_TAGS.has(el.tagName) || el === document.documentElement || el === document.body) return;
    const disp = safeDisplay(el);
    if (disp === 'contents') {
      let any = false;
      for (const c of el.children) { mark(c, isManual); any = true; }
      if (!any) mark(parentAcross(el), isManual);
      return;
    }
    // A bigger shield swallows the smaller ones inside it.
    for (const inner of el.querySelectorAll('[data-gsb]')) unmark(inner);
    if (disp === 'inline') el.setAttribute('data-gsb-inline', '');
    if (safePosition(el) === 'static') el.setAttribute('data-gsb-pos', '');
    if (el.hasAttribute('title')) {
      el.setAttribute('data-gsb-title', el.getAttribute('title'));
      el.removeAttribute('title');
    }
    el.setAttribute('data-gsb', settings.style);
    el.setAttribute('data-gsb-tone', settings.tone);
    el.setAttribute('aria-hidden', 'true');
    if (isManual) manual.add(el);
    hidden.add(el);
    const root = el.getRootNode();
    if (root && root.host) injectCss(root);
    pauseInside(el);
    report();
  }

  function unmark(el) {
    if (!el.hasAttribute('data-gsb')) return;
    el.removeAttribute('data-gsb');
    el.removeAttribute('data-gsb-inline');
    el.removeAttribute('data-gsb-pos');
    el.removeAttribute('data-gsb-holding');
    el.removeAttribute('data-gsb-tone');
    el.removeAttribute('aria-hidden');
    if (el.hasAttribute('data-gsb-title')) {
      el.setAttribute('title', el.getAttribute('data-gsb-title'));
      el.removeAttribute('data-gsb-title');
    }
    hidden.delete(el);
    report();
  }

  function isInsideShielded(el) {
    return !!closestAcross(el, '[data-gsb],[data-gsb-revealed],gsb-page-shield');
  }

  // Never cover a box the user is typing in (search bars, comment fields), or
  // anything wrapped around one. What they type is their own business.
  const EDITABLE = [
    'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="image"])',
    'textarea', 'select', '[contenteditable=""]', '[contenteditable="true"]', '[contenteditable="plaintext-only"]',
    '[role="searchbox"]', '[role="textbox"]', '[role="combobox"]',
  ].join(',');
  function isEditable(el) {
    try { return el.matches(EDITABLE) || el.isContentEditable; } catch (_) { return false; }
  }
  function holdsEditable(el) {
    try { return isEditable(el) || !!el.querySelector(EDITABLE); } catch (_) { return false; }
  }

  function hideFor(el) {
    if (!active || !el) return;
    if (isInsideShielded(el) || isEditable(el)) return;
    let c = pickContainer(el);
    // The container would swallow a search box: hide just the matching bit instead.
    if (c && holdsEditable(c)) c = holdsEditable(el) ? null : el;
    if (!c || c.hasAttribute('data-gsb-revealed') || isInsideShielded(c)) return;
    mark(c, false);
  }

  // ----------------------------------------------------------- scanning ---
  function checkText(t) {
    const v = t.nodeValue;
    if (!v || v.length < 2 || !/[^\s\d]/.test(v)) return;
    const parent = t.parentElement || (t.parentNode && t.parentNode.host);
    if (!parent || SKIP_TAGS.has(parent.tagName)) return;
    if (parent.isContentEditable) return;
    if (matcher.text(v)) {
      hideFor(parent);
      return;
    }
    // Catch terms split across elements: "GTA <b>6</b>".
    if (v.length < 80) {
      let p = parent;
      for (let i = 0; i < 2 && p; i++) {
        const pt = p.textContent;
        if (!pt || pt.length > 300) break;
        // Only when the term really is split: if one child matches by itself,
        // that child gets handled on its own and its siblings stay visible.
        if (pt.length > v.length && matcher.text(pt)) {
          const whole = [...p.childNodes].some((c) => c.textContent && c.textContent.length < pt.length && matcher.text(c.textContent));
          if (!whole) hideFor(p);
          return;
        }
        p = p.parentElement;
      }
    }
  }

  function attrMatches(el) {
    if (!el.hasAttributes()) return false;
    for (const a of TEXT_ATTRS) {
      const v = el.getAttribute(a);
      if (v && v.length > 1 && matcher.text(v)) return true;
    }
    for (const a of URL_ATTRS) {
      const v = el.getAttribute(a);
      if (v && v.length > 3 && !v.startsWith('data:') && matcher.url(v)) return true;
    }
    const ss = el.getAttribute('srcset');
    if (ss && matcher.url(ss)) return true;
    const st = el.getAttribute('style');
    if (st && st.indexOf('url(') !== -1 && matcher.url(st)) return true;
    return false;
  }

  function checkElement(el) {
    if (attrMatches(el)) hideFor(el);
    const sr = shadowOf(el);
    if (sr) adoptRoot(sr);
  }

  const domApi = api && api.dom && api.dom.openOrClosedShadowRoot ? api.dom : null; // Chrome
  function shadowOf(el) {
    try {
      if (domApi) return domApi.openOrClosedShadowRoot(el) || null;
      return el.openOrClosedShadowRoot || el.shadowRoot || null;
    } catch (_) {
      return el.shadowRoot || null;
    }
  }

  const walkerFilter = {
    acceptNode(n) {
      if (n.nodeType === 1) {
        if (SKIP_TAGS.has(n.tagName)) return NodeFilter.FILTER_REJECT;
        if (n.hasAttribute('data-gsb') || n.hasAttribute('data-gsb-revealed')) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  };

  function scan(root) {
    if (!active || !root) return;
    if (root.nodeType === 3) {
      checkText(root);
      return;
    }
    if (root.nodeType === 1) {
      if (SKIP_TAGS.has(root.tagName)) return;
      if (isInsideShielded(root)) return;
      checkElement(root);
      if (root.hasAttribute('data-gsb')) return;
    } else if (root.nodeType !== 11 && root.nodeType !== 9) {
      return;
    }
    const doc = root.ownerDocument || root;
    const w = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, walkerFilter);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) checkText(n);
      else checkElement(n);
    }
  }

  function adoptRoot(sr) {
    if (knownRoots.has(sr)) return;
    knownRoots.add(sr);
    injectCss(sr);
    try { observer.observe(sr, OBS_OPTS); } catch (_) { /* ignore */ }
    scan(sr);
  }

  // Custom elements often attach their shadow root after insertion.
  function sweepShadowRoots(root) {
    const all = root.querySelectorAll('*');
    for (const el of all) {
      if (el.tagName.indexOf('-') === -1) continue;
      const sr = shadowOf(el);
      if (sr && !knownRoots.has(sr)) adoptRoot(sr);
    }
  }

  // Elements still shielded whose content changed: are they still spoilers?
  function stillMatches(el) {
    if (matcher.text(el.textContent)) return true;
    if (attrMatches(el)) return true;
    const nodes = el.querySelectorAll('[alt],[title],[aria-label],[data-gsb-title],[href],[src],[poster],[srcset]');
    for (const n of nodes) if (attrMatches(n)) return true;
    return false;
  }

  // ---------------------------------------------------------- observer ---
  const OBS_OPTS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR_FILTER };
  let titleTouched = false;

  const observer = new MutationObserver((muts) => {
    if (!active) return;
    const recheck = new Set();
    let titleChanged = false;
    let headlineMaybe = false;
    for (const m of muts) {
      const t = m.target;
      const tEl = t.nodeType === 1 ? t : t.parentElement;
      if (tEl && (tEl.tagName === 'TITLE' || (tEl.closest && tEl.closest('title')))) {
        titleChanged = true;
        continue;
      }
      if (tEl && tEl.closest) {
        const h = tEl.closest('[data-gsb]');
        if (h && !manual.has(h)) recheck.add(h);
      }
      if (m.type === 'childList') {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) {
            if (n.tagName === 'TITLE') titleChanged = true;
            if (n.tagName === 'H1' || n.tagName === 'META') headlineMaybe = true;
            if (n.tagName && n.tagName.indexOf('-') !== -1) queueShadowCheck(n);
          }
          scan(n);
        }
      } else if (m.type === 'characterData') {
        checkText(t);
      } else if (m.type === 'attributes') {
        if (t.nodeType === 1 && !t.hasAttribute('data-gsb') && attrMatches(t)) hideFor(t);
      }
    }
    for (const h of recheck) {
      if (h.isConnected && h.hasAttribute('data-gsb') && !stillMatches(h)) {
        unmark(h);
        scan(h);
      }
    }
    if (titleChanged) maskTitle();
    if (titleChanged || headlineMaybe) pageCheck();
    else schedulePageCheck();
  });

  let shadowQueue = new Set();
  let shadowTimer = 0;
  function queueShadowCheck(el) {
    shadowQueue.add(el);
    if (shadowTimer) return;
    shadowTimer = setTimeout(() => {
      shadowTimer = 0;
      const q = shadowQueue;
      shadowQueue = new Set();
      const retry = [];
      for (const el2 of q) {
        const sr = shadowOf(el2);
        if (sr) adoptRoot(sr);
        else if (el2.isConnected && !(el2.__gsbTries > 3)) retry.push(el2);
        if (el2.isConnected) sweepShadowRoots(el2);
      }
      // Not upgraded yet: look again a little later.
      if (retry.length) setTimeout(() => {
        for (const el3 of retry) {
          el3.__gsbTries = (el3.__gsbTries || 0) + 1;
          queueShadowCheck(el3);
        }
      }, 150);
    }, 0);
  }

  // ------------------------------------------------------ tab title mask ---
  const MASK_TITLE = '\u{1F6AA} Do not disturb';
  let originalTitle = null;
  function maskTitle() {
    if (!active || !settings.maskTitles) return;
    const t = document.title;
    if (!t || t === MASK_TITLE) return;
    if (matcher.text(t)) {
      originalTitle = t;
      titleTouched = true;
      document.title = MASK_TITLE;
    } else {
      titleTouched = false;
      originalTitle = null;
    }
  }
  function unmaskTitle() {
    if (titleTouched && originalTitle != null && document.title === MASK_TITLE) document.title = originalTitle;
    titleTouched = false;
  }

  // --------------------------------------------------------- page shield ---
  let shieldHost = null;
  let shieldReason = '';
  let pageCheckTimer = 0;

  function metaSignals() {
    const sel = [
      'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[name="twitter:title"]',
      'meta[name="twitter:description"]', 'meta[name="description"]', 'meta[name="keywords"]',
      'meta[name="news_keywords"]', 'meta[property="article:tag"]', 'meta[property="og:video:tag"]',
      'meta[property="article:section"]', 'meta[name="parsely-tags"]', 'meta[name="sailthru.tags"]',
      'meta[property="og:url"]', 'link[rel="canonical"]',
    ].join(',');
    const out = [];
    for (const m of document.querySelectorAll(sel)) {
      const v = m.getAttribute('content') || m.getAttribute('href');
      if (v) out.push([m.tagName === 'LINK' || /url/.test(m.getAttribute('property') || '') ? 'url' : 'text', v]);
    }
    return out;
  }

  function pageReason() {
    if (matcher.url(location.href)) return 'the web address';
    const t = titleTouched ? originalTitle : document.title;
    if (t && matcher.text(t)) return 'the page title';
    // Meta tags are stale after SPA navigation, so only trust them on first load.
    if (location.href === initialUrl) {
      for (const [kind, v] of metaSignals()) {
        if (kind === 'url' ? matcher.url(v) : matcher.text(v)) return 'the page’s hidden tags';
      }
    }
    const h1 = document.querySelector('h1');
    if (h1) {
      const ht = h1.textContent;
      if (ht && ht.length < 400 && matcher.text(ht)) return 'the headline';
    }
    return '';
  }

  function schedulePageCheck() {
    if (pageCheckTimer) return;
    pageCheckTimer = setTimeout(() => {
      pageCheckTimer = 0;
      pageCheck();
    }, 250);
  }

  function pageCheck() {
    if (!active || !settings.pageShield || pageBypass) {
      removeShield();
      return;
    }
    const reason = pageReason();
    if (reason) showShield(reason);
    else removeShield();
  }


  function night() {
    if (settings.tone === 'dark') return true;
    if (settings.tone === 'light') return false;
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (_) { return false; }
  }

  function showShield(reason) {
    shieldReason = reason;
    const docEl = document.documentElement;
    if (!docEl) return;
    docEl.setAttribute('data-gsb-locked', '');
    if (settings.pauseMedia) pauseAll();
    if (shieldHost && shieldHost.isConnected) {
      const r = shieldHost.__gsbReason;
      if (r) r.textContent = reason;
      return;
    }
    shieldHost = document.createElement('gsb-page-shield');
    shieldHost.setAttribute('style', 'all:initial !important;position:fixed !important;inset:0 !important;z-index:2147483647 !important;display:block !important;');
    const sr = shieldHost.attachShadow({ mode: 'closed' });
    const compact = !IS_TOP && (window.innerWidth < 420 || window.innerHeight < 300);
    const H = globalThis.GSBHanger;
    const css = H.css + `
        :host { all: initial; }`;
    let styled = false;
    try {
      const sheet = new window.CSSStyleSheet();
      sheet.replaceSync(css);
      sr.adoptedStyleSheets = [sheet];
      styled = true;
    } catch (_) { /* fall back to <style> */ }
    sr.innerHTML = `${styled ? '' : `<style>${css}</style>`}` + H.html({
      night: night(),
      compact,
      content: `
        <p class="gsb-lead">This page is about the game.</p>
        <p class="gsb-note">You wanted to go in knowing nothing, so I’ve covered it up.</p>
        <p class="gsb-why">I could tell from <b class="reason"></b>.</p>
        <div class="gsb-actions">
          <button class="gsb-btn gsb-solid out" type="button">Take me back</button>
          <button class="gsb-btn gsb-hold hold" type="button" style="--hold:1.5s"><span class="lbl">Hold to see it anyway</span></button>
        </div>
        <button class="gsb-link allow" type="button">Don’t cover anything on this site</button>`,
    });
    const reasonEl = sr.querySelector('.reason');
    reasonEl.textContent = reason;
    shieldHost.__gsbReason = reasonEl;

    sr.querySelector('.out').addEventListener('click', () => {
      if (!IS_TOP) {
        try { window.location.replace('about:blank'); } catch (_) { /* ignore */ }
        return;
      }
      send({ type: 'getMeOut' });
    });
    const allow = sr.querySelector('.allow');
    if (allow) allow.addEventListener('click', () => send({ type: 'allowSite', host: location.hostname }));
    const hold = sr.querySelector('.hold');
    let timer = 0;
    const start = (e) => {
      e.preventDefault();
      hold.classList.add('on');
      hold.querySelector('.lbl').textContent = 'Keep holding…';
      timer = setTimeout(() => {
        pageBypass = true;
        send({ type: 'bypassPage', url: location.href });
        removeShield();
      }, 1500);
    };
    const stop = () => {
      clearTimeout(timer);
      hold.classList.remove('on');
      hold.querySelector('.lbl').textContent = 'Hold to see it anyway';
    };
    hold.addEventListener('pointerdown', start);
    hold.addEventListener('pointerup', stop);
    hold.addEventListener('pointerleave', stop);
    hold.addEventListener('pointercancel', stop);
    hold.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
    hold.addEventListener('keyup', stop);

    docEl.appendChild(shieldHost);
    keepShieldOnTop();
  }

  // Sites that wipe <html> children or append above us get the shield re-added.
  let shieldGuard = null;
  function keepShieldOnTop() {
    if (shieldGuard) return;
    shieldGuard = new MutationObserver(() => {
      if (!shieldHost) return;
      const docEl = document.documentElement;
      if (!docEl) return;
      if (!shieldHost.isConnected || docEl.lastElementChild !== shieldHost) docEl.appendChild(shieldHost);
      if (!docEl.hasAttribute('data-gsb-locked')) docEl.setAttribute('data-gsb-locked', '');
    });
    shieldGuard.observe(document, { childList: true, subtree: false });
    if (document.documentElement) shieldGuard.observe(document.documentElement, { childList: true, attributes: true, attributeFilter: ['data-gsb-locked'] });
  }

  function removeShield() {
    if (shieldGuard) {
      shieldGuard.disconnect();
      shieldGuard = null;
    }
    if (shieldHost) {
      shieldHost.remove();
      shieldHost = null;
    }
    shieldReason = '';
    if (document.documentElement) document.documentElement.removeAttribute('data-gsb-locked');
  }

  // --------------------------------------------------------------- media ---
  function pauseAll() {
    for (const m of document.querySelectorAll('video,audio')) {
      try { m.pause(); } catch (_) { /* ignore */ }
    }
  }
  function pauseInside(el) {
    if (!settings.pauseMedia) return;
    for (const m of el.querySelectorAll('video,audio')) {
      try { m.pause(); m.muted = true; } catch (_) { /* ignore */ }
    }
  }
  document.addEventListener('play', (e) => {
    if (!active || !settings.pauseMedia) return;
    const m = e.target;
    if (!m || typeof m.pause !== 'function') return;
    if (shieldHost || isInsideShielded(m)) {
      try { m.pause(); } catch (_) { /* ignore */ }
    }
  }, true);

  // ----------------------------------------------------- hold to reveal ---
  function shieldedFromEvent(e) {
    const path = e.composedPath ? e.composedPath() : [e.target];
    for (const n of path) {
      if (n && n.nodeType === 1 && n.hasAttribute('data-gsb')) return n;
      if (n && n.nodeType === 1 && n.tagName === 'GSB-PAGE-SHIELD') return null;
    }
    return null;
  }

  let holdEl = null;
  let holdTimer = 0;
  function cancelHold() {
    clearTimeout(holdTimer);
    if (holdEl) holdEl.removeAttribute('data-gsb-holding');
    holdEl = null;
  }
  function swallow(e) {
    const el = shieldedFromEvent(e);
    if (!el) return null;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return el;
  }
  window.addEventListener('pointerdown', (e) => {
    const el = swallow(e);
    if (!el || e.button !== 0) return;
    cancelHold();
    holdEl = el;
    el.setAttribute('data-gsb-holding', '');
    holdTimer = setTimeout(() => {
      const target = holdEl;
      cancelHold();
      if (!target) return;
      unmark(target);
      manual.delete(target);
      target.setAttribute('data-gsb-revealed', '');
    }, 1200);
  }, true);
  for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, (e) => { swallow(e); cancelHold(); }, true);
  window.addEventListener('pointerout', (e) => { if (holdEl && shieldedFromEvent(e) === holdEl) cancelHold(); }, true);
  for (const type of ['click', 'dblclick', 'auxclick', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'dragstart', 'mouseover', 'mouseenter', 'pointerover', 'pointerenter', 'focusin']) {
    window.addEventListener(type, swallow, { capture: true, passive: false });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    swallow(e);
  }, true);

  // --------------------------------------------------- lifecycle / state ---
  function unhideAll() {
    for (const el of [...hidden]) unmark(el);
    for (const el of document.querySelectorAll('[data-gsb]')) unmark(el);
    for (const r of knownRoots) for (const el of r.querySelectorAll('[data-gsb]')) unmark(el);
    removeShield();
    unmaskTitle();
  }

  function fullScan() {
    if (!active) return;
    maskTitle();
    pageCheck();
    if (document.documentElement) {
      scan(document.documentElement);
      sweepShadowRoots(document.documentElement);
    }
    for (const r of knownRoots) scan(r);
  }

  let settingsLoaded = false;
  function applySettings(next) {
    const merged = P.migrate(next);
    if (JSON.stringify(merged) === JSON.stringify(settings) && settingsLoaded) return;
    settingsLoaded = true;
    if (JSON.stringify(merged) === JSON.stringify(settings)) return;
    const prevStyle = settings.style;
    settings = merged;
    matcher = P.buildMatcher(settings);
    const shouldBeActive = settings.enabled && !P.hostAllowed(location.hostname, settings.allowlist);
    // Rebuild synchronously so nothing paints in between.
    const keepManual = [...hidden].filter((el) => manual.has(el));
    unhideAll();
    active = shouldBeActive;
    if (!active) return;
    for (const el of keepManual) mark(el, true);
    fullScan();
    if (prevStyle !== settings.style) report();
  }

  let reportTimer = 0;
  let lastReported = 0;
  function report() {
    if (reportTimer) return;
    reportTimer = setTimeout(() => {
      reportTimer = 0;
      for (const el of hidden) if (!el.isConnected) hidden.delete(el);
      const count = hidden.size + (shieldHost ? 1 : 0);
      const delta = Math.max(0, count - lastReported);
      lastReported = count;
      send({ type: 'count', count, delta, shielded: !!shieldHost });
    }, 500);
  }

  function send(msg) {
    try {
      const p = api.runtime.sendMessage(msg);
      if (p && p.catch) p.catch(() => {});
    } catch (_) { /* extension reloaded */ }
  }

  // Background asks for state (popup) or tells us to shield something.
  // Chrome has no menus.getTargetElement, so remember what was right-clicked.
  let lastContextTarget = null;
  window.addEventListener('contextmenu', (e) => {
    const path = e.composedPath ? e.composedPath() : [e.target];
    lastContextTarget = path.find((n) => n && n.nodeType === 1) || e.target;
  }, true);

  // sendResponse + return true works in both Firefox and Chrome.
  api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') return undefined;
    if (msg.type === 'getState') {
      sendResponse({ count: hidden.size, shielded: !!shieldHost, reason: shieldReason, active, host: location.hostname });
      return undefined;
    }
    if (msg.type === 'hideTarget') {
      const menus = api.menus || api.contextMenus;
      let el = null;
      try {
        if (menus && menus.getTargetElement && msg.targetElementId != null) el = menus.getTargetElement(msg.targetElementId);
      } catch (_) { /* fall back */ }
      el = el || lastContextTarget;
      if (el) {
        const target = el.nodeType === 1 ? el : el.parentElement;
        const c = pickContainer(target) || target;
        c.removeAttribute('data-gsb-revealed');
        mark(c, true);
      }
    }
    if (msg.type === 'revealAll') {
      for (const el of [...hidden]) {
        unmark(el);
        el.setAttribute('data-gsb-revealed', '');
      }
    }
    return undefined;
  });

  api.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!Object.keys(changes).some((k) => k in P.DEFAULTS)) return;
    api.storage.local.get(P.DEFAULTS).then(applySettings, () => {});
  });

  // SPA navigation: re-evaluate the page shield when the URL changes.
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      pageBypass = false;
      checkBypass();
      maskTitle();
      pageCheck();
    }
  }, 400);
  // Safety net for late shadow roots and anything the observer missed.
  setInterval(() => {
    if (!active || document.hidden || !document.documentElement) return;
    sweepShadowRoots(document.documentElement);
    for (const r of knownRoots) sweepShadowRoots(r);
  }, 2000);

  function checkBypass() {
    try {
      api.runtime.sendMessage({ type: 'isBypassed', url: location.href }).then((yes) => {
        if (yes) {
          pageBypass = true;
          removeShield();
        }
      }, () => {});
    } catch (_) { /* ignore */ }
  }

  // ---------------------------------------------------------------- boot ---
  loadShieldCss();
  function start() {
    observer.observe(document, OBS_OPTS);
    fullScan();
  }
  start();
  checkBypass();
  api.storage.local.get(P.DEFAULTS).then(applySettings, () => {});
  const lateSweep = () => {
    if (!active || !document.documentElement) return;
    maskTitle();
    pageCheck();
    sweepShadowRoots(document.documentElement);
  };
  document.addEventListener('DOMContentLoaded', () => { lateSweep(); setTimeout(lateSweep, 300); });
  window.addEventListener('load', () => { lateSweep(); setTimeout(lateSweep, 1000); });
  report();
})();
