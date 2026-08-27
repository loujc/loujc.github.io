import assert from 'node:assert/strict';
import test from 'node:test';

import {DateTime} from 'luxon';

import {
  assertPublicPayload,
  availabilityWindow,
  buildPublicPayload,
  sanitizeCalendarText,
  selectAvailabilitySourceMode,
  unconfiguredPayload,
} from './generate-busy-calendar.mjs';

const config = {
  timezone: 'Asia/Shanghai',
  horizon_days: 10,
  slot_minutes: 30,
  stale_after_hours: 6,
  idea_snapshot_coverage_days: 400,
  idea_snapshot_max_age_days: 90,
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
UID:past-monday\r
DTSTAMP:20260701T000000Z\r
DTSTART;TZID=Asia/Shanghai:20260713T090000\r
DTEND;TZID=Asia/Shanghai:20260713T100000\r
SUMMARY:Past private meeting\r
END:VEVENT\r
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

test('sanitizer keeps a past Monday busy interval in the current week', () => {
  const now = DateTime.fromISO('2026-07-14T00:00:00+08:00');
  const payload = sanitizeCalendarText([calendar], config, now);
  assert.equal(payload.status, 'ready');
  assert.equal(payload.window_start, '2026-07-13');
  assert.deepEqual(payload.busy, [
    {start: '2026-07-13T01:00:00Z', end: '2026-07-13T02:00:00Z'},
    {start: '2026-07-15T01:00:00Z', end: '2026-07-15T02:30:00Z'},
    {start: '2026-07-16T05:00:00Z', end: '2026-07-16T06:00:00Z'},
    {start: '2026-07-18T05:00:00Z', end: '2026-07-18T06:00:00Z'},
    {start: '2026-07-19T07:00:00Z', end: '2026-07-19T08:00:00Z'},
    {start: '2026-07-20T07:00:00Z', end: '2026-07-20T08:00:00Z'},
    {start: '2026-07-21T00:00:00Z', end: '2026-07-21T14:00:00Z'},
  ]);
});

test('availability week follows the local Sunday/Monday boundary, not the UTC date', () => {
  const localSunday = DateTime.fromISO('2026-07-19T15:59:59Z');
  const localMonday = DateTime.fromISO('2026-07-19T16:00:00Z');
  assert.equal(localSunday.setZone(config.timezone).toISODate(), '2026-07-19');
  assert.equal(localMonday.setZone(config.timezone).toISODate(), '2026-07-20');
  assert.equal(availabilityWindow(config, localSunday).windowStart.toISODate(), '2026-07-13');
  assert.equal(availabilityWindow(config, localMonday).windowStart.toISODate(), '2026-07-20');
  assert.equal(unconfiguredPayload(config, localMonday).window_start, '2026-07-20');
});

test('iCloud and IDEA snapshot intervals share one final anonymization boundary', () => {
  const now = DateTime.fromISO('2026-07-14T00:00:00+08:00');
  const iCloudIntervals = [{
    start: DateTime.fromISO('2026-07-15T01:11:00Z'),
    end: DateTime.fromISO('2026-07-15T02:00:00Z'),
  }];
  const ideaSnapshotIntervals = [{
    start: DateTime.fromISO('2026-07-15T02:00:00Z'),
    end: DateTime.fromISO('2026-07-15T02:25:00Z'),
  }];
  const payload = buildPublicPayload(
    [...iCloudIntervals, ...ideaSnapshotIntervals],
    config,
    now,
  );
  assert.deepEqual(payload.busy[0], {
    start: '2026-07-15T01:00:00Z',
    end: '2026-07-15T02:30:00Z',
  });
  assert.doesNotThrow(() => assertPublicPayload(payload));
});

test('production mode requires iCloud and IDEA snapshot source groups together', () => {
  const complete = {
    iCloudConfig: {configured: true},
    ideaSnapshot: '{"configured":true}',
    localInputCount: 0,
  };
  assert.equal(selectAvailabilitySourceMode(complete), 'production');
  assert.equal(selectAvailabilitySourceMode({
    iCloudConfig: null,
    ideaSnapshot: null,
    localInputCount: 0,
  }), 'unconfigured');
  assert.equal(selectAvailabilitySourceMode({
    iCloudConfig: null,
    ideaSnapshot: null,
    localInputCount: 1,
  }), 'local');
  assert.throws(
    () => selectAvailabilitySourceMode({
      iCloudConfig: null,
      ideaSnapshot: null,
      localInputCount: 0,
      requireRemoteSources: true,
    }),
    /required in production/,
  );

  for (const missingGroup of ['icloud', 'idea']) {
    const partial = structuredClone(complete);
    if (missingGroup === 'icloud') partial.iCloudConfig = null;
    if (missingGroup === 'idea') partial.ideaSnapshot = null;
    assert.throws(
      () => selectAvailabilitySourceMode(partial),
      /not fully configured/,
      `missing ${missingGroup} must fail closed`,
    );
  }
  assert.throws(
    () => selectAvailabilitySourceMode({...complete, localInputCount: 1}),
    /exactly one availability source mode/,
  );
});

test('payload cannot contain any event metadata or source data', () => {
  const payload = sanitizeCalendarText([calendar], config, DateTime.fromISO('2026-07-14T00:00:00+08:00'));
  const serialized = JSON.stringify(payload);
  for (const secret of [
    'private-uid-never-publish',
    'Past private meeting',
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
  assert.equal(payload.window_start, '2026-07-13');
  assert.doesNotThrow(() => assertPublicPayload(payload));
});

test('public window must start on the Monday of its generation week', () => {
  const payload = unconfiguredPayload(config, DateTime.fromISO('2026-07-14T00:00:00+08:00'));
  payload.window_start = '2026-07-14';
  payload.window_end = '2026-07-24';
  assert.throws(() => assertPublicPayload(payload), /generation week/);
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

test('public validator accepts an occupied interval ending at midnight', () => {
  const midnightConfig = {
    ...config,
    display_hours: {start: '08:00', end: '24:00'},
    display_hours_parts: {start: {hour: 8, minute: 0}, end: {hour: 24, minute: 0}},
  };
  const payload = unconfiguredPayload(midnightConfig, DateTime.fromISO('2026-07-14T00:00:00+08:00'));
  payload.status = 'ready';
  payload.busy.push({start: '2026-07-14T15:30:00Z', end: '2026-07-14T16:00:00Z'});
  assert.doesNotThrow(() => assertPublicPayload(payload));
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
