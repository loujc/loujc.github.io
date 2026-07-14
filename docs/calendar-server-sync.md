# Server-side availability calendar

The production calendar does not read Calendar.app or depend on a Mac. GitHub
Actions is scheduled at minute 17 of every hour, downloads six calendar feeds
through secret bearer URLs, and publishes only anonymous occupied intervals.

The data path is:

1. Apple Calendar writes an edit to the calendar provider (iCloud, Google, or
   IDEA Events) using that account's normal synchronization.
2. The provider updates its calendar feed addressed by a bearer URL.
3. A minimal GitHub-hosted availability job fetches all six feeds directly
   from the provider servers.
4. The build rounds outward to 30-minute boundaries, clips to 08:00-22:00 in
   `Asia/Shanghai`, merges overlaps, and writes only `public/availability/busy.json`.
5. The raw iCalendar bodies enter that GitHub-hosted runner, remain in memory,
   and are discarded with it. Only the anonymous JSON moves to the separate
   Hugo build job and final Pages artifact.

The Mac may be asleep or offline after the provider has received the edit.
Refresh latency is the provider's propagation time plus up to approximately one
hour before the next scheduled site build.

## Required GitHub Secrets

Exactly six consecutive repository secrets must be configured:

```text
CALENDAR_ICS_URL_1
CALENDAR_ICS_URL_2
CALENDAR_ICS_URL_3
CALENDAR_ICS_URL_4
CALENDAR_ICS_URL_5
CALENDAR_ICS_URL_6
```

Slots 1-4 are the four selected iCloud calendars, slot 5 is the selected Google
calendar, and slot 6 is the IDEA Events subscription. This mapping is private
operational context; calendar names and feed URLs do not belong in the
repository, issues, commit messages, or Actions logs.

Add each value under GitHub repository **Settings → Secrets and variables →
Actions → New repository secret**. Never paste a feed URL into chat or a shell
command line. If using the GitHub CLI on macOS, copy one URL and stream it from
the clipboard so it does not enter shell history:

```sh
pbpaste | gh secret set CALENDAR_ICS_URL_1 --repo loujc/loujc.github.io
```

Repeat with the appropriate slot number. The workflow exposes these six
secrets only to the main-branch anonymization step in a minimal isolated job;
pull-request builds receive none of them. The actions in that job are pinned to
full commit SHAs, and dependency installation uses the committed lockfile with
lifecycle scripts disabled. Hugo, Pagefind, caches, and downloaded build tools
run later in a different job that never receives the feed URLs or raw ICS.

## Obtaining the feeds

### iCloud (four feeds)

On iCloud.com Calendar, enable **Public Calendar** separately for each selected
calendar and copy its `webcal://` link. A public iCloud calendar link is a bearer
secret: anyone who obtains it can subscribe to the original calendar and see
the event data that calendar publishes. The link must exist for server-side
polling, but it must be stored only as a GitHub Secret.

Apple documentation: <https://support.apple.com/en-euro/guide/icloud/mm6b1a9479/icloud>

### Google (one feed)

In Google Calendar, open **Settings → Settings for my calendars → Integrate
calendar** and copy **Secret address in iCal format**. Google says this address
should not be shared; reset it immediately if it is exposed.

Google documentation: <https://support.google.com/calendar/answer/37648>

### IDEA Events (one feed)

Use Calendar.app's subscription information to copy the existing IDEA Events
URL, or obtain a fresh subscription URL from the IDEA Events provider. Only an
HTTPS or `webcal://` URL hosted by `event.pku-idea.com` is accepted.

Apple subscription documentation: <https://support.apple.com/zh-cn/guide/calendar/icl1022/mac>

## Fail-closed behavior

The build publishes a ready calendar only when all six consecutive secrets
are present and every feed:

- uses HTTPS after `webcal://` normalization;
- remains on an allowlisted provider host through every redirect;
- returns a complete `VCALENDAR` within the response-size and timeout limits;
- parses without exposing diagnostics or private fields.

If one configured source is missing, fails, redirects unsafely, is truncated,
or cannot be parsed, the build fails rather than presenting missing busy time as
free. With no sources (for example, a pull request), the page emits an explicit
unconfigured state. The browser also treats data older than three hours as
unavailable.

GitHub can automatically disable scheduled workflows in a public repository
after 60 days without repository activity. If that happens, re-enable the
workflow from the Actions tab; until then the three-hour stale check keeps the
page from presenting old gaps as current free time.

The public JSON contract contains only the timezone, date window, display
hours, generation time, slot size, status, and merged `{start, end}` intervals.
Publishing occupied-time patterns still reveals when someone is busy; it does
not reveal what the events are about.
