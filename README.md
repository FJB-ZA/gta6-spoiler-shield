# GTA VI Spoiler Shield (Firefox + Chrome)

Hides everything about GTA VI on every website, before it gets a chance to paint.

> This README contains no spoiler terms. `src/patterns.js` does (it holds the
> detection list), so don't open that file.

## What it catches

| Layer | How |
| --- | --- |
| **Navigation** | Links, bookmarks and searches whose address points at the game are stopped *before the page loads* and land on a stop page. |
| **Whole pages** | If the page title, main headline, or hidden meta tags (`og:title`, `keywords`, `article:tag`…) are about the game, a full-screen shield covers it, scrolling is locked and media is paused. |
| **Tab titles** | Tabs whose title mentions the game are renamed to "🚪 Do not disturb". |
| **Posts, videos, comments, results** | Text is scanned live as pages change. The *whole card* is hidden (video tile, tweet, Reddit post, search result, comment), not just the word. |
| **Tags & hashtags** | A matching tag/hashtag/category chip hides the entire post it belongs to. |
| **Images & links** | `alt`, `title`, `aria-label`, `href`, `src`, `srcset`, `poster`, and background-image URLs. |
| **Tricky text** | Every spelling, Roman numerals, full-width/Unicode tricks, zero-width characters, "G.T.A", terms split across elements, other languages and scripts. |
| **Hidden corners** | iframes/embeds, shadow DOM (incl. closed roots), live chat, autocomplete dropdowns, YouTube end-screen cards, recycled infinite-scroll items. |
| **Your own words** | Add extra words or regexes in Settings, or select text › right-click › *Hide anything that mentions…*. Right-click › *Hide this from me* hides anything by hand. |

Site-specific container rules for YouTube, Reddit, X, Google, Bing, DuckDuckGo,
Twitch, Facebook, Instagram, Threads, TikTok, Discord, Steam, Bluesky, LinkedIn,
Hacker News, Amazon, PlayStation/Xbox stores and others; a generic "card"
heuristic covers everything else.

**Strictness:** *Paranoid* (default) also hides anything about the series as a
whole, the studio and its publisher. *Standard* only hides the game itself.

**Styles:** *Blinds* (default: closed motel blinds that open as you hold),
*Awning* (a striped motel awning pulled down over the post), *Frosted* (frosted glass), *Blackout* (a solid block), *Vanish* (removed
from the page). Covered pages and the stop page show a "Do Not Disturb" door
hanger. Light, dark or auto colours. Original design: no Rockstar logos,
artwork or fonts. Fonts: Limelight and Josefin Sans (SIL Open Font License),
bundled in `fonts/`.

**Peeking is deliberate:** hidden items never open on a click. Press and hold for
1.2 s to reveal one; hold 1.5–2 s to get past a page shield or stop page.

## Install

Run `./build.sh` first (already done for you). It creates:
- `dist/gta6-spoiler-shield-firefox.xpi` and `dist/firefox/`
- `dist/gta6-spoiler-shield-chrome.zip` and `dist/chrome/`

### Firefox Developer Edition / Nightly (permanent, unsigned)
1. Go to `about:config`, set `xpinstall.signatures.required` to `false`.
2. Go to `about:addons` › gear icon › *Install Add-on From File…* › pick `dist/gta6-spoiler-shield-firefox.xpi`.

### Regular Firefox (signed by Mozilla)
Regular Firefox only installs add-ons that Mozilla has signed. Signing an
*unlisted* add-on is free and automatic (usually a few minutes), and it isn't
published on the store.

1. Sign in at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) with a Firefox account.
2. *Submit a New Add-on* › *On your own* › upload `dist/gta6-spoiler-shield-firefox.xpi`.
3. When it's approved, download the signed `.xpi` and open it in Firefox.

Or from the terminal, with API keys from *Tools › Manage API Keys* on that site:

```sh
npx web-ext sign --channel=unlisted --source-dir dist/firefox --api-key=YOUR_ISSUER --api-secret=YOUR_SECRET
```

Bump `version` in `manifest.json` before each new upload. Keep the add-on
`id` as it is: Firefox uses it to recognise updates.

Quick test without signing: `about:debugging#/runtime/this-firefox` › *Load Temporary Add-on…* › `dist/firefox/manifest.json` (gone after a restart).

### Chrome / Edge / Brave
1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and pick the `dist/chrome` folder.
3. Pin it from the puzzle-piece menu so the counter badge shows.

Chrome keeps it installed across restarts. It may show a "developer mode
extensions" reminder at startup; that's normal for unpacked extensions.

**Chrome difference:** Chrome doesn't let extensions cancel a request
outright, so a spoiler link is swapped to the stop page as navigation starts.
If any of the page arrives first, the full-page shield covers it immediately.
Spoiler iframes inside other pages are covered by the in-page shield instead
of the stop page.

### After installing
- Allow it in private windows: Firefox `about:addons` › *Run in Private Windows*; Chrome extension Details › *Allow in Incognito*.
- Turn off address-bar search suggestions; an extension can't filter that dropdown.
- Shortcut: **Alt+Shift+G** toggles the shield.

## Limits
- Images and video frames are judged by their surrounding text, alt text and URLs, not by what's in the pixels.
- Browser UI outside web pages (address-bar suggestions, history, notifications) is out of an extension's reach.

## Development
- `node tests/matcher.test.js`: unit tests for the detection patterns.
- `tests/dom.html`: opens the real content script against realistic markup. Copy the project to a folder whose path doesn't contain the game's name first, or the page shield (correctly) covers the test page.
- Build both browsers: `./build.sh`. `manifest.json` is Firefox's, `manifest.chrome.json` is Chrome's; all other files are shared.

## Licence
MIT, see [LICENSE](LICENSE). The bundled fonts keep their own licence (SIL Open Font License, see `fonts/README.txt`).
