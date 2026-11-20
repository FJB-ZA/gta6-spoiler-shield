/* The "Do Not Disturb" door hanger used by the full-page shield and the stop page.
 * A pink motel door tag hangs off a brass knob on a seafoam door and swings in
 * when it appears. Callers supply what's written under the title. */
(function (root) {
  'use strict';

  // Width of the tag. Everything on the tag top scales from it.
  const css = `
  .gsb-door { position: fixed; inset: 0; overflow: auto; box-sizing: border-box;
    display: grid; justify-items: center; align-content: start; padding: max(5vh, 20px) 16px 32px;
    --w: min(360px, calc(100vw - 32px));
    --ink: #1C3B45; --pink: #F2B5C1; --coral: #E5604F;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, .28), rgba(255, 255, 255, 0) 45%),
      repeating-linear-gradient(90deg, rgba(28, 59, 69, .05) 0 1px, transparent 1px 13px),
      #BFE3D8;
    font: 500 15px/1.45 "GSB Sans", Futura, "Century Gothic", "Avenir Next", system-ui, sans-serif;
    color: var(--ink); -webkit-font-smoothing: antialiased; }
  .gsb-door.night {
    background:
      linear-gradient(0deg, rgba(232, 178, 96, .28), rgba(232, 178, 96, 0) 4px),
      repeating-linear-gradient(90deg, rgba(243, 231, 227, .028) 0 1px, transparent 1px 13px),
      #13272E; }

  .gsb-hang { position: relative; width: var(--w); }
  .gsb-rose, .gsb-knob { position: absolute; left: 50%; top: calc(var(--w) * 62 / 360); border-radius: 50%; transform: translate(-50%, -50%); }
  .gsb-rose { width: calc(var(--w) * 78 / 360); height: calc(var(--w) * 78 / 360);
    background: radial-gradient(circle, #B9893F 0 52%, #CFA55C 53% 70%, #A8792F 100%);
    box-shadow: 0 2px 6px rgba(28, 59, 69, .25); }
  .gsb-knob { z-index: 2; width: calc(var(--w) * 44 / 360); height: calc(var(--w) * 44 / 360);
    background: radial-gradient(circle at 36% 32%, #F6E3B4 0 10%, #DDB66C 34%, #B98A40 72%, #8C6326 100%);
    box-shadow: 0 6px 10px rgba(28, 59, 69, .28), inset 0 -2px 3px rgba(80, 50, 10, .35); }
  .night .gsb-rose { box-shadow: 0 2px 8px rgba(0, 0, 0, .5); }
  .night .gsb-knob { box-shadow: 0 6px 12px rgba(0, 0, 0, .5), inset 0 -2px 3px rgba(80, 50, 10, .4); }

  .gsb-tag { position: relative; z-index: 1; transform-origin: 50% calc(var(--w) * 62 / 360);
    filter: drop-shadow(0 16px 18px rgba(28, 59, 69, .2)) drop-shadow(0 2px 2px rgba(28, 59, 69, .12));
    animation: gsb-swing 1.7s cubic-bezier(.32, .72, .42, 1) both; }
  .night .gsb-tag { filter: drop-shadow(0 18px 22px rgba(0, 0, 0, .5)) drop-shadow(0 2px 2px rgba(0, 0, 0, .3)); }
  .gsb-top { display: block; width: 100%; height: auto; }
  .gsb-top path { fill: var(--pink); }
  .gsb-body { margin-top: -1px; background: var(--pink); border-radius: 0 0 14px 14px;
    padding: 4px 34px 32px; text-align: center; }
  @keyframes gsb-swing {
    0% { transform: rotate(-9deg); }
    32% { transform: rotate(5deg); }
    56% { transform: rotate(-2.6deg); }
    78% { transform: rotate(1deg); }
    100% { transform: rotate(0); }
  }

  .gsb-eyebrow { font-weight: 600; font-size: 12px; letter-spacing: .44em; text-transform: uppercase; margin: 0 0 6px; padding-left: .44em; }
  .gsb-title { margin: 0; font: 400 calc(var(--w) * 48 / 360)/.98 "GSB Deco", "Didot", "Bodoni 72", Georgia, serif; letter-spacing: .01em; }
  .gsb-rule { position: relative; width: 150px; height: 9px; margin: 16px auto 14px;
    background: linear-gradient(var(--ink), var(--ink)) 0 50% / 62px 1px no-repeat,
                linear-gradient(var(--ink), var(--ink)) 100% 50% / 62px 1px no-repeat; }
  .gsb-rule::after { content: ""; position: absolute; left: 50%; top: 50%; width: 7px; height: 7px;
    background: var(--ink); transform: translate(-50%, -50%) rotate(45deg); }
  .gsb-lead { margin: 0; font-size: 17px; font-weight: 600; }
  .gsb-note { margin: 6px 0 0; font-size: 14.5px; }
  .gsb-why { margin: 10px 0 0; font-size: 13.5px; opacity: .75; }
  .gsb-why b { font-weight: 700; }

  .gsb-actions { display: grid; gap: 8px; margin-top: 20px; }
  .gsb-btn { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 13px 14px 11px; border-radius: 4px; cursor: pointer;
    font: 600 12.5px/1.2 "GSB Sans", Futura, "Century Gothic", system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; text-align: center;
    user-select: none; -webkit-user-select: none; -moz-user-select: none; }
  .gsb-btn:focus-visible, .gsb-link:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  .gsb-solid { background: var(--ink); color: #F8ECEE; }
  .gsb-solid:hover { background: #24505C; }
  .gsb-hold { box-shadow: inset 0 0 0 1.5px var(--ink); color: var(--ink);
    background: linear-gradient(var(--coral), var(--coral)) 0 0 / 0% 100% no-repeat; }
  .gsb-hold:hover { background-color: rgba(28, 59, 69, .06); }
  .gsb-hold.on { background-size: 100% 100%; transition: background-size var(--hold, 1.5s) linear; box-shadow: inset 0 0 0 1.5px var(--coral); }
  .gsb-hold[disabled] { opacity: .4; cursor: default; }
  .gsb-link { all: unset; display: inline-block; margin-top: 14px; cursor: pointer; font-size: 13px; font-weight: 500;
    text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
  .gsb-door [hidden] { display: none !important; }

  /* Small frames: just the tag, no knob or swing. */
  .gsb-door.compact { padding: 12px; align-content: center; --w: min(320px, calc(100vw - 24px)); }
  .compact .gsb-top, .compact .gsb-rose, .compact .gsb-knob, .compact .gsb-eyebrow, .compact .gsb-rule,
  .compact .gsb-note, .compact .gsb-link, .compact .gsb-why { display: none; }
  .compact .gsb-tag { animation: none; }
  .compact .gsb-body { border-radius: 10px; padding: 18px 20px; }
  .compact .gsb-title { font-size: 24px; }
  .compact .gsb-lead { margin-top: 8px; font-size: 14px; }
  .compact .gsb-actions { margin-top: 12px; }

  @media (prefers-reduced-motion: reduce) {
    .gsb-tag { animation: none; }
    .gsb-hold.on { transition-duration: var(--hold, 1.5s); }
  }`;

  // Tag top: domed corners and a hole for the knob.
  const top = `<svg class="gsb-top" viewBox="0 0 360 124" aria-hidden="true">
    <defs><mask id="gsb-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="124">
      <rect width="360" height="124" fill="#fff"/>
      <circle cx="180" cy="62" r="28" fill="#000"/>
    </mask></defs>
    <path mask="url(#gsb-cut)" d="M0 124 V44 A44 44 0 0 1 44 0 H316 A44 44 0 0 1 360 44 V124 Z"/>
  </svg>`;

  function isNight(tone) {
    if (tone === 'dark') return true;
    if (tone === 'light') return false;
    try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (_) { return false; }
  }

  // opts: { content: html below the rule, night, compact, titleId }
  function html(opts) {
    const o = opts || {};
    const cls = ['gsb-door', o.night ? 'night' : '', o.compact ? 'compact' : ''].filter(Boolean).join(' ');
    const id = o.titleId || 'gsb-title';
    return `<div class="${cls}">
      <div class="gsb-hang">
        <span class="gsb-rose" aria-hidden="true"></span>
        <div class="gsb-tag" role="alertdialog" aria-labelledby="${id}">
          ${top}
          <div class="gsb-body">
            <p class="gsb-eyebrow">Please</p>
            <h1 class="gsb-title" id="${id}">Do Not<br>Disturb</h1>
            <div class="gsb-rule" aria-hidden="true"></div>
            ${o.content || ''}
          </div>
        </div>
        <span class="gsb-knob" aria-hidden="true"></span>
      </div>
    </div>`;
  }

  // Applies a tone to doors already on the page (used when settings change).
  function applyTone(tone, rootNode) {
    const dark = isNight(tone);
    for (const el of (rootNode || document).querySelectorAll('.gsb-door')) el.classList.toggle('night', dark);
    return dark;
  }


  root.GSBHanger = { css, html, isNight, applyTone };
})(typeof globalThis !== 'undefined' ? globalThis : this);
