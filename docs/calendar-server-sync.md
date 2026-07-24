# Privacy-preserving availability calendar

GitHub Actions is scheduled at minute 0 and minute 30 of every hour. It reads
iCloud directly from its server and combines it with a pre-anonymized IDEA
snapshot created locally with EventKit. The Mac is needed only to refresh that
infrequently changing snapshot, not to build or serve the website.

The data path is:

1. Apple Calendar continues to synchronize edits normally with each provider.
2. When the IDEA calendar changes, a local EventKit helper queries its expanded
   occurrences, ignores cancelled or explicitly free events, and immediately
   converts the result to a fixed-length occupied/free bitmap. It never reads
   event titles, notes, locations, attendees, organizers, or identifiers.
3. The anonymous bitmap is streamed directly into a repository Actions Secret;
   no raw calendar export or IDEA account credential is uploaded.
4. The isolated availability job connects to the four selected iCloud CalDAV
   collections and decodes the IDEA bitmap in memory.
5. Both sources are rounded to 30-minute boundaries, clipped to
   08:00-22:00 in `Asia/Shanghai`, merged, and written to
   `public/availability/busy.json`.
6. Only that allowlisted JSON file moves to the separate Hugo build job. The
   iCloud credential, discovery XML, opaque collection/resource URLs,
   time-only CalDAV response bodies, and IDEA source bitmap are discarded with
   the isolated runner.

The Mac may be asleep or offline between IDEA snapshot refreshes. iCloud refresh
latency is provider propagation time plus up to approximately 30 minutes. IDEA
changes appear after the local refresh command and the next successful
scheduled build. GitHub documents that scheduled Actions may still be delayed
or dropped during periods of high load:
<https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>.

## Required GitHub Secrets

All five repository secrets must be configured:

```text
ICLOUD_CALDAV_USERNAME
ICLOUD_CALDAV_APP_PASSWORD
ICLOUD_CALDAV_BASE_URL
ICLOUD_CALDAV_CALENDAR_NAMES_JSON
IDEA_BUSY_SNAPSHOT
```

`ICLOUD_CALDAV_CALENDAR_NAMES_JSON` is a JSON array containing exactly four
selected iCloud display names. `IDEA_BUSY_SNAPSHOT` is a compact bitmap produced
locally and contains no event metadata or account credential. Calendar names,
usernames, endpoints, passwords, collection URLs, and source bitmaps are private
operational data and do not belong in the repository, issues, commit messages,
or Actions logs.

Add each value under GitHub repository **Settings → Secrets and variables →
Actions → New repository secret**. Never paste credentials into
chat or a shell command line. With the GitHub CLI on macOS, copy one value and
stream it from the clipboard so it does not enter shell history:

```sh
pbpaste | gh secret set SECRET_NAME --repo loujc/loujc.github.io
```

These secrets are exposed only to the main-branch anonymization step in a
minimal isolated job. Pull-request builds receive none of them. The actions in
that job are pinned to full commit SHAs, and dependency installation uses the
committed lockfile with lifecycle scripts disabled. Hugo, Pagefind, caches, and
downloaded build tools run later in a different job that receives only the
anonymous JSON artifact.

## iCloud CalDAV

Create a dedicated app-specific password at
<https://account.apple.com/account/manage>. No Public Calendar link is needed.
The workflow uses only the read operations `PROPFIND` and `REPORT`; it contains
no code path for `PUT`, `POST`, `DELETE`, `MKCOL`, or `PROPPATCH`.

`ICLOUD_CALDAV_USERNAME` must be the Apple Account username for the iCloud
calendar account, not an unrelated iCloud mail alias. `ICLOUD_CALDAV_BASE_URL`
must be the CalDAV service URL assigned to that account and region; it can be
an `icloud.com.cn` partition for accounts hosted in China. During one-time
setup, both values can be read from the signed-in Mac's local Internet Accounts
metadata and streamed directly to GitHub Secrets without printing them. The
workflow then performs standards-based discovery on every run and never stores
principal, home, or collection paths in repository configuration.

On every run, the client follows the standard CalDAV discovery chain from the
configured iCloud endpoint to the current principal, calendar home, and child
calendar collections. It selects the four configured display names exactly.
A missing name, duplicate name, duplicate URL, non-calendar collection, or
unexpected host fails the entire run before availability is published.

Each selected collection receives a bounded CalDAV `calendar-query` with
server-side recurrence expansion. Its `calendar-data` projection requests only
`DTSTART`, `DTEND`, `DURATION`, `STATUS`, `TRANSP`, and the time-valued
`RECURRENCE-ID` required for expanded repeating instances, plus an explicitly
empty `VALARM` component. It does not request titles, locations, notes,
attendees, organizers, event identifiers such as `UID`, or recurrence rules.
The parser accepts only that allowlist and rejects a response containing any
other event or alarm field.

Time values may be UTC, all-day dates, or local date-times carrying a valid
IANA `TZID`. The timezone parameter is used only to convert the event boundary
to an instant; it is not retained or published.

For expanded repeating events, iCloud also supplies the exact VCALENDAR
markers `X-EXPANDED`, `X-MASTER-DTSTART`, and `X-MASTER-RRULE` even though they
are not requested, and it does not honor `novalue="yes"` for them. The client
accepts them only as a complete group after strict boolean, date-time, and
recurrence-rule syntax validation, then discards them. They contain recurrence
timing metadata, never event content, and are not transferred or published.

CalDAV multistatus responses necessarily contain opaque collection or resource
paths. Those paths and the time-only response body exist briefly in isolated
runner memory, but are never retained, logged, transferred to the Hugo job, or
published. A non-conforming response stops the run instead of producing an
incomplete availability file.

Important credential boundary: an Apple app-specific password is not a
Calendar-only or server-enforced read-only token. Apple documents that such a
password may let a third-party app access iCloud information including mail,
contacts, and calendars. The repository code is read-only, but the credential
must still be protected and revoked immediately if exposed. It can be revoked
individually in the Apple Account security settings.

Protocol references:

- CalDAV `calendar-home-set`, `calendar-query`, partial retrieval, and recurrence
  expansion: <https://www.rfc-editor.org/rfc/rfc4791.html>
- Current-user-principal discovery: <https://www.rfc-editor.org/rfc/rfc5397.html>
- Apple app-specific passwords: <https://support.apple.com/zh-cn/102654>

## IDEA anonymous snapshot

The IDEA source is taken from the already synchronized Apple Calendar account,
but Calendar.app itself is not queried by GitHub Actions. A small local EventKit
helper selects exactly one configured CalDAV calendar and asks EventKit for
expanded occurrences, including recurring instances and detached exceptions.
The implementation accesses only start/end boundaries, cancellation status,
and free/busy availability. It contains no event save, update, or delete path.

macOS grants EventKit calendar reading through the system's full-calendar-access
permission; it does not offer a separate read-only authorization level. The
helper is therefore intentionally narrow and auditable even though the system
permission dialog is broader than the fields it uses.

Before leaving the Mac, every occurrence is filtered, rounded outward, clipped
to the public 08:00-22:00 display window, and encoded as a fixed 30-minute-slot
bitmap. The bitmap covers 400 days, is capped at 8 KiB, and contains no calendar
name, event count, identifier, title, or raw event timestamp. It is streamed
directly to `IDEA_BUSY_SNAPSHOT` and never committed.

Refresh the snapshot whenever the IDEA calendar changes and at least once every
90 days. The refresh helper prints only a fixed success or failure message; it
does not print the bitmap or occupied times:

```sh
./scripts/install-idea-snapshot-helper.sh
./scripts/refresh-idea-snapshot.sh
```

The selected calendar name is stored only in a mode-`0600` file under the
user's local Application Support directory. It is not accepted as a command-line
argument and is never added to the repository.

Apple references:

- EventKit event-store access: <https://developer.apple.com/documentation/eventkit/accessing-the-event-store>
- Date-range event retrieval: <https://developer.apple.com/documentation/eventkit/retrieving-events-and-reminders>

## Fail-closed behavior

The build publishes a ready calendar only when both source groups are complete:
four iCloud CalDAV secrets and one IDEA bitmap secret. If one group is absent or
partial, the production run fails instead of treating that source as free. The
production workflow also fails when all five secrets are absent; only
pull-request previews may emit the explicit unconfigured state. It also fails
if any source, discovery step, selected collection, parser, or time-only
calendar query fails.

The IDEA snapshot is accepted only when its JSON keys, encoding identifier,
timezone, slot size, display hours, coverage dates, canonical Base64, decoded
length, and zero padding bits exactly match repository policy. It must be no
more than 90 days old and fully cover the current 56-day public window. Any
failure stops deployment instead of interpreting missing bits as free time.

Every network request:

- uses HTTPS and manually validates every redirect;
- remains on an allowlisted provider host;
- has strict timeout, redirect, per-response-size, and bounded request-count
  limits;
- keeps account endpoints, credentials, response bodies, and parser diagnostics
  out of errors and Actions logs.

CalDAV authentication starts without an Authorization header and retries only
after the validated iCloud endpoint explicitly offers a Basic challenge.
Redirects are manual and restart without credentials; every new endpoint must
issue its own challenge. iCloud remains inside its configured host allowlist.
Discovery XML rejects DTDs and entities and is parsed with namespace-aware,
bounded logic. IDEA requires no provider endpoint or credential in Actions.

With no production sources (for example, a pull request), the page emits an
explicit unconfigured state. A partial configuration is an error rather than a
partially empty calendar. The browser also treats data older than three hours
as unavailable.

GitHub can automatically disable scheduled workflows in a public repository
after 60 days without repository activity. If that happens, re-enable the
workflow from the Actions tab; until then the three-hour stale check prevents
old gaps from appearing current.

The public JSON contract contains only the timezone, date window, display
hours, generation time, slot size, status, and merged `{start, end}` intervals.
Publishing occupied-time patterns still reveals when someone is busy; it does
not reveal what the events are about.
