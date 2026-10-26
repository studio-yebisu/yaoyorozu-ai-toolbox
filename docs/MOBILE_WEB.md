# Mobile web layout

The public site is static HTML, CSS and JavaScript in `src/`, copied as-is by `scripts/build.py`. There is no framework, build step for CSS/JS, web font, icon CDN or third-party request. Phones are the base layout; wider screens add to it.

## Files

| File | Role |
| --- | --- |
| `src/index.html`, `src/app.js` | Home: search, cases, fields, catalog, how-to |
| `src/case.html`, `src/case.js` | Case article (`?id=`) and catalog item guide (`?entry=`) |
| `src/ui.js` | Shared helpers loaded first on both pages (`window.SY`): element builder, `safeHref`, bottom bar, title-line joining, editing state |
| `src/styles.css` | One stylesheet for both pages |
| `src/gallery.js`, `src/gallery.css` | Homepage gallery styling and an on-demand native case-preview dialog; loaded only on the homepage |

Counts on the page (entries, fields, case articles) are always computed from `data/catalog.json` and `data/cases.json` at load time. Do not write them into HTML or copy. To check current numbers, run `python scripts/check.py` after a build; it prints them.

## URL contract

Home (`index.html`):

- `?q=<words>` — keyword search over name, summary, use case, tags, kind and field label.
- `?kind=skill` or `?kind=support` — kind filter.
- `?case=1` — only catalog items that a published case points to (`catalog_entry.id`, or a `guide_url` of `case.html?id=…`).
- `#<category id>` (for example `#agents`) — selects that field and scrolls to the catalog. Old links keep working.
- `#cases`, `#feature`, `#fields`, `#catalog`, `#howto`, `#top` — section anchors.
- Choosing a field from the field map or submitting the top search adds a history entry. Typing, the field select, gallery field chips and the toggles replace the current entry. Any filter change returns the catalog to the first page.
- Words and field selection apply to both the case gallery and the catalog. Kind and case-only controls apply to the catalog. Top search moves to the gallery; a catalog link also shows the full catalog's matching count. Gallery field chips update in place, while existing field-map links continue to move to the catalog.
- Opening a case preview leaves the URL and filters unchanged. The card's ordinary article URL remains available for modified clicks, new tabs and browsers without native dialog support.

Article (`case.html`):

- `?id=<case id>` — produced case from `data/cases.json` (falls back to `data/cases/<id>.json`).
- `?entry=<catalog id>` — catalog item. If a case points to it, the page leads to that case; a `source-reviewed` item is shown as a source guide only, never as an executed example.
- Unknown or malformed ids, and unreadable data, show a message with a next step (retry, catalog, case list).

## Layout contract

- Viewport: `width=device-width, initial-scale=1, viewport-fit=cover`. Never add `maximum-scale` or `user-scalable=no`.
- Bands (masthead, sections, footer, article parts) use `max(gutter, env(safe-area-inset-left/right))`, so the inset is never added twice. The masthead adds `env(safe-area-inset-top)`.
- Below 900px a fixed bottom bar (`.tabbar`) holds up to four anchors. `body` reserves `--tabbar-h + env(safe-area-inset-bottom)`. The home bar is ホーム / 分野 / 作例 / 探す; `case.js` replaces it with links that exist for that page (for example 動画 / デモ / 依頼文, or 使い方 / 依頼文 / 原典). There is only ever one bottom row.
- While a text field has focus, `ui.js` sets `html.is-editing` and the bar is hidden, so it does not cover the software keyboard. No keyboard height is measured and no user agent is detected.
- The masthead is sticky; `html { scroll-padding-top }` keeps anchor targets visible below it. On short landscape screens the masthead is static.
- Side columns (catalog filters, article contents) are sticky only at 1100px+ wide and 760px+ tall.
- No `100vh`/`100vw` panels and no `overflow-x: hidden` on the root. Fix overflow with `min-width: 0`, grid tracks and wrapping instead.
- Article `title_lines` are inline phrase blocks on phones. Phrases that fit stay together; longer ones wrap inside the available width. This avoids splitting a short word such as 申請 across adjacent lines. Wide screens keep the authored line breaks.
- Primary controls and navigation targets are at least 44×44px; links within running text retain inline sizing. Body text 16px (17px on desktop), line height 1.7; form controls are at least 16px to avoid iOS focus zoom. Reading width is about 40em.
- Hover styles are inside `@media (hover: hover) and (pointer: fine)`. Motion is limited to a 150ms press scale on buttons and is removed under `prefers-reduced-motion`.

## Media

- Home cards use the shared responsive muted video player. Posters appear before the visible video loads; offscreen cards keep their media unloaded or paused. No demo iframe is created until the visitor requests a demo.
- Opening a case preview creates one native `<dialog>` with a muted, controlled responsive video (`playsinline`, lazy loading and an orientation-specific poster). Selecting the demo mounts only that case's same-origin `examples/…` page in an iframe. Switching media or closing the dialog unloads the previous media. Closing restores the invoking card's focus and the background scroll position.
- In a framed demo, an unhandled Escape outside editing controls closes the outer preview. Inputs keep their native Escape behavior. Links outside that demo's directory leave the frame, so returning to Yaoyorozu AI ToolBox cannot nest another homepage inside the preview. Tab boundaries stay inside the dialog; closed request text is excluded from the focus cycle.
- The preview keeps article and separate-demo links, the exact case request, copy feedback, and a selectable manual-copy fallback. Its note explains that demos use pre-produced samples and do not execute AI live.
- Cards, previews and article videos share `media.js`. Below 700px they use the portrait MP4 and poster; at 700px and above they use the landscape pair. Source layouts are native to each orientation and are never cropped or stretched. The selected video's time is retained when the viewport crosses the breakpoint.
- Videos start muted, inline and looping when at least 15% visible. Offscreen videos, background tabs and gallery cards behind an open preview pause. The play/pause button remains available when autoplay is blocked. Reduced-motion preferences keep playback manual. Native controls in previews/articles let the viewer enable existing audio explicitly.
- Each case provides `video_portrait`, `video_landscape`, `poster_portrait`, and `poster_landscape`. The original `video` and `poster` remain available as the saved original. Articles keep direct MP4, download, both orientation and source links even when playback fails.
- The 2026-10-21 responsive/autoplay maintenance is Codex work, separate from the original Opus-authored examples. The existing 41 portrait/landscape video pairs are reused. Motion2Code's saved reference and Japanese output are composed into a wide pair and a vertically stacked pair without rerunning animation generation.

## Verification on 2026-10-16

`build.py`, `check.py` and JavaScript syntax checks passed. Windows IAB Chromium was used at 320, 375, 390, 430, 844 (landscape), 1280 and 1440px. All 16 existing article pages fitted 320px without page overflow. Native actions checked search, combined filters, pagination, history, prompt clipboard readback, real demo links, error recovery and a complete 28-second MP4 playback. Physical iPhone Safari, VoiceOver and hardware safe areas have not been tested. Automatic checks and agent visual inspection are not human aesthetic approval.

## Gallery verification on 2026-10-17

The gallery and preview were implemented and reviewed with Claude Opus 5.5, then integrated and corrected by the parent agent. This attribution covers the homepage change, not existing examples. The production model's execution records stay private in `.local/runs/`.

The build, publication checks and changed JavaScript syntax checks passed. Windows IAB Chromium confirmed 3 columns at 1440px, 2 at 768px and 1 at 390/320px, with no page overflow. Checked shared search (one result and no results), history restoration, category/catalog synchronization, real iframe filtering, iframe Escape, 14 consecutive Tab steps within the dialog, reverse Tab, backdrop close, focus restoration and media removal. A real video advanced during playback. The browser clipboard contained the exact 3431-character case request; the separate browser-tool clipboard did not reflect the page clipboard, so readback used the browser's own Clipboard API.

Controlled `cases.json` and `catalog.json` HTTP failures each left the other view usable. Returning from the framed `brief-to-demo` page navigated the top page without a nested homepage. Physical Safari/iPhone, assistive technology and human design approval remain untested. This is local verification, not deployment.

## Content safety

- All data is written with `textContent` or text nodes; no HTML from data is parsed.
- Links pass through `SY.safeHref`: `http(s)` URLs and same-site relative paths only. `javascript:`, `data:`, protocol-relative `//`, backslashes and control characters are refused.
- Copy buttons report success only after `navigator.clipboard.writeText` resolves (or the native copy command returns true). On failure the text is expanded and selected, with a note to long-press and copy.
- The home case gallery opens a native modal preview on ordinary clicks. Catalog items continue to open their own article or source-guide pages, so a resource-only listing never gains a fabricated produced preview.

## Test checklist

Run after a build, in a real browser where available:

1. Widths 320, 375, 390 and 430 in portrait, a phone in landscape, and 1280 / 1440 desktop: no horizontal page scroll, the search field visible without scrolling on a phone, bottom bar not covering the last content.
2. Search, field, kind and case toggles, reset, さらに表示, empty result, and back/forward after each.
3. Old hash links (`#agents`, `#feature`, `#catalog`) and shared URLs with `?q=`.
4. Every `case.html?id=` from `data/cases.json` and a sample of `?entry=` items, including a `source-reviewed` one, an unknown id and a malformed id.
5. Video play, the direct MP4 link, demo links, prompt copy (secure and non-secure context), and focus while a text field is active.
6. Catalog or cases file unavailable: the page says so and offers a retry; no zero counts are shown.

References: WebKit, “Designing Websites for iPhone X” (viewport-fit and safe-area insets), https://webkit.org/blog/7929/designing-websites-for-iphone-x/ ; Apple, “Delivering Video Content for Safari”, https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari .

## Image-card sharing pages (2026-10-21)

The build generates 42 primary sharing pages (`share/<id>-card.html`) with static `summary_large_image` and image Open Graph metadata. Each references a 1200×600 JPEG extracted from the credited landscape MP4. Letterboxing preserves the full frame and its burned-in source credit. Images have source/output SHA-256 receipts in `dist/data/social-cards.json`; checks verify the actual JPEG format, dimensions, size and source. URLs use the public HTTPS base from `data/projects.json`.

Sharing pages display the diagram as large as the viewport allows, without a site header, heading or explanatory copy. The diagram and burned-in credit remain intact. Article, download, orientation and license links are available in a small corner menu. Primary sharing pages switch their iframe and credited download to portrait below 700px and landscape at 700px or above. The previous 84 fixed-orientation sharing pages remain available and also advertise image cards. The 84 separate players still use credited MP4s. `embed-player.js` attempts muted inline playback while visible, pauses in the background, keeps native controls, respects reduced-motion preferences, and shows a play button if autoplay is denied.

The sharing controls include the primary image-card URL, mandatory credit and `@studio_yebisu` in the compose intent. X receives a static image card; video playback takes place on the destination page. Local metadata/link/image checks and local playback are separate from X-side recognition. Publicly reachable HTTPS pages and images must be deployed before X-side verification. No X upload or post is performed by the sharing controls; they open a prefilled composer.
