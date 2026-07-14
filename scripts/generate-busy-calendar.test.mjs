import assert from 'node:assert/strict';
import test from 'node:test';

import {DateTime} from 'luxon';

import {
  assertPublicPayload,
  calendarSourceUrlsFromEnvironment,
  fetchCalendarSource,
  fetchCalendarSources,
  normalizeCalendarSourceUrl,
  sanitizeCalendarText,
  unconfiguredPayload,
} from './generate-busy-calendar.mjs';

const config = {
  timezone: 'Asia/Shanghai',
  horizon_days: 10,
  slot_minutes: 30,
  stale_after_hours: 3,
  expected_remote_source_count: 3,
  required_remote_source_hosts: [
    '*.icloud.com',
    'calendar.google.com',
    'calendar.google.com',
  ],
  allowed_source_hosts: [
    '*.icloud.com',
    'calendar.google.com',
    'calendar.googleusercontent.com',
  ],
  display_hours: {start: '08:00', end: '22:00'},
  display_hours_parts: {
    start: {hour: 8, minute: 0},
    end: {hour: 22, minute: 0},
  },
};

const calendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//Privacy Test//EN\r
BEGIN:VEVENT\r
UID:private-uid-never-publish\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260715T091100\r
DTEND;TZID=Asia/Shanghai:20260715T095000\r
SUMMARY:Secret investor meeting\r
LOCATION:Private office\r
DESCRIPTION:Confidential agenda\r
ORGANIZER:mailto:secret@example.com\r
ATTENDEE:mailto:guest@example.com\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:adjacent\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260715T100000\r
DTEND;TZID=Asia/Shanghai:20260715T102500\r
SUMMARY:Another private event\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:transparent\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260715T110000\r
DTEND;TZID=Asia/Shanghai:20260715T120000\r
TRANSP:TRANSPARENT\r
SUMMARY:Does not block time\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:cancelled\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260715T120000\r
DTEND;TZID=Asia/Shanghai:20260715T130000\r
STATUS:CANCELLED\r
SUMMARY:Cancelled secret\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:recurring\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260716T131500\r
DTEND;TZID=Asia/Shanghai:20260716T140000\r
RRULE:FREQ=DAILY;COUNT=3\r
EXDATE;TZID=Asia/Shanghai:20260717T131500\r
SUMMARY:Recurring private meeting\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:rdate\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260719T150000\r
DTEND;TZID=Asia/Shanghai:20260719T154500\r
RDATE;TZID=Asia/Shanghai:20260720T150000\r
SUMMARY:RDATE private meeting\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:all-day\r
DTSTAMP:20260701T000000Z\r
DTSTART;VALUE=DATE:20260721\r
DTEND;VALUE=DATE:20260722\r
SUMMARY:Private all day event\r
END:VEVENT\r
END:VCALENDAR\r
`;

test('sanitizer publishes only rounded and merged busy intervals', () => {
  const now = DateTime.fromISO('2026-07-14T00:00:00+08:00');
  const payload = sanitizeCalendarText([calendar], config, now);
  assert.equal(payload.status, 'ready');
  assert.deepEqual(payload.busy, [
    {start: '2026-07-15T01:00:00Z', end: '2026-07-15T02:30:00Z'},
    {start: '2026-07-16T05:00:00Z', end: '2026-07-16T06:00:00Z'},
    {start: '2026-07-18T05:00:00Z', end: '2026-07-18T06:00:00Z'},
    {start: '2026-07-19T07:00:00Z', end: '2026-07-19T08:00:00Z'},
    {start: '2026-07-20T07:00:00Z', end: '2026-07-20T08:00:00Z'},
    {start: '2026-07-21T00:00:00Z', end: '2026-07-21T14:00:00Z'},
  ]);
});

test('payload cannot contain any event metadata or source data', () => {
  const payload = sanitizeCalendarText([calendar], config, DateTime.fromISO('2026-07-14T00:00:00+08:00'));
  const serialized = JSON.stringify(payload);
  for (const secret of [
    'private-uid-never-publish',
    'Secret investor meeting',
    'Private office',
    'Confidential agenda',
    'secret@example.com',
    'guest@example.com',
    'SUMMARY',
    'LOCATION',
    'DESCRIPTION',
    'ATTENDEE',
    'ORGANIZER',
    'UID',
  ]) {
    assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
  }
  assert.deepEqual(Object.keys(payload).sort(), [
    'busy',
    'display_hours',
    'generated_at',
    'schema_version',
    'slot_minutes',
    'status',
    'timezone',
    'window_end',
    'window_start',
  ]);
  for (const interval of payload.busy) assert.deepEqual(Object.keys(interval).sort(), ['end', 'start']);
  assert.doesNotThrow(() => assertPublicPayload(payload));
});

test('unconfigured state fails closed instead of implying free time', () => {
  const payload = unconfiguredPayload(config, DateTime.fromISO('2026-07-14T00:00:00.321+08:00'));
  assert.equal(payload.status, 'unconfigured');
  assert.deepEqual(payload.busy, []);
  assert.equal(payload.generated_at, '2026-07-13T16:00:00Z');
  assert.doesNotThrow(() => assertPublicPayload(payload));
});

test('privacy validator rejects extra busy fields', () => {
  const payload = unconfiguredPayload(config, DateTime.fromISO('2026-07-14T00:00:00+08:00'));
  payload.status = 'ready';
  payload.busy.push({start: '2026-07-15T01:00:00Z', end: '2026-07-15T02:00:00Z', title: 'leak'});
  assert.throws(() => assertPublicPayload(payload), /private field/);
});

test('privacy validator rejects busy time outside the published hours', () => {
  const payload = unconfiguredPayload(config, DateTime.fromISO('2026-07-14T00:00:00+08:00'));
  payload.status = 'ready';
  payload.busy.push({start: '2026-07-14T14:00:00Z', end: '2026-07-14T14:30:00Z'});
  assert.throws(() => assertPublicPayload(payload), /display hours/);
});

test('parser diagnostics cannot leak private identifiers to public logs', () => {
  const duplicateUidCalendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:diagnostic-secret-uid\r
SEQUENCE:2\r
DTSTAMP:20260701T000000Z\r
DTSTART:20260715T010000Z\r
DTEND:20260715T020000Z\r
SUMMARY:New private title\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:diagnostic-secret-uid\r
SEQUENCE:1\r
DTSTAMP:20260701T000000Z\r
DTSTART:20260715T010000Z\r
DTEND:20260715T020000Z\r
SUMMARY:Old private title\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...parts) => warnings.push(parts.join(' '));
  try {
    assert.throws(
      () => sanitizeCalendarText(
        [duplicateUidCalendar],
        config,
        DateTime.fromISO('2026-07-14T00:00:00+08:00'),
      ),
      (error) => error.message === 'Calendar data could not be parsed safely'
        && !error.message.includes('diagnostic-secret-uid'),
    );
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(warnings, []);
});

test('calendar source secrets must exactly fill the expected contiguous slots', () => {
  assert.deepEqual(
    calendarSourceUrlsFromEnvironment({
      CALENDAR_ICS_URL_3: '  webcal://calendar.google.com/third.ics  ',
      CALENDAR_ICS_URL_1: 'https://p01-caldav.icloud.com/published/2/first',
      CALENDAR_ICS_URL_2: 'https://calendar.google.com/second.ics',
      UNRELATED_SECRET: 'do-not-read',
    }, 3),
    [
      'https://p01-caldav.icloud.com/published/2/first',
      'https://calendar.google.com/second.ics',
      'webcal://calendar.google.com/third.ics',
    ],
  );
  assert.deepEqual(calendarSourceUrlsFromEnvironment({}, 3), []);
  assert.throws(
    () => calendarSourceUrlsFromEnvironment({
      CALENDAR_ICS_URL_1: 'https://calendar.google.com/first.ics',
      CALENDAR_ICS_URL_3: 'https://calendar.google.com/third.ics',
    }, 3),
    /not fully configured/,
  );
  assert.throws(
    () => calendarSourceUrlsFromEnvironment({
      CALENDAR_ICS_URL_1: 'https://calendar.google.com/first.ics',
      CALENDAR_ICS_URL_2: 'https://calendar.google.com/second.ics',
      CALENDAR_ICS_URL_3: 'https://calendar.google.com/third.ics',
      CALENDAR_ICS_URL_4: 'https://calendar.google.com/unexpected.ics',
    }, 3),
    /not fully configured/,
  );
});

test('calendar source URLs accept only approved HTTPS hosts', () => {
  assert.equal(
    normalizeCalendarSourceUrl(
      'webcal://p42-caldav.icloud.com/published/2/private-token',
      config.allowed_source_hosts,
    ).href,
    'https://p42-caldav.icloud.com/published/2/private-token',
  );
  for (const source of [
    'http://calendar.google.com/private-token/basic.ics',
    'https://calendar.google.com:444/private-token/basic.ics',
    'https://user:password@calendar.google.com/private-token/basic.ics',
    'https://calendar.google.com/private-token/basic.ics#secret',
    'https://calendar.google.com.evil.example/private-token/basic.ics',
    'https://icloud.com.evil.example/private-token/basic.ics',
  ]) {
    assert.throws(
      () => normalizeCalendarSourceUrl(source, config.allowed_source_hosts),
      (error) => error.message === 'Calendar source URL could not be validated safely'
        && !error.message.includes('private-token'),
    );
  }
});

test('remote calendar fetch validates every redirect and keeps ICS only in memory', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({url: url.href, options});
    if (requests.length === 1) {
      return new Response(null, {
        status: 302,
        headers: {location: 'https://calendar.googleusercontent.com/private-token/basic.ics'},
      });
    }
    return new Response(calendar, {
      status: 200,
      headers: {'content-type': 'text/calendar; charset=utf-8'},
    });
  };

  const fetched = await fetchCalendarSource(
    'https://calendar.google.com/calendar/ical/private-token/basic.ics',
    config.allowed_source_hosts,
    {fetchImpl},
  );
  assert.equal(fetched, calendar);
  assert.deepEqual(requests.map(({url}) => new URL(url).hostname), [
    'calendar.google.com',
    'calendar.googleusercontent.com',
  ]);
  assert.equal(requests[0].options.redirect, 'manual');
  const payload = sanitizeCalendarText([fetched], config, DateTime.fromISO('2026-07-14T00:00:00+08:00'));
  assert.doesNotThrow(() => assertPublicPayload(payload));
});

test('remote calendar errors never echo source URLs, redirects, or response bodies', async () => {
  const secret = 'never-echo-this-feed-token';
  const unsafeRedirect = async () => new Response(null, {
    status: 302,
    headers: {location: `https://attacker.example/${secret}`},
  });
  await assert.rejects(
    fetchCalendarSource(
      `https://calendar.google.com/calendar/ical/${secret}/basic.ics`,
      config.allowed_source_hosts,
      {fetchImpl: unsafeRedirect},
    ),
    (error) => error.message === 'Calendar source could not be fetched safely'
      && !error.message.includes(secret)
      && !error.message.includes('attacker.example'),
  );

  const privateBody = async () => new Response(`private response body ${secret}`, {status: 200});
  await assert.rejects(
    fetchCalendarSource(
      `https://calendar.google.com/calendar/ical/${secret}/basic.ics`,
      config.allowed_source_hosts,
      {fetchImpl: privateBody},
    ),
    (error) => error.message === 'Calendar source could not be fetched safely'
      && !error.message.includes(secret),
  );
});

test('remote calendar fetch enforces per-source and aggregate size limits', async () => {
  const oversized = async () => new Response(`BEGIN:VCALENDAR\r\n${'X'.repeat(64)}`, {status: 200});
  await assert.rejects(
    fetchCalendarSource(
      'https://calendar.google.com/calendar/ical/private/basic.ics',
      config.allowed_source_hosts,
      {fetchImpl: oversized, maxBytes: 32},
    ),
    /Calendar source could not be fetched safely/,
  );

  const valid = async () => new Response(calendar, {status: 200});
  const calendars = await fetchCalendarSources(
    [
      'https://calendar.google.com/calendar/ical/one/basic.ics',
      'https://calendar.google.com/calendar/ical/two/basic.ics',
    ],
    config.allowed_source_hosts,
    {fetchImpl: valid},
  );
  assert.deepEqual(calendars, [calendar, calendar]);
});

test('equivalent duplicate source URLs are rejected before any network request', async () => {
  let requestCount = 0;
  const fetchImpl = async () => {
    requestCount += 1;
    return new Response(calendar, {status: 200});
  };
  await assert.rejects(
    fetchCalendarSources(
      [
        'webcal://calendar.google.com/calendar/ical/private/basic.ics',
        'https://calendar.google.com/calendar/ical/private/basic.ics',
      ],
      config.allowed_source_hosts,
      {fetchImpl},
    ),
    /Calendar sources could not be validated safely/,
  );
  assert.equal(requestCount, 0);
});

test('calendar source slots enforce their expected provider before network access', async () => {
  let requestCount = 0;
  const fetchImpl = async () => {
    requestCount += 1;
    return new Response(calendar, {status: 200});
  };
  await assert.rejects(
    fetchCalendarSources(
      [
        'https://calendar.google.com/calendar/ical/wrong-first-slot/basic.ics',
        'https://calendar.google.com/calendar/ical/second/basic.ics',
        'https://calendar.google.com/calendar/ical/third/basic.ics',
      ],
      config.allowed_source_hosts,
      {fetchImpl, requiredSourceHosts: config.required_remote_source_hosts},
    ),
    /Calendar sources could not be validated safely/,
  );
  assert.equal(requestCount, 0);
});

test('remote calendar rejects truncated feeds and any failed source rejects the whole set', async () => {
  const truncated = async () => new Response('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n', {status: 200});
  await assert.rejects(
    fetchCalendarSource(
      'https://calendar.google.com/calendar/ical/truncated/basic.ics',
      config.allowed_source_hosts,
      {fetchImpl: truncated},
    ),
    /Calendar source could not be fetched safely/,
  );

  let requestCount = 0;
  const oneFails = async () => {
    requestCount += 1;
    return requestCount === 1
      ? new Response(calendar, {status: 200})
      : new Response('private upstream error', {status: 503});
  };
  await assert.rejects(
    fetchCalendarSources(
      [
        'https://calendar.google.com/calendar/ical/one/basic.ics',
        'https://calendar.google.com/calendar/ical/two/basic.ics',
      ],
      config.allowed_source_hosts,
      {fetchImpl: oneFails},
    ),
    /Calendar source could not be fetched safely/,
  );
  assert.equal(requestCount, 2);
});

test('multiple RDATE properties, comma lists, and PERIOD durations all occupy time', () => {
  const rdateCalendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//RDATE Privacy Test//EN\r
BEGIN:VEVENT\r
UID:rdate-array-private\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260715T090000\r
DTEND;TZID=Asia/Shanghai:20260715T093000\r
RDATE;TZID=Asia/Shanghai:20260716T090000\r
RDATE;TZID=Asia/Shanghai:20260717T090000\r
RDATE;TZID=Asia/Shanghai:20260718T090000,20260719T090000\r
RDATE;VALUE=PERIOD;TZID=Asia/Shanghai:20260720T090000/PT2H\r
SUMMARY:Never publish recurring title\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const payload = sanitizeCalendarText(
    [rdateCalendar],
    config,
    DateTime.fromISO('2026-07-14T00:00:00+08:00'),
  );
  assert.deepEqual(payload.busy, [
    {start: '2026-07-15T01:00:00Z', end: '2026-07-15T01:30:00Z'},
    {start: '2026-07-16T01:00:00Z', end: '2026-07-16T01:30:00Z'},
    {start: '2026-07-17T01:00:00Z', end: '2026-07-17T01:30:00Z'},
    {start: '2026-07-18T01:00:00Z', end: '2026-07-18T01:30:00Z'},
    {start: '2026-07-19T01:00:00Z', end: '2026-07-19T01:30:00Z'},
    {start: '2026-07-20T01:00:00Z', end: '2026-07-20T03:00:00Z'},
  ]);
});

test('recurrence overrides moved into the window are included while moved-out and cancelled ones are not', () => {
  const overrideCalendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//Override Privacy Test//EN\r
BEGIN:VEVENT\r
UID:moved-in-private\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260708T090000\r
DTEND;TZID=Asia/Shanghai:20260708T100000\r
RRULE:FREQ=DAILY;COUNT=1\r
SUMMARY:Original outside window\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:moved-in-private\r
RECURRENCE-ID;TZID=Asia/Shanghai:20260708T090000\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260715T100000\r
DTEND;TZID=Asia/Shanghai:20260715T110000\r
SUMMARY:Moved into window\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:moved-out-private\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260716T120000\r
DTEND;TZID=Asia/Shanghai:20260716T130000\r
RRULE:FREQ=DAILY;COUNT=1\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:moved-out-private\r
RECURRENCE-ID;TZID=Asia/Shanghai:20260716T120000\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260801T120000\r
DTEND;TZID=Asia/Shanghai:20260801T130000\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:cancelled-override-private\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260717T140000\r
DTEND;TZID=Asia/Shanghai:20260717T150000\r
RRULE:FREQ=DAILY;COUNT=1\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:cancelled-override-private\r
RECURRENCE-ID;TZID=Asia/Shanghai:20260717T140000\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260717T140000\r
DTEND;TZID=Asia/Shanghai:20260717T150000\r
STATUS:CANCELLED\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const payload = sanitizeCalendarText(
    [overrideCalendar],
    config,
    DateTime.fromISO('2026-07-14T00:00:00+08:00'),
  );
  assert.deepEqual(payload.busy, [
    {start: '2026-07-15T02:00:00Z', end: '2026-07-15T03:00:00Z'},
  ]);
});

test('malformed occupied events fail closed without echoing private fields', () => {
  const malformedCalendars = [
    `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:missing-start-private-id\r
SUMMARY:Never echo missing start title\r
END:VEVENT\r
END:VCALENDAR\r
`,
    `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:invalid-start-private-id\r
DTSTART:NOTADATE\r
DTEND:20260715T020000Z\r
SUMMARY:Never echo invalid start title\r
END:VEVENT\r
END:VCALENDAR\r
`,
    `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:invalid-rdate-private-id\r
DTSTART:20260715T010000Z\r
DTEND:20260715T020000Z\r
RDATE:NOTADATE\r
SUMMARY:Never echo invalid RDATE title\r
END:VEVENT\r
END:VCALENDAR\r
`,
  ];
  for (const malformed of malformedCalendars) {
    assert.throws(
      () => sanitizeCalendarText(
        [malformed],
        config,
        DateTime.fromISO('2026-07-14T00:00:00+08:00'),
      ),
      (error) => error.message === 'Calendar data could not be parsed safely'
        && !error.message.includes('private-id')
        && !error.message.includes('Never echo'),
    );
  }
});

test('unsupported recurrence RANGE semantics fail closed', () => {
  const rangeCalendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:range-private-id\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260715T090000\r
DTEND;TZID=Asia/Shanghai:20260715T100000\r
RRULE:FREQ=DAILY;COUNT=4\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:range-private-id\r
RECURRENCE-ID;RANGE=THISANDFUTURE;TZID=Asia/Shanghai:20260716T090000\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260716T110000\r
DTEND;TZID=Asia/Shanghai:20260716T120000\r
SUMMARY:Never echo range override title\r
END:VEVENT\r
END:VCALENDAR\r
`;
  assert.throws(
    () => sanitizeCalendarText(
      [rangeCalendar],
      config,
      DateTime.fromISO('2026-07-14T00:00:00+08:00'),
    ),
    (error) => error.message === 'Calendar data could not be parsed safely'
      && !error.message.includes('range-private-id')
      && !error.message.includes('range override title'),
  );
});
