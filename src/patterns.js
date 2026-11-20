/*
 * ⚠️  SPOILER WARNING ⚠️
 * This file contains the detection patterns, which include character, place
 * and codename terms. If you are avoiding spoilers, don't read past this line.
 *
 * Shared by the content script, background script, popup and options page.
 */
(function (root) {
  'use strict';

  const DEFAULTS = Object.freeze({
    enabled: true,
    strictness: 'paranoid', // 'standard' | 'paranoid'
    style: 'blinds', // 'blinds' | 'awning' | 'frosted' | 'blackout' | 'vanish'
    tone: 'auto', // 'auto' (follow the system) | 'light' | 'dark'
    pageShield: true, // full-page shield when the page itself is about the game
    blockNavigation: true, // intercept navigation to matching URLs before they load
    maskTitles: true, // rewrite tab titles that mention the game
    pauseMedia: true, // pause video/audio on shielded pages and inside hidden items
    customKeywords: [],
    allowlist: [],
  });

  // ---------------------------------------------------------------- text ---
  // Every pattern runs against normalize()d text: NFKC, lower-case, invisible
  // characters stripped, spaced-out letters ("g.t.a", "g t a") joined.
  const SEP = String.raw`[\s\-_.:#·•|/~,'’"“”()\[\]]*`;
  const L = String.raw`(?<![a-z0-9])`; // left word boundary that works next to # and digits
  const R = String.raw`(?![a-z0-9])`;
  const AND = String.raw`\s*(?:&|and|\+|y|et|und|e|og|en|i)\s*`;
  const LUCIA = 'luc[iíì]a';

  const TEXT_STANDARD = [
    // the title itself, every way people write it
    `${L}gta${SEP}(?:6|vi|six|ⅵ)${R}`,
    `${L}gta${SEP}6(?!\\d)`, // gta6news, #gta6leaks
    `${L}gtavi(?:news|leaks?|trailers?|online|info|hub|daily|updates?|fans?|community|official|maps?|gameplay|memes?|spoilers?)`,
    `grand${SEP}theft${SEP}auto${SEP}(?:6|vi|six|ⅵ)${R}`,
    `${L}grandtheftauto(?:6|vi)`,
    `${L}(?:the\\s+)?(?:new|next|upcoming|latest)\\s+gta${R}`,
    `${L}gta\\s*(?:trailer|leaks?|release\\s*date|map|gameplay|spoilers?|ending|story|protagonists?)${R}`,
    // setting
    `${L}vice${SEP}city${R}`,
    `${L}leonida${R}`,
    `${L}port\\s+gellhorn${R}`,
    `${L}grass\\s*rivers${R}`,
    `${L}mount\\s+kalaga${R}`,
    // people
    `${L}${LUCIA}\\s+caminos${R}`,
    `${L}jason\\s+duval${R}`,
    `${L}jason${AND}${LUCIA}${R}`,
    `${L}${LUCIA}${AND}jason${R}`,
    `${L}cal\\s+hampton${R}`,
    `${L}boobie\\s+ike${R}`,
    `${L}dre[\\s'’\\-]?quan${R}`,
    `${L}real\\s+dimez${R}`,
    `${L}bae[\\s\\-]?luxe${R}`,
    `${L}ra[uú]l\\s+bautista${R}`,
    `${L}brian\\s+heder${R}`,
    // codename
    `${L}project\\s+americas${R}`,
    // other scripts
    String.raw`гта\s*(?:6|vi)`,
    String.raw`гранд\s*тефт\s*авто\s*(?:6|vi)`,
    String.raw`侠盗猎车手\s*(?:6|vi)`,
    String.raw`俠盜獵車手\s*(?:6|vi)`,
    String.raw`グランド\s*・?\s*セフト\s*・?\s*オート\s*(?:6|vi)`,
    String.raw`グラセフ\s*(?:6|vi)`,
    String.raw`그랜드\s*테프트\s*오토\s*(?:6|vi)`,
  ];

  // Paranoid also catches anything about the franchise, the studio, or its
  // publisher, since right now that is almost always about the new game.
  const TEXT_PARANOID = [
    `${L}gta${R}`,
    `${L}gtas${R}`,
    `grand${SEP}theft${SEP}auto`,
    `${L}grandtheftauto`,
    `${L}rockstar${SEP}(?:games|north|newswire|launcher|social\\s*club|support)${R}`,
    `${L}rockstar[’']?s\\s+(?:next|new|upcoming|latest|open[\\s-]world)`,
    `${L}rockstargames${R}`,
    `${L}take[\\-‐–]two${R}`,
    `${L}take\\s*two\\s+interactive${R}`,
    `${L}strauss\\s+zelnick${R}`,
    `${L}r\\*(?=\\s|$|[.,!?:;'’])`,
    `${L}gellhorn${R}`,
    `${L}kalaga${R}`,
    `${L}caminos\\s+(?:and|&)\\s+duval`,
    `${L}duval${AND}caminos`,
    `${L}гта${R}`,
    String.raw`侠盗猎车手`,
    String.raw`俠盜獵車手`,
    String.raw`グランド\s*・?\s*セフト\s*・?\s*オート`,
    String.raw`グラセフ`,
    String.raw`그랜드\s*테프트\s*오토`,
  ];

  // ----------------------------------------------------------------- url ---
  // Run against a decoded, lower-cased URL ("+" turned into spaces).
  const U = String.raw`[\W_]*`;
  const URL_STANDARD = [
    `${L}gta${U}(?:6|vi|six)${R}`,
    `${L}gta${U}6(?!\\d)`,
    `grand${U}theft${U}auto${U}(?:6|vi|six)${R}`,
    `${L}vice${U}city${R}`,
    `${L}leonida${R}`,
    String.raw`rockstargames\.com/(?:[a-z]{2}(?:-[a-z]{2})?/)?vi(?![a-z0-9])`,
    `${L}jason${U}(?:and|&)?${U}lucia${R}`,
    `${L}lucia${U}caminos${R}`,
    `${L}jason${U}duval${R}`,
    `${L}port${U}gellhorn${R}`,
    String.raw`/r/gta(?:6|vi)(?![a-z0-9])`,
  ];
  const URL_PARANOID = [
    `${L}gta${R}`,
    `${L}gtas${R}`,
    `${L}gtaonline`,
    `grand${U}theft${U}auto`,
    String.raw`(?:^|[./])(?:gtaforums|gtabase|gtaboom|gtaall|gtainside|gta-?mods|gta5-?mods|gtaweb|gtanet|gtavision|igta|rockstarintel|rockstarnewswire|rockstargames|socialclub\.rockstargames)\.`,
    String.raw`rockstar${U}(?:games|north|newswire)`,
    String.raw`/r/(?:gta\w*|rockstar\w*|grandtheftauto\w*)(?:/|$|\?)`,
    String.raw`take${U}two${U}interactive`,
    String.raw`(?:^|[/?&=.])take-two(?![a-z])`,
  ];

  // ------------------------------------------------------------ helpers ---
  const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠎​-‏‪-‮⁠-⁤⁪-⁯ㅤ︀-️﻿⃣]/g;
  const SPACED_GTA = /(?<![a-z0-9])g[\s.\-_*·•]{1,3}t[\s.\-_*·•]{1,3}a(?![a-z])/g;

  function normalize(s) {
    if (!s) return '';
    if (s.length > 200000) s = s.slice(0, 200000);
    try { s = s.normalize('NFKC'); } catch (_) { /* lone surrogates */ }
    s = s.toLowerCase().replace(INVISIBLE, '');
    if (s.indexOf('g') !== -1) s = s.replace(SPACED_GTA, 'gta');
    return s;
  }

  function normalizeUrl(u) {
    if (!u) return '';
    let s = String(u);
    if (s.length > 8000) s = s.slice(0, 8000);
    s = s.replace(/\+/g, ' ');
    for (let i = 0; i < 2; i++) {
      try {
        const d = decodeURIComponent(s);
        if (d === s) break;
        s = d;
      } catch (_) {
        break;
      }
    }
    return normalize(s);
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // "/regex/" is used as-is; anything else is a literal phrase with word
  // boundaries, where any run of spaces also matches -, _, ., etc.
  function keywordToPatterns(raw) {
    const kw = String(raw || '').trim();
    if (!kw) return null;
    const re = /^\/(.+)\/[a-z]*$/i.exec(kw);
    if (re) {
      try {
        new RegExp(re[1], 'i');
        return { text: re[1], url: re[1] };
      } catch (_) {
        return null;
      }
    }
    const k = normalize(kw);
    const words = k.split(/\s+/).filter(Boolean).map(escapeRe);
    if (!words.length) return null;
    const lb = /^[a-z0-9]/.test(k) ? L : '';
    const rb = /[a-z0-9]$/.test(k) ? R : '';
    return {
      text: lb + words.join(SEP) + rb,
      url: lb + words.join(U) + rb,
    };
  }

  function compile(list) {
    const parts = [];
    for (const p of list) {
      try {
        new RegExp(p, 'i');
        parts.push('(?:' + p + ')');
      } catch (e) {
        /* skip invalid custom regex */
      }
    }
    if (!parts.length) return null;
    return new RegExp(parts.join('|'), 'i');
  }

  function buildMatcher(settings) {
    const s = Object.assign({}, DEFAULTS, settings || {});
    const paranoid = s.strictness !== 'standard';
    const text = TEXT_STANDARD.slice();
    const url = URL_STANDARD.slice();
    if (paranoid) {
      text.push(...TEXT_PARANOID);
      url.push(...URL_PARANOID);
    }
    for (const kw of s.customKeywords || []) {
      const p = keywordToPatterns(kw);
      if (p) {
        text.push(p.text);
        url.push(p.url);
      }
    }
    const textRe = compile(text);
    const urlRe = compile(url);
    return {
      text(str) {
        if (!str || !textRe) return false;
        return textRe.test(normalize(str));
      },
      // for strings that are already normalize()d
      textNormalized(str) {
        return !!(str && textRe && textRe.test(str));
      },
      url(str) {
        if (!str || !urlRe) return false;
        return urlRe.test(normalizeUrl(str));
      },
    };
  }

  function hostAllowed(host, allowlist) {
    if (!host) return false;
    host = String(host).toLowerCase().replace(/^www\./, '');
    for (let entry of allowlist || []) {
      entry = String(entry).trim().toLowerCase().replace(/^\*\./, '').replace(/^www\./, '');
      if (!entry) continue;
      if (host === entry || host.endsWith('.' + entry)) return true;
    }
    return false;
  }

  // Older versions called these styles 'sunset' and 'redacted'.
  const STYLES = ['blinds', 'awning', 'frosted', 'blackout', 'vanish'];
  const LEGACY_STYLES = { sunset: 'blinds', redacted: 'blackout' };
  function migrate(settings) {
    const s = Object.assign({}, DEFAULTS, settings || {});
    if (LEGACY_STYLES[s.style]) s.style = LEGACY_STYLES[s.style];
    if (!STYLES.includes(s.style)) s.style = DEFAULTS.style;
    return s;
  }

  function cleanList(text) {
    return String(text || '')
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  root.GSBPatterns = {
    DEFAULTS,
    normalize,
    normalizeUrl,
    buildMatcher,
    hostAllowed,
    cleanList,
    keywordToPatterns,
    migrate,
    STYLES,
    LEGACY_STYLES,
    counts: {
      standard: TEXT_STANDARD.length + URL_STANDARD.length,
      paranoid: TEXT_STANDARD.length + URL_STANDARD.length + TEXT_PARANOID.length + URL_PARANOID.length,
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.GSBPatterns;
})(typeof globalThis !== 'undefined' ? globalThis : this);
