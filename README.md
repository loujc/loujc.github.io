# Jincheng Lou - Academic Homepage

Personal academic homepage for [Jincheng Lou](https://github.com/loujc), built
with the [HugoBlox Academic CV](https://github.com/HugoBlox/theme-academic-cv)
template and prepared for deployment with GitHub Pages.

## Local development

The project requires Hugo Extended 0.164.0 and pnpm 10.14.0.

```bash
pnpm install
pnpm dev
```

Build the production site with:

```bash
pnpm build
```

## Privacy-preserving availability

The public availability calendar is refreshed by GitHub Actions from iCloud
CalDAV and an anonymous IDEA calendar snapshot created locally with EventKit.
The Mac is needed only when that infrequently changing snapshot is refreshed;
it does not need to be online for website builds. iCloud is queried with a
privacy-minimal projection, while the IDEA snapshot is a fixed-length
occupied/free bitmap. Both sources meet at one final anonymization boundary.
Titles, locations, notes, attendees, organizers, event identifiers,
credentials, and calendar names are never written to the site or repository.

See [`docs/calendar-server-sync.md`](docs/calendar-server-sync.md) for the
server-side sync model, secret setup, failure behavior, and privacy boundary.

## Content

- English content: `content/en/`
- Chinese content: `content/zh/`
- English author data: `data/authors/me.yaml`
- Chinese author data: `data/zh/authors/me.yaml`
- Local preview defaults to English at `/` and Chinese at `/zh/`

The site source is MIT licensed through the upstream template. Publication
metadata, abstracts, the portrait, and the CV remain the property of their
respective authors and rights holders.
