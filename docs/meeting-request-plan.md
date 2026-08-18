# Static Meeting-Request Plan

## Current mechanism

The homepage reads the published `/availability/busy.json` snapshot through the
existing availability block. The renderer validates the complete payload before
showing either the calendar or the request controls. A valid, fresh `ready`
snapshot is required, and the current date must remain inside its published
window.

The request controls offer 30- and 60-minute durations. Candidate starts are
aligned to the published `slot_minutes`, converted from the published IANA
timezone to UTC, kept inside `display_hours` and `window_start`/`window_end`,
excluded when they overlap any anonymous busy interval, and held behind a
24-hour minimum notice window. The requester supplies only a name and reply
email as required fields; context is optional.

Submitting the form performs a second uncached read of `busy.json` and repeats
the freshness, window, duration, and conflict checks. The page then prepares a
prefilled `mailto:` draft containing the candidate time, both timezones, the
requester details, and an explicit request-not-booking notice. A copy action is
also available when a browser has no local mail handler.

This is a request workflow, not booking. The page cannot know whether a mail
client opened or sent the draft, cannot reserve a slot atomically, and never
writes calendar events.

## Architecture

- `availability-calendar.js` owns payload validation, calendar rendering,
  fail-closed state transitions, form state, and the final recheck.
- `availability-scheduling.js` contains the timezone conversion, candidate-slot
  filtering, and URL-safe `mailto:` construction used by the browser and the
  focused Node tests.
- The Hugo availability partial supplies bilingual strings, the public profile
  recipient, and the semantic form/review markup. No private calendar fields
  reach the page.
- CSS keeps the request area as an unframed section below the calendar rather
  than nesting another card inside the calendar card; the layout collapses to a
  single column on small screens.

## Privacy and failure behavior

Only the already-public anonymous `start` and `end` intervals are read. Names,
email addresses, and optional context stay in page memory and the locally
generated `mailto:` draft; they are not added to the page URL, stored in browser
storage, sent to a site endpoint, or added to a calendar.

Malformed, unconfigured, stale, out-of-window, or failed payloads hide all
candidate controls. The direct email fallback remains available, but the page
does not infer free time from a failed or stale snapshot. A candidate that
changes during the final recheck is discarded and the requester must choose
again.

## Future optional server-backed booking

If real booking becomes necessary, use a hosted scheduler or a small
authenticated serverless service connected directly to Apple Calendar/CalDAV.
That service should perform the authoritative conflict check and atomic event
creation immediately before confirmation, enforce notice and buffer policies,
rate-limit abuse, validate and protect requester data, and send transactional
email. It must not treat the delayed anonymous `busy.json` snapshot as its
source of truth. The static request flow should remain as a transparent
fallback until that end-to-end service is deployed and monitored.
