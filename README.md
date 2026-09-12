# Homepage redesign — branch `glm53flash`

A static, single-page redesign of [loujc.github.io](https://loujc.github.io), previewing a new visual direction: paper-cream canvas, deep-green ink, editorial typography, and restrained motion. All profile text, publication metadata, and the portrait are taken from the live site's content (`data/authors/me.yaml`, `content/en/…`), so nothing here is invented.

## Branch map

| Branch | Contents |
| --- | --- |
| `main` | Current live Hugo site (HugoBlox academic CV) — untouched |
| `astra` | "Design study 01" — the earlier local demo, preserved verbatim |
| `glm53flash` | This branch: a full static redesign (no Hugo) |

## Preview locally

```sh
cd /Users/jclou/loujc.github.io   # with glm53flash checked out
python3 -m http.server 4173 --bind 127.0.0.1
# open http://127.0.0.1:4173/
```

No build step, no external runtime dependencies (fonts load from Google Fonts with system fallbacks). `.nojekyll` is included so the branch can be served directly by GitHub Pages if adopted later.

## Notes

- The availability section links to the live site's calendar instead of embedding an illustrative mock-up.
- English-first, matching the live site's default language; the Chinese name (楼锦程) is woven into the typography.
- CV file is copied from `main:static/uploads/cv.pdf` so the link works in this branch too.
