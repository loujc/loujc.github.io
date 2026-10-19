# Homepage — branch `glm53flash`

The static, single-page homepage of [loujc.github.io](https://loujc.github.io), deployed by the repository's GitHub Actions pipeline (see `main:.github/workflows/build.yml`): the `availability` job keeps generating the anonymized `busy.json` from private calendar sources, and the build job assembles this branch with the fresh `busy.json` and deploys it to GitHub Pages. Visual language: the ChipBagel brand palette (cream `#FBF6EF`, ink `#171717`, bagel-caramel accent `#B96E2C`). All profile text, publication metadata, and the portrait come from the site's content (`data/authors/me.yaml`, `content/en|zh/…`), so nothing is invented.

## Branch map

| Branch | Contents |
| --- | --- |
| `main` | Pipeline & content sources: availability scripts, workflows, Hugo content (no longer built as a site) |
| `astra` | "Design study 01" — the earlier local demo, preserved verbatim |
| `glm53flash` | This branch: the static site that is deployed |

## Features

- **Light / dark mode** — toggle in the header, follows system preference by default, persisted in `localStorage`, applied pre-paint to avoid flashes.
- **English / 中文** — toggle in the header, browser-language default, persisted; Chinese copy is taken from the site's official `zh` content where available.
- **Embedded availability calendar** — renders the anonymized busy/free data directly on the page (no second-level page). Data loads live from `https://loujc.github.io/availability/busy.json` (CORS-enabled) and falls back to the local snapshot `availability-snapshot.json`. Week navigation, a "now" line, and a stale-data warning mirror the production block's semantics; the local snapshot can be refreshed with:
  ```sh
  curl -s https://loujc.github.io/availability/busy.json -o availability-snapshot.json
  ```
- **Meeting requests** — click any open block to pick a start time (30 / 60 min, two hours' notice); the request drafts an email or copies the full text (for WeChat or browsers without a mail client). Visitors outside UTC+8 also see their local time. The hero shows the next opening live. Phones get a day picker with start-time chips instead of the 7-column grid.
- **News** — a dated, bilingual ledger (papers, awards, service, ventures, open source); older items fold behind "Earlier news", and items from the last two weeks are highlighted.
- **Publications** — topic filters, full author lists, expandable abstracts, one-click BibTeX, and links to arXiv / PDF / DOI / code.
- **Footprints map** — a dot-matrix canvas map (World / China / Europe) with no map tiles, no third-party requests, and no borders. Land data (Natural Earth 1:50m, public domain) is inlined at the end of `script.js`; `tools/gen-land-mask.mjs` regenerates it. Cities live in `PLACES` in `script.js`.
- **Real brand logos** for GitHub, Xiaohongshu, and WeChat (the WeChat button copies `Nikolas_loujc` to the clipboard with a toast, same behavior as the live site).

## Preview locally

```sh
cd /Users/jclou/loujc.github.io   # with glm53flash checked out
python3 -m http.server 4174 --bind 127.0.0.1
# open http://127.0.0.1:4174/
```

Opening `index.html` directly in a browser also works (only the local snapshot fallback is unavailable over `file://`).

No build step and no runtime dependencies beyond Google Fonts, which load without blocking the first paint (system fonts otherwise). `.nojekyll` is included so the branch can be served directly by GitHub Pages if adopted later.
