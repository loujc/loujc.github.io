# Homepage redesign — branch `glm53flash`

A static, single-page redesign of [loujc.github.io](https://loujc.github.io) in the ChipBagel brand palette (cream `#FBF6EF`, ink `#171717`, bagel-caramel accent `#B96E2C` — extracted from the BP deck). All profile text, publication metadata, and the portrait come from the live site's content (`data/authors/me.yaml`, `content/en|zh/…`), so nothing is invented.

## Branch map

| Branch | Contents |
| --- | --- |
| `main` | Current live Hugo site (HugoBlox academic CV) — untouched |
| `astra` | "Design study 01" — the earlier local demo, preserved verbatim |
| `glm53flash` | This branch: a full static redesign (no Hugo) |

## Features

- **Light / dark mode** — toggle in the header, follows system preference by default, persisted in `localStorage`, applied pre-paint to avoid flashes.
- **English / 中文** — toggle in the header, browser-language default, persisted; Chinese copy is taken from the site's official `zh` content where available.
- **Embedded availability calendar** — renders the anonymized busy/free data directly on the page (no second-level page). Data loads live from `https://loujc.github.io/availability/busy.json` (CORS-enabled) and falls back to the local snapshot `availability-snapshot.json`. Week navigation, today marker, and a stale-data warning mirror the production block's semantics; the local snapshot can be refreshed with:
  ```sh
  curl -s https://loujc.github.io/availability/busy.json -o availability-snapshot.json
  ```
- **Real brand logos** for GitHub, Xiaohongshu, and WeChat (the WeChat button copies `Nikolas_loujc` to the clipboard with a toast, same behavior as the live site).

## Preview locally

```sh
cd /Users/jclou/loujc.github.io   # with glm53flash checked out
python3 -m http.server 4174 --bind 127.0.0.1
# open http://127.0.0.1:4174/
```

No build step and no runtime dependencies beyond Google Fonts (with system fallbacks). `.nojekyll` is included so the branch can be served directly by GitHub Pages if adopted later.
