# Server-side availability calendar

The production calendar does not read Calendar.app or depend on a Mac. GitHub
Actions is scheduled at minute 17 of every hour and talks directly to the
calendar providers. It publishes only anonymous occupied intervals.

The data path is:

1. Apple Calendar writes an edit to its provider (iCloud, Google, or IDEA
   Events) using that account's normal synchronization.
2. The isolated availability job signs in to iCloud CalDAV, dynamically finds
   the four selected calendar collections, and asks each collection for a
   bounded `VFREEBUSY` result. iCloud expands recurring events and applies
   cancellation and transparency rules before returning only busy periods.
3. The same job downloads the private Google and IDEA Events iCalendar feeds
   into memory and reduces their events to time intervals.
4. All intervals are rounded outward to 30-minute boundaries, clipped to
   08:00-22:00 in `Asia/Shanghai`, merged, and written to
   `public/availability/busy.json`.
5. Only that allowlisted JSON file moves to the separate Hugo build job. The
   CalDAV credential, discovery XML, collection URLs, iCloud `VFREEBUSY`, and
   Google/IDEA calendar bodies are discarded with the isolated runner.

The Mac may be asleep or offline after the provider has received an edit.
Refresh latency is provider propagation time plus up to approximately one hour
before the next scheduled build.

## Required GitHub Secrets

All six repository secrets must be configured:

```text
ICLOUD_CALDAV_USERNAME
ICLOUD_CALDAV_APP_PASSWORD
ICLOUD_CALDAV_BASE_URL
ICLOUD_CALDAV_CALENDAR_NAMES_JSON
CALENDAR_ICS_URL_1
CALENDAR_ICS_URL_2
```

The two iCalendar slots are ordered: slot 1 is Google and slot 2 is IDEA
Events. `ICLOUD_CALDAV_CALENDAR_NAMES_JSON` is a JSON array containing exactly
four selected iCloud display names. Names, usernames, endpoints, passwords,
collection URLs, and feed URLs are private operational data and do not belong
in the repository, issues, commit messages, or Actions logs.

Add each value under GitHub repository **Settings → Secrets and variables →
Actions → New repository secret**. Never paste credentials or feed URLs into
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

Each selected collection receives a bounded CalDAV `free-busy-query`. A valid
response contains one `VFREEBUSY` with `FREEBUSY` periods rather than original
`VEVENT` fields, so the workflow does not request event titles, locations,
notes, attendees, organizers, or identifiers. A non-conforming response is
rejected in memory; it is never retained, logged, or published.

Important credential boundary: an Apple app-specific password is not a
Calendar-only or server-enforced read-only token. Apple documents that such a
password may let a third-party app access iCloud information including mail,
contacts, and calendars. The repository code is read-only, but the credential
must still be protected and revoked immediately if exposed. It can be revoked
individually in the Apple Account security settings.

Protocol references:

- CalDAV `calendar-home-set` and `free-busy-query`: <https://www.rfc-editor.org/rfc/rfc4791.html>
- Current-user-principal discovery: <https://www.rfc-editor.org/rfc/rfc5397.html>
- Apple app-specific passwords: <https://support.apple.com/zh-cn/102654>

## Google and IDEA Events feeds

For Google Calendar, open **Settings → Settings for my calendars → Integrate
calendar** and copy **Secret address in iCal format**. Google says this address
should not be shared; reset it immediately if it is exposed.

Google documentation: <https://support.google.com/calendar/answer/37648>

For IDEA Events, use Calendar.app's subscription information to copy the
existing subscription URL, or obtain a fresh URL from the IDEA Events
provider. Only an HTTPS or `webcal://` URL hosted by `event.pku-idea.com` is
accepted.

Apple subscription documentation: <https://support.apple.com/zh-cn/guide/calendar/icl1022/mac>

## Fail-closed behavior

The build publishes a ready calendar only when the complete iCloud CalDAV
configuration and both ordered iCalendar sources are present. It fails if any
source, discovery step, selected collection, or free-busy query fails.

Every network request:

- uses HTTPS and manually validates every redirect;
- remains on an allowlisted provider host;
- has strict timeout, redirect, per-response-size, and bounded request-count
  limits;
- keeps bearer URLs, credentials, response bodies, and parser diagnostics out
  of errors and Actions logs.

CalDAV authentication starts only after an allowlisted iCloud host issues a
Basic challenge. Redirects restart without an Authorization header, preventing
credentials from being forwarded to a different origin before it is checked.
Discovery XML rejects DTDs and entities and is parsed with namespace-aware,
bounded logic.

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
