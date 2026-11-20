# Store listing kit

Everything to paste into the Chrome Web Store and Firefox Add-ons forms.
Images are in this folder.

| File | Use |
| --- | --- |
| `screenshot-1-blinds.png` … `screenshot-5-settings.png` | Screenshots, 1280×800 (Chrome takes up to 5, Firefox any number) |
| `promo-tile-440x280.png` | Chrome: small promo tile |
| `../icons/icon-128.png` | Chrome: store icon |

Privacy policy URL (both stores):
`https://github.com/FJB-ZA/gta6-spoiler-shield/blob/main/PRIVACY.md`

Support / homepage URL:
`https://github.com/FJB-ZA/gta6-spoiler-shield`

---

## Name

**Spoiler Shield for GTA VI**

This is already the `name` in both manifests, which Chrome uses as the store title.

## Short description

Chrome takes this from the manifest `description` (132 characters max). Firefox
asks for a summary (250 max). This one fits both:

> Keeps GTA VI spoilers off your screen: posts, videos, thumbnails, tags, tab titles and whole pages, wherever you browse.

## Full description

> Waiting to play GTA VI without knowing what happens? Spoiler Shield hides anything about the game while you browse, so the story stays a surprise.
>
> **What it hides**
> • Posts, videos, comments and search results that mention the game. The whole card goes, not just the word.
> • Thumbnails, tags and hashtags, image descriptions and links.
> • Tab titles that give things away.
> • Whole pages about the game, which get a "Do Not Disturb" sign instead.
> • Links and searches about the game, which are stopped before they load.
> • Search suggestions as you type. The search box itself stays usable.
>
> **Peeking is deliberate**
> Hidden posts sit behind closed blinds. Press and hold to open them. A normal click never reveals anything, so there are no accidents.
>
> **Your call**
> • Standard hides the game itself. Paranoid also hides the rest of the series, the studio and the publisher.
> • Choose blinds, awning, frosted glass, a solid block, or remove hidden posts completely.
> • Light, dark, or match your system.
> • Add your own words, and list sites to skip.
> • Alt+Shift+G turns it on or off.
>
> **Private**
> Everything happens in your browser. Nothing is collected or sent anywhere.
>
> Works on YouTube, Reddit, X, Google, Twitch, TikTok, Instagram, Facebook, Discord, Steam and most other sites.
>
> Spoiler Shield is an unofficial fan project. It isn't affiliated with or endorsed by Rockstar Games or Take-Two Interactive. Grand Theft Auto and GTA are their trademarks.

## Category

- Chrome: **Entertainment** (under Lifestyle). Productivity › Tools also fits.
- Firefox: **Privacy & Security**, or **Other** if you'd rather.

---

## Chrome Web Store: Privacy practices tab

**Single purpose**

> Hides content about the video game GTA VI on web pages so the user can avoid spoilers.

**Permission justifications**

| Permission | Why it's needed |
| --- | --- |
| `storage` | Saves the user's settings, their own words to hide, sites to skip and the hidden-item counter on their device. |
| `contextMenus` | Adds right-click options: "Hide this from me", "Hide anything that mentions…", "Show me everything on this page". |
| `webNavigation` | Spots when a tab starts loading a page whose address is about the game, so it can show a stop page instead. |
| Host permission `<all_urls>` | Spoilers can appear on any website, so the extension has to read every page to find and cover them. Pages are checked in the browser; nothing is sent anywhere. |

**Remote code:** No, I am not using remote code. All code is included in the package.

**Data usage:** nothing is sent off the device, so none of the data types strictly apply. If the form or a reviewer pushes back because the extension reads every page, tick **Website content**; the privacy policy already explains that it stays on the device. Then confirm all three statements:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

---

## Firefox Add-ons: submission answers

- **Where:** *On this site* (listed publicly).
- **Source code:** answer **No** to "Do you use any of the following: code generators, minifiers, template engines…". The code is plain and readable, so no separate source upload is needed.
- **Data collection:** already declared as "none" in the manifest.
- **License:** MIT.
- **Notes to reviewer** (optional):

  > Plain, unminified code; no build step besides copying files (build.sh). The extension reads pages locally to hide content about one game and makes no network requests. webRequestBlocking is used only to redirect top-level and frame navigations whose URL is about the game to the bundled stop page (blocked/blocked.html). Bundled fonts are Limelight and Josefin Sans (SIL Open Font License).

---

## Before each new upload

1. Raise `version` in both `manifest.json` and `manifest.chrome.json`.
2. Run `./build.sh`.
3. Upload `dist/gta6-spoiler-shield-chrome.zip` to Chrome and `dist/gta6-spoiler-shield-firefox.xpi` to Firefox.
