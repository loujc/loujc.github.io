import assert from 'node:assert/strict';
import test from 'node:test';

import {DateTime} from 'luxon';

import {
  fetchICloudBusyIntervals,
  iCloudCalDavFailureStage,
  iCloudCalDavConfigFromEnvironment,
  normalizeICloudCalDavUrl,
  parseCalendarQueryMultiStatus,
  parseICloudCalendarNames,
} from './icloud-caldav.mjs';

const allowedHosts = ['*.icloud.com', '*.icloud.com.cn'];
const calendarNames = ['Private One', 'Private Two & Events', 'Private Three', 'Private Four'];
const secretUsername = 'private-account@example.com';
const secretPassword = 'abcd-efgh-ijkl-mnop';
const baseUrl = 'https://p42-caldav.icloud.com.cn/';
const windowStart = DateTime.fromISO('2026-07-21T00:00:00Z');
const windowEnd = DateTime.fromISO('2026-07-22T00:00:00Z');

const config = {
  baseUrl,
  username: secretUsername,
  appPassword: secretPassword,
  calendarNames,
  expectedCalendarCount: 4,
};

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function propstat(properties) {
  return `<d:propstat><d:prop>${properties}</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat>`;
}

function principalXml() {
  return `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:">
  <d:response>
    <d:href>/</d:href>
    ${propstat('<d:current-user-principal><d:href>/123/principal/</d:href></d:current-user-principal>')}
  </d:response>
</d:multistatus>`;
}

function homeXml(calendarHomes = ['/123/calendars/']) {
  return `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/123/principal/</d:href>
    ${propstat(`<c:calendar-home-set>${calendarHomes.map((href) => `<d:href>${href}</d:href>`).join('')}</c:calendar-home-set>`)}
  </d:response>
</d:multistatus>`;
}

function collectionResponse(name, id, component = 'VEVENT', homePath = '/123/calendars') {
  return `<d:response>
    <d:href>${homePath}/${id}/</d:href>
    ${propstat(`<d:displayname>${xmlEscape(name)}</d:displayname>
      <d:resourcetype><d:collection/><c:calendar/></d:resourcetype>
      <c:supported-calendar-component-set><c:comp name="${component}"/></c:supported-calendar-component-set>`)}
  </d:response>`;
}

function collectionsXml(names = calendarNames, homePath = '/123/calendars') {
  return `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response><d:href>${homePath}/</d:href></d:response>
  ${collectionResponse('Excluded Calendar', 'ignored-calendar', 'VEVENT', homePath)}
  ${names.map((name, index) => collectionResponse(name, `selected-${index + 1}`, 'VEVENT', homePath)).join('\n')}
  ${collectionResponse('Tasks only', 'ignored-tasks', 'VTODO', homePath)}
</d:multistatus>`;
}

function expandedEventCalendar(index = 0) {
  const startHour = String(index + 1).padStart(2, '0');
  const endHour = String(index + 2).padStart(2, '0');
  return `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
DTSTART:20260721T${startHour}0000Z\r
DTEND:20260721T${endHour}0000Z\r
TRANSP:OPAQUE\r
RECURRENCE-ID;VALUE=DATE-TIME:20260720T020000Z\r
BEGIN:VALARM\r
END:VALARM\r
END:VEVENT\r
BEGIN:VEVENT\r
DTSTART:20260721T100000Z\r
DURATION:PT30M\r
STATUS:TENTATIVE\r
END:VEVENT\r
BEGIN:VEVENT\r
DTSTART:20260721T120000Z\r
DTEND:20260721T130000Z\r
TRANSP:TRANSPARENT\r
END:VEVENT\r
BEGIN:VEVENT\r
DTSTART:20260721T140000Z\r
DURATION:PT1H\r
STATUS:CANCELLED\r
END:VEVENT\r
END:VCALENDAR\r
`;
}

function calendarQueryXml(index = 0, calendarText = expandedEventCalendar(index)) {
  return `<?xml version="1.0"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/123/calendars/selected-${index + 1}/private-object.ics</d:href>
    ${propstat(`<c:calendar-data content-type="text/calendar" version="2.0">${xmlEscape(calendarText)}</c:calendar-data>`)}
  </d:response>
</d:multistatus>`;
}

function challengeResponse(challenge = 'Basic realm="iCloud"') {
  return new Response(null, {
    status: 401,
    headers: {'www-authenticate': challenge},
  });
}

function authenticatedDiscoveryFetch({
  challenge = 'Basic realm="iCloud"',
  collections = collectionsXml(),
  calendarHomes = ['/123/calendars/'],
  collectionsByHome = {},
  redirectBase = false,
} = {}) {
  const requests = [];
  const fetchImpl = async (url, options) => {
    const parsed = new URL(url);
    const authorization = options.headers.Authorization;
    requests.push({url: parsed, options, authorization});

    if (redirectBase && parsed.hostname === 'caldav.icloud.com' && parsed.pathname === '/') {
      assert.equal(authorization, undefined);
      return new Response(null, {
        status: 302,
        headers: {location: baseUrl},
      });
    }
    if (!authorization) return challengeResponse(challenge);
    assert.equal(
      authorization,
      `Basic ${Buffer.from(`${secretUsername}:${secretPassword}`, 'utf8').toString('base64')}`,
    );

    if (options.method === 'PROPFIND' && parsed.pathname === '/') {
      return new Response(principalXml(), {status: 207});
    }
    if (options.method === 'PROPFIND' && parsed.pathname === '/123/principal/') {
      return new Response(homeXml(calendarHomes), {status: 207});
    }
    if (options.method === 'PROPFIND' && calendarHomes.includes(parsed.pathname)) {
      return new Response(collectionsByHome[parsed.pathname] ?? collections, {status: 207});
    }
    const match = /^\/123\/(?:calendars|primary|shared)\/selected-(\d+)\/$/.exec(parsed.pathname);
    if (options.method === 'REPORT' && match) {
      return new Response(calendarQueryXml(Number(match[1]) - 1), {status: 207});
    }
    return new Response('private unexpected request', {status: 404});
  };
  return {requests, fetchImpl};
}

test('environment config is all-or-none and parses exactly four unique calendar names', () => {
  assert.equal(iCloudCalDavConfigFromEnvironment({}), null);
  const environment = {
    ICLOUD_CALDAV_BASE_URL: `  ${baseUrl}  `,
    ICLOUD_CALDAV_USERNAME: `  ${secretUsername}  `,
    ICLOUD_CALDAV_APP_PASSWORD: `  ${secretPassword}  `,
    ICLOUD_CALDAV_CALENDAR_NAMES_JSON: JSON.stringify(calendarNames),
  };
  assert.deepEqual(iCloudCalDavConfigFromEnvironment(environment), config);
  assert.deepEqual(parseICloudCalendarNames(JSON.stringify(calendarNames)), calendarNames);

  for (const missing of Object.keys(environment)) {
    const partial = {...environment};
    delete partial[missing];
    assert.throws(
      () => iCloudCalDavConfigFromEnvironment(partial),
      (error) => error.message === 'iCloud CalDAV configuration could not be validated safely'
        && !error.message.includes(secretUsername)
        && !error.message.includes(secretPassword),
    );
  }
  assert.throws(
    () => parseICloudCalendarNames(JSON.stringify(['One', 'One', 'Three', 'Four'])),
    /could not be validated safely/,
  );
  assert.throws(
    () => parseICloudCalendarNames(JSON.stringify(['One', 'Two', 'Three'])),
    /could not be validated safely/,
  );
});

test('CalDAV URL validation accepts only approved HTTPS Apple hosts', () => {
  assert.equal(
    normalizeICloudCalDavUrl('https://p01-caldav.icloud.com/123/calendars/', allowedHosts).hostname,
    'p01-caldav.icloud.com',
  );
  assert.equal(
    normalizeICloudCalDavUrl('https://p42-caldav.icloud.com.cn/123/calendars/', allowedHosts).hostname,
    'p42-caldav.icloud.com.cn',
  );
  const token = 'never-echo-private-token';
  for (const unsafe of [
    `http://p42-caldav.icloud.com.cn/${token}`,
    `https://user:password@p42-caldav.icloud.com.cn/${token}`,
    `https://p42-caldav.icloud.com.cn:444/${token}`,
    `https://p42-caldav.icloud.com.cn/${token}?query=1`,
    `https://p42-caldav.icloud.com.cn/${token}#fragment`,
    `https://p42-caldav.icloud.com.cn.evil.example/${token}`,
    `https://photos.icloud.com/${token}`,
    `https://icloud.com.cn/${token}`,
  ]) {
    assert.throws(
      () => normalizeICloudCalDavUrl(unsafe, allowedHosts),
      (error) => error.message === 'iCloud CalDAV configuration could not be validated safely'
        && !error.message.includes(token),
    );
  }
});

test('calendar-query parser returns clipped UTC intervals and applies event availability fields', () => {
  const calendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
DTSTART:20260720T230000Z\r
DTEND:20260721T003000Z\r
END:VEVENT\r
BEGIN:VEVENT\r
DTSTART;VALUE=DATE-TIME:20260721T020000Z\r
DURATION:P1DT30M\r
STATUS:CONFIRMED\r
TRANSP:OPAQUE\r
BEGIN:VALARM\r
END:VALARM\r
END:VEVENT\r
BEGIN:VEVENT\r
DTSTART:20260721T030000Z\r
DURATION:PT30M\r
TRANSP:TRANSPARENT\r
END:VEVENT\r
BEGIN:VEVENT\r
DTSTART:20260721T040000Z\r
DTEND:20260721T043000Z\r
STATUS:CANCELLED\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const intervals = parseCalendarQueryMultiStatus(
    calendarQueryXml(0, calendar),
    DateTime.fromISO('2026-07-21T00:00:00Z'),
    DateTime.fromISO('2026-07-21T05:00:00Z'),
  );
  assert.deepEqual(
    intervals.map(({start, end}) => [start.toISO(), end.toISO()]),
    [
      ['2026-07-21T00:00:00.000Z', '2026-07-21T00:30:00.000Z'],
      ['2026-07-21T02:00:00.000Z', '2026-07-21T05:00:00.000Z'],
    ],
  );
  assert.ok(intervals.every(({start, end}) => start.zoneName === 'UTC' && end.zoneName === 'UTC'));
});

test('expanded recurring instance uses its actual time while strictly validating RECURRENCE-ID', () => {
  const calendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
DTSTART:20260721T040000Z\r
DTEND:20260721T050000Z\r
RECURRENCE-ID:20260721T010000Z\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const intervals = parseCalendarQueryMultiStatus(
    calendarQueryXml(0, calendar),
    windowStart,
    windowEnd,
  );
  assert.deepEqual(
    intervals.map(({start, end}) => [start.toISO(), end.toISO()]),
    [['2026-07-21T04:00:00.000Z', '2026-07-21T05:00:00.000Z']],
  );
});

test('calendar-query parser strictly validates and discards iCloud expansion metadata', () => {
  const calendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
X-EXPANDED:true\r
X-MASTER-DTSTART:20260721T090000\r
X-MASTER-RRULE:FREQ=WEEKLY\\;INTERVAL=1\\;BYDAY=MO\\,WE\r
BEGIN:VEVENT\r
DTSTART;TZID=Asia/Shanghai:20260721T100000\r
DTEND;TZID=Asia/Shanghai:20260721T110000\r
RECURRENCE-ID:20260721T010000Z\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const intervals = parseCalendarQueryMultiStatus(
    calendarQueryXml(0, calendar),
    windowStart,
    windowEnd,
  );
  assert.deepEqual(
    intervals.map(({start, end}) => [start.toISO(), end.toISO()]),
    [['2026-07-21T10:00:00.000+08:00', '2026-07-21T11:00:00.000+08:00']],
  );
});

test('calendar-query parser accepts strict IANA TZID date-times and preserves DST instants', () => {
  const calendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
DTSTART;TZID=America/New_York:20260308T013000\r
DTEND;VALUE=DATE-TIME;TZID=America/New_York:20260308T033000\r
RECURRENCE-ID;TZID="America/New_York":20260301T013000\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const intervals = parseCalendarQueryMultiStatus(
    calendarQueryXml(0, calendar),
    DateTime.fromISO('2026-03-08T00:00:00Z'),
    DateTime.fromISO('2026-03-09T00:00:00Z'),
  );
  assert.deepEqual(
    intervals.map(({start, end}) => [start.toISO(), end.toISO(), end.diff(start).as('hours')]),
    [['2026-03-08T01:30:00.000-05:00', '2026-03-08T03:30:00.000-04:00', 1]],
  );
});

test('calendar-query parser applies nominal day durations across DST', () => {
  const calendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
DTSTART;TZID=America/New_York:20260307T120000\r
DURATION:P1D\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const intervals = parseCalendarQueryMultiStatus(
    calendarQueryXml(0, calendar),
    DateTime.fromISO('2026-03-07T00:00:00Z'),
    DateTime.fromISO('2026-03-10T00:00:00Z'),
  );
  assert.deepEqual(
    intervals.map(({start, end}) => [start.toISO(), end.toISO(), end.diff(start).as('hours')]),
    [['2026-03-07T12:00:00.000-05:00', '2026-03-08T12:00:00.000-04:00', 23]],
  );
});

test('calendar-query parser accepts a valid cross-zone interval', () => {
  const calendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
DTSTART;TZID=Asia/Shanghai:20260721T090000\r
DTEND;TZID=America/New_York:20260721T000000\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const intervals = parseCalendarQueryMultiStatus(
    calendarQueryXml(0, calendar),
    windowStart,
    windowEnd,
  );
  assert.deepEqual(
    intervals.map(({start, end}) => [start.toISO(), end.toISO(), end.diff(start).as('hours')]),
    [['2026-07-21T09:00:00.000+08:00', '2026-07-21T00:00:00.000-04:00', 3]],
  );
});

test('calendar-query parser handles DATE all-day events in the requested local zone and empty results', () => {
  const localStart = DateTime.fromISO('2026-07-21T00:00:00', {zone: 'Asia/Shanghai'});
  const localEnd = localStart.plus({days: 3});
  const calendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
DTSTART;VALUE=DATE:20260721\r
END:VEVENT\r
BEGIN:VEVENT\r
DTSTART;VALUE=DATE:20260722\r
DURATION:P1D\r
RECURRENCE-ID:20260721T160000Z\r
END:VEVENT\r
BEGIN:VEVENT\r
DTSTART:20260722T120000Z\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const intervals = parseCalendarQueryMultiStatus(
    calendarQueryXml(0, calendar),
    localStart,
    localEnd,
  );
  assert.deepEqual(
    intervals.map(({start, end}) => [start.toISO(), end.toISO()]),
    [
      ['2026-07-21T00:00:00.000+08:00', '2026-07-22T00:00:00.000+08:00'],
      ['2026-07-22T00:00:00.000+08:00', '2026-07-23T00:00:00.000+08:00'],
    ],
  );
  assert.deepEqual(
    parseCalendarQueryMultiStatus(
      '<d:multistatus xmlns:d="DAV:"/>',
      localStart,
      localEnd,
    ),
    [],
  );
});

test('calendar-query parser rejects SUMMARY, UID, alarm values, and all other unrequested data', () => {
  const token = 'private-provider-diagnostic';
  const event = (extra) => `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
DTSTART:20260721T010000Z\r
DURATION:PT1H\r
${extra}\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const eventFromLines = (...lines) => `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
${lines.join('\r\n')}\r
END:VEVENT\r
END:VCALENDAR\r
`;
  const bodies = [
    calendarQueryXml(0, event(`SUMMARY:${token}`)),
    calendarQueryXml(0, event(`UID:${token}`)),
    calendarQueryXml(0, event(`BEGIN:VALARM\r\nDESCRIPTION:${token}\r\nEND:VALARM`)),
    calendarQueryXml(0, event(`BEGIN:VALARM\r\nTRIGGER:${token}\r\nEND:VALARM`)),
    calendarQueryXml(0, event(`STATUS:${token}`)),
    calendarQueryXml(0, eventFromLines('DTSTART:20260721T090000', 'DURATION:PT1H')),
    calendarQueryXml(0, eventFromLines('DTSTART;TZID=Not_A_Zone:20260721T090000', 'DURATION:PT1H')),
    calendarQueryXml(0, eventFromLines('DTSTART;TZID=Asia/Shanghai;X-PRIVATE=1:20260721T090000', 'DURATION:PT1H')),
    calendarQueryXml(0, eventFromLines('DTSTART;TZID=Asia/Shanghai;TZID=America/New_York:20260721T090000', 'DURATION:PT1H')),
    calendarQueryXml(0, eventFromLines('DTSTART;TZID=Asia/Shanghai:20260721T090000Z', 'DURATION:PT1H')),
    calendarQueryXml(0, eventFromLines('DTSTART;TZID=America/New_York:20260308T023000', 'DURATION:PT1H')),
    calendarQueryXml(0, eventFromLines('DTSTART;TZID=America/New_York:20261101T013000', 'DURATION:PT1H')),
    calendarQueryXml(0, eventFromLines(`DTSTART;TZID=${'A'.repeat(256)}:20260721T090000`, 'DURATION:PT1H')),
    calendarQueryXml(0, eventFromLines('DTSTART;TZID=Asia/\u0001Shanghai:20260721T090000', 'DURATION:PT1H')),
    calendarQueryXml(0, eventFromLines('DTSTART;TZID=Asia/Shanghai:20260721', 'DURATION:P1D')),
    calendarQueryXml(0, event('RECURRENCE-ID;RANGE=THISANDFUTURE:20260721T010000Z')),
    calendarQueryXml(0, event('RECURRENCE-ID:20260721T090000')),
    calendarQueryXml(0, event('RECURRENCE-ID;TZID=Invalid/Zone:20260721T090000')),
    calendarQueryXml(0, event('RECURRENCE-ID;TZID=Asia/Shanghai:20260721')),
    calendarQueryXml(0, eventFromLines(
      'DTSTART;VALUE=DATE:20260721',
      'RECURRENCE-ID;TZID=Asia/Shanghai:20260721T090000',
    )),
    calendarQueryXml(0, event('RECURRENCE-ID;VALUE=DATE:20260721')),
    calendarQueryXml(0, event('RECURRENCE-ID:20260721T010000Z\r\nRECURRENCE-ID:20260722T010000Z')),
    calendarQueryXml(0, event('RRULE:FREQ=DAILY')),
    calendarQueryXml(0, event('RDATE:20260722T010000Z')),
    calendarQueryXml(0, event('EXDATE:20260722T010000Z')),
    calendarQueryXml(0, event('EXRULE:FREQ=DAILY')),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-EXPANDED:true\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-EXPANDED:${token}\r\nX-MASTER-DTSTART:20260721T090000\r\nX-MASTER-RRULE:FREQ=DAILY\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-EXPANDED:true\r\nX-MASTER-DTSTART:${token}\r\nX-MASTER-RRULE:FREQ=DAILY\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-EXPANDED:true\r\nX-MASTER-DTSTART:20260721T090000\r\nX-MASTER-RRULE:${token}\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-EXPANDED:true\r\nX-MASTER-DTSTART:20260721T090000\r\nX-MASTER-RRULE:FREQ=DAILY\\nSUMMARY=${token}\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-EXPANDED:true\r\nX-MASTER-DTSTART:20260721T090000\r\nX-MASTER-RRULE:FREQ=DAILY\\;X-PRIVATE=${token}\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-EXPANDED:true\r\nX-MASTER-DTSTART:20260721T090000\r\nX-MASTER-RRULE:FREQ=DAILY\\;BYDAY=SECRET\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-EXPANDED:true\r\nX-MASTER-DTSTART:20260721T090000\r\nX-MASTER-RRULE:FREQ=DAILY\\;COUNT=ABC\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-EXPANDED:true\r\nX-EXPANDED:true\r\nX-MASTER-DTSTART:20260721T090000\r\nX-MASTER-RRULE:FREQ=DAILY\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-PRIVATE:${token}\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:${token}\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VTODO\r\nEND:VTODO\r\nEND:VCALENDAR\r\n`),
    calendarQueryXml(0, `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VTIMEZONE\r\nEND:VTIMEZONE\r\nEND:VCALENDAR\r\n`),
    `<!DOCTYPE x [<!ENTITY leak "${token}">]><x/>`,
    calendarQueryXml().replace(
      '<c:calendar-data ',
      `<d:getetag>${token}</d:getetag><c:calendar-data `,
    ),
    calendarQueryXml().replace(
      '<d:status>HTTP/1.1 200 OK</d:status>',
      '<d:status>HTTP/1.1 404 Not Found</d:status>',
    ),
    calendarQueryXml().replace(
      '</c:calendar-data>',
      `<x:private xmlns:x="urn:private">${token}</x:private></c:calendar-data>`,
    ),
  ];
  for (const body of bodies) {
    assert.throws(
      () => parseCalendarQueryMultiStatus(body, windowStart, windowEnd),
      (error) => error.message === 'iCloud CalDAV data could not be fetched safely'
        && !error.message.includes(token),
    );
  }
});

test('CalDAV discovery selects exactly four named VEVENT calendars and uses read-only methods', async () => {
  const {requests, fetchImpl} = authenticatedDiscoveryFetch();
  const intervals = await fetchICloudBusyIntervals(config, {
    windowStart,
    windowEnd,
    allowedHosts,
    fetchImpl,
  });

  assert.equal(requests.length, 14);
  assert.deepEqual(
    requests.filter(({authorization}) => authorization).map(({options}) => options.method),
    ['PROPFIND', 'PROPFIND', 'PROPFIND', 'REPORT', 'REPORT', 'REPORT', 'REPORT'],
  );
  assert.ok(requests.every(({options}) => ['PROPFIND', 'REPORT'].includes(options.method)));
  assert.ok(requests.every(({options}) => options.redirect === 'manual'));
  assert.ok(requests.every(({options}) => options.credentials === 'omit'));
  assert.ok(
    requests
      .filter(({authorization, options}) => authorization && options.method === 'REPORT')
      .every(({options}) => options.headers.Depth === '1'),
  );
  assert.equal(requests.some(({url}) => url.pathname.includes('ignored-calendar')), false);
  assert.equal(requests.some(({url}) => url.pathname.includes('ignored-tasks')), false);
  assert.ok(
    requests
      .filter(({authorization, options}) => authorization && options.method === 'REPORT')
      .every(({options}) => options.body.includes('start="20260721T000000Z"')
        && options.body.includes('end="20260722T000000Z"')),
  );
  for (const {options} of requests.filter(
    ({authorization, options}) => authorization && options.method === 'REPORT',
  )) {
    assert.match(options.body, /<c:calendar-query\b/);
    assert.match(options.body, /<c:expand start="20260721T000000Z" end="20260722T000000Z"\/>/);
    assert.match(options.body, /<c:comp name="VALARM"\/>/);
    assert.deepEqual(
      [...options.body.matchAll(/<c:prop name="([^"]+)"\/>/g)].map((match) => match[1]),
      ['VERSION', 'DTSTART', 'DTEND', 'DURATION', 'STATUS', 'TRANSP', 'RECURRENCE-ID'],
    );
    assert.doesNotMatch(
      options.body,
      /\b(?:SUMMARY|UID|DESCRIPTION|LOCATION|ATTENDEE|RRULE|RDATE|EXDATE|EXRULE|VTIMEZONE)\b/,
    );
    assert.doesNotMatch(options.body, /free-busy-query/);
  }
  assert.equal(intervals.length, 8);
  assert.ok(intervals.every(({start, end}) => DateTime.isDateTime(start) && DateTime.isDateTime(end)));
});

test('CalDAV discovery searches every advertised calendar home before exact selection', async () => {
  const calendarHomes = ['/123/primary/', '/123/shared/'];
  const {requests, fetchImpl} = authenticatedDiscoveryFetch({
    calendarHomes,
    collectionsByHome: {
      '/123/primary/': collectionsXml(calendarNames.slice(0, 2), '/123/primary'),
      '/123/shared/': collectionsXml(calendarNames.slice(2), '/123/shared'),
    },
  });
  const intervals = await fetchICloudBusyIntervals(config, {
    windowStart,
    windowEnd,
    allowedHosts,
    fetchImpl,
  });
  assert.equal(intervals.length, 8);
  assert.deepEqual(
    requests
      .filter(({authorization, options}) => authorization && options.method === 'PROPFIND')
      .map(({url}) => url.pathname),
    ['/', '/123/principal/', '/123/primary/', '/123/shared/'],
  );
  assert.deepEqual(
    requests
      .filter(({authorization, options}) => authorization && options.method === 'REPORT')
      .map(({url}) => url.pathname),
    [
      '/123/primary/selected-1/',
      '/123/primary/selected-2/',
      '/123/shared/selected-1/',
      '/123/shared/selected-2/',
    ],
  );
});

test('redirects are validated and credentials are never forwarded without a fresh Basic challenge', async () => {
  const {requests, fetchImpl} = authenticatedDiscoveryFetch({
    challenge: 'Digest realm="other", Basic realm="iCloud"',
    redirectBase: true,
  });
  const redirectedConfig = {...config, baseUrl: 'https://caldav.icloud.com/'};
  await fetchICloudBusyIntervals(redirectedConfig, {
    windowStart,
    windowEnd,
    allowedHosts,
    fetchImpl,
  });
  assert.equal(requests[0].url.hostname, 'caldav.icloud.com');
  assert.equal(requests[0].authorization, undefined);
  assert.equal(requests[1].url.hostname, 'p42-caldav.icloud.com.cn');
  assert.equal(requests[1].authorization, undefined);
  assert.ok(requests[2].authorization?.startsWith('Basic '));
});

test('unsafe redirects and authentication failures never echo credentials or provider bodies', async () => {
  const token = 'secret-redirect-fragment';
  const unsafeRedirect = async () => new Response(`private body ${secretUsername}`, {
    status: 302,
    headers: {location: `https://attacker.example/${token}`},
  });
  await assert.rejects(
    fetchICloudBusyIntervals(config, {
      windowStart,
      windowEnd,
      allowedHosts,
      fetchImpl: unsafeRedirect,
    }),
    (error) => error.message === 'iCloud CalDAV data could not be fetched safely'
      && !error.message.includes(token)
      && !error.message.includes(secretUsername)
      && !error.message.includes(secretPassword),
  );

  let requestCount = 0;
  const unsupportedChallenge = async () => {
    requestCount += 1;
    return new Response(`private body ${secretPassword}`, {
      status: 401,
      headers: {'www-authenticate': 'Bearer private'},
    });
  };
  await assert.rejects(
    fetchICloudBusyIntervals(config, {
      windowStart,
      windowEnd,
      allowedHosts,
      fetchImpl: unsupportedChallenge,
    }),
    (error) => error.message === 'iCloud CalDAV data could not be fetched safely'
      && iCloudCalDavFailureStage(error) === 'principal-request'
      && !error.message.includes(secretPassword),
  );
  assert.equal(requestCount, 1);

  const quotedFakeBasic = async () => new Response(null, {
    status: 401,
    headers: {'www-authenticate': 'Digest realm="private, Basic fake"'},
  });
  await assert.rejects(
    fetchICloudBusyIntervals(config, {
      windowStart,
      windowEnd,
      allowedHosts,
      fetchImpl: quotedFakeBasic,
    }),
    /iCloud CalDAV data could not be fetched safely/,
  );
});

test('missing or duplicate named collections reject the whole fetch before any REPORT', async () => {
  for (const [names, expectedStage] of [
    [calendarNames.slice(0, 3), 'collection-selection-missing'],
    [[calendarNames[0], calendarNames[0], calendarNames[2], calendarNames[3]],
      'collection-selection-duplicate-name'],
  ]) {
    const {requests, fetchImpl} = authenticatedDiscoveryFetch({collections: collectionsXml(names)});
    await assert.rejects(
      fetchICloudBusyIntervals(config, {
        windowStart,
        windowEnd,
        allowedHosts,
        fetchImpl,
      }),
      (error) => error.message === 'iCloud CalDAV data could not be fetched safely'
        && iCloudCalDavFailureStage(error) === expectedStage,
    );
    assert.equal(requests.some(({options}) => options.method === 'REPORT'), false);
  }
});
