import assert from 'node:assert/strict';
import test from 'node:test';

import {DateTime} from 'luxon';

import {
  fetchICloudBusyIntervals,
  iCloudCalDavConfigFromEnvironment,
  normalizeICloudCalDavUrl,
  parseFreeBusyCalendar,
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

function freeBusyCalendar(index = 0) {
  const startHour = String(index + 1).padStart(2, '0');
  const endHour = String(index + 2).padStart(2, '0');
  return `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:-//Private Provider Metadata Must Not Escape//EN\r
BEGIN:VFREEBUSY\r
DTSTART:20260721T000000Z\r
DTEND:20260722T000000Z\r
FREEBUSY:20260721T${startHour}0000Z/20260721T${endHour}0000Z\r
FREEBUSY;FBTYPE=BUSY-TENTATIVE:20260721T100000Z/PT30M\r
FREEBUSY;FBTYPE=FREE:20260721T120000Z/20260721T130000Z\r
END:VFREEBUSY\r
END:VCALENDAR\r
`;
}

function challengeResponse() {
  return new Response(null, {
    status: 401,
    headers: {'www-authenticate': 'Basic realm="iCloud"'},
  });
}

function authenticatedDiscoveryFetch({
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
    if (!authorization) return challengeResponse();
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
      return new Response(freeBusyCalendar(Number(match[1]) - 1), {status: 200});
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

test('free-busy parser returns clipped UTC intervals and ignores explicit FREE periods', () => {
  const calendar = `BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VFREEBUSY\r
FREEBUSY:20260720T230000Z/20260721T003000Z,\r
 20260721T020000Z/PT1H30M\r
FREEBUSY;FBTYPE=BUSY-UNAVAILABLE:20260721T040000Z/PT2H\r
FREEBUSY;FBTYPE=FREE:20260721T070000Z/PT1H\r
END:VFREEBUSY\r
END:VCALENDAR\r
`;
  const intervals = parseFreeBusyCalendar(
    calendar,
    DateTime.fromISO('2026-07-21T00:00:00Z'),
    DateTime.fromISO('2026-07-21T05:00:00Z'),
  );
  assert.deepEqual(
    intervals.map(({start, end}) => [start.toISO(), end.toISO()]),
    [
      ['2026-07-21T00:00:00.000Z', '2026-07-21T00:30:00.000Z'],
      ['2026-07-21T02:00:00.000Z', '2026-07-21T03:30:00.000Z'],
      ['2026-07-21T04:00:00.000Z', '2026-07-21T05:00:00.000Z'],
    ],
  );
  assert.ok(intervals.every(({start, end}) => start.zoneName === 'UTC' && end.zoneName === 'UTC'));
});

test('free-busy parser fails generically for malformed or unsafe provider data', () => {
  const token = 'private-provider-diagnostic';
  const twoFreeBusyComponents = `BEGIN:VCALENDAR\r
BEGIN:VFREEBUSY\r
END:VFREEBUSY\r
BEGIN:VFREEBUSY\r
END:VFREEBUSY\r
END:VCALENDAR\r
`;
  for (const body of [
    `BEGIN:VCALENDAR\r\nBEGIN:VFREEBUSY\r\nFREEBUSY:${token}\r\n`,
    `<!DOCTYPE x [<!ENTITY leak "${token}">]><x/>`,
    `BEGIN:VCALENDAR\r\nBEGIN:VFREEBUSY\r\nFREEBUSY:20260721T010000/20260721T020000Z\r\nEND:VFREEBUSY\r\nEND:VCALENDAR\r\n`,
    `BEGIN:VCALENDAR\r\nBEGIN:VFREEBUSY\r\nFREEBUSY:20260721T010000Z/P1DT\r\nEND:VFREEBUSY\r\nEND:VCALENDAR\r\n`,
    `BEGIN:VCALENDAR\r\nBEGIN:VFREEBUSY\r\nFREEBUSY;FBTYPE=BUSY;FBTYPE=FREE:20260721T010000Z/PT1H\r\nEND:VFREEBUSY\r\nEND:VCALENDAR\r\n`,
    `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:20260721T010000Z\r\nDTEND:20260721T020000Z\r\nSUMMARY:${token}\r\nEND:VEVENT\r\nBEGIN:VFREEBUSY\r\nEND:VFREEBUSY\r\nEND:VCALENDAR\r\n`,
    `${freeBusyCalendar()}${freeBusyCalendar(1)}`,
    twoFreeBusyComponents,
  ]) {
    assert.throws(
      () => parseFreeBusyCalendar(body, windowStart, windowEnd),
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
  const {requests, fetchImpl} = authenticatedDiscoveryFetch({redirectBase: true});
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
  for (const names of [
    calendarNames.slice(0, 3),
    [calendarNames[0], calendarNames[0], calendarNames[2], calendarNames[3]],
  ]) {
    const {requests, fetchImpl} = authenticatedDiscoveryFetch({collections: collectionsXml(names)});
    await assert.rejects(
      fetchICloudBusyIntervals(config, {
        windowStart,
        windowEnd,
        allowedHosts,
        fetchImpl,
      }),
      /iCloud CalDAV data could not be fetched safely/,
    );
    assert.equal(requests.some(({options}) => options.method === 'REPORT'), false);
  }
});
