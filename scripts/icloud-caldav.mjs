import {DateTime} from 'luxon';
import {SaxesParser} from 'saxes';

const DAV_NAMESPACE = 'DAV:';
const CALDAV_NAMESPACE = 'urn:ietf:params:xml:ns:caldav';
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_DISCOVERY_BYTES = 2 * 1024 * 1024;
const MAX_FREE_BUSY_BYTES = 4 * 1024 * 1024;
const MAX_XML_DEPTH = 32;
const MAX_XML_NODES = 50_000;
const MAX_BUSY_INTERVALS = 50_000;
const MAX_QUERY_MILLISECONDS = 94 * 24 * 60 * 60 * 1000;
const EXPECTED_CALENDAR_COUNT = 4;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const READ_ONLY_METHODS = new Set(['PROPFIND', 'REPORT']);
const ICLOUD_CALDAV_HOST_PATTERN = /^(?:caldav|p\d+-caldav)\.icloud\.com(?:\.cn)?$/;

const CURRENT_USER_PRINCIPAL_REQUEST = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:current-user-principal/></d:prop>
</d:propfind>`;

const CALENDAR_HOME_REQUEST = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-home-set/></d:prop>
</d:propfind>`;

const CALENDAR_COLLECTIONS_REQUEST = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <c:supported-calendar-component-set/>
  </d:prop>
</d:propfind>`;

const ENVIRONMENT_KEYS = Object.freeze({
  baseUrl: 'ICLOUD_CALDAV_BASE_URL',
  username: 'ICLOUD_CALDAV_USERNAME',
  appPassword: 'ICLOUD_CALDAV_APP_PASSWORD',
  calendarNamesJson: 'ICLOUD_CALDAV_CALENDAR_NAMES_JSON',
});

function genericConfigurationError() {
  return new Error('iCloud CalDAV configuration could not be validated safely');
}

function genericRequestError() {
  return new Error('iCloud CalDAV data could not be fetched safely');
}

function normalizeAllowedHosts(value) {
  if (!Array.isArray(value) || value.length === 0) throw genericConfigurationError();
  const hosts = value.map((entry) => String(entry).trim().toLowerCase());
  for (const host of hosts) {
    const candidate = host.startsWith('*.') ? host.slice(2) : host;
    if (
      !candidate.includes('.')
      || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(candidate)
      || candidate.includes('..')
    ) {
      throw genericConfigurationError();
    }
  }
  return [...new Set(hosts)];
}

function hostnameMatches(hostname, pattern) {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1);
    return hostname.endsWith(suffix) && hostname.length > suffix.length;
  }
  return hostname === pattern;
}

export function normalizeICloudCalDavUrl(value, allowedHosts) {
  try {
    const hosts = normalizeAllowedHosts(allowedHosts);
    const raw = String(value).trim();
    if (!raw || raw.length > 8192) throw new Error('invalid URL');
    const url = new URL(raw);
    if (
      url.protocol !== 'https:'
      || url.username
      || url.password
      || url.port
      || url.hash
      || url.search
    ) {
      throw new Error('unsafe URL');
    }
    const hostname = url.hostname.toLowerCase();
    if (
      !ICLOUD_CALDAV_HOST_PATTERN.test(hostname)
      || !hosts.some((pattern) => hostnameMatches(hostname, pattern))
    ) {
      throw new Error('unapproved host');
    }
    return url;
  } catch {
    throw genericConfigurationError();
  }
}

function validateCredentialPart(value, {allowColon = true, maxLength = 512} = {}) {
  const normalized = String(value ?? '').trim();
  if (
    !normalized
    || normalized.length > maxLength
    || /[\u0000-\u001f\u007f]/.test(normalized)
    || (!allowColon && normalized.includes(':'))
  ) {
    throw genericConfigurationError();
  }
  return normalized;
}

export function parseICloudCalendarNames(value, expectedCount = EXPECTED_CALENDAR_COUNT) {
  try {
    if (!Number.isInteger(expectedCount) || expectedCount < 1 || expectedCount > 10) {
      throw new Error('invalid count');
    }
    const names = JSON.parse(String(value));
    if (!Array.isArray(names) || names.length !== expectedCount) throw new Error('invalid names');
    const normalized = names.map((name) => {
      if (typeof name !== 'string' || name !== name.trim() || !name || name.length > 256) {
        throw new Error('invalid name');
      }
      if (/[\u0000-\u001f\u007f]/.test(name)) throw new Error('invalid name');
      return name.normalize('NFC');
    });
    if (new Set(normalized).size !== normalized.length) throw new Error('duplicate names');
    return normalized;
  } catch {
    throw genericConfigurationError();
  }
}

export function iCloudCalDavConfigFromEnvironment(
  environment = process.env,
  expectedCount = EXPECTED_CALENDAR_COUNT,
) {
  const values = Object.fromEntries(
    Object.entries(ENVIRONMENT_KEYS).map(([name, key]) => [name, environment[key]]),
  );
  const configured = Object.values(values).filter(
    (value) => typeof value === 'string' && value.trim() !== '',
  ).length;
  if (configured === 0) return null;
  if (configured !== Object.keys(ENVIRONMENT_KEYS).length) throw genericConfigurationError();

  return {
    baseUrl: String(values.baseUrl).trim(),
    username: validateCredentialPart(values.username, {allowColon: false, maxLength: 320}),
    appPassword: validateCredentialPart(values.appPassword, {maxLength: 256}),
    calendarNames: parseICloudCalendarNames(values.calendarNamesJson, expectedCount),
    expectedCalendarCount: expectedCount,
  };
}

async function cancelResponseBody(response) {
  try {
    await response.body?.cancel?.();
  } catch {
    // Response bodies can contain private provider diagnostics. Ignore cancellation errors.
  }
}

async function readResponseBytes(response, maxBytes) {
  const declaredLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw genericRequestError();

  if (!response.body?.getReader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) throw genericRequestError();
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let bytesRead = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) throw genericRequestError();
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    try {
      await reader.cancel();
    } catch {
      // Ignore cancellation diagnostics and preserve the generic outer failure.
    }
    throw error;
  }
  return Buffer.concat(chunks, bytesRead);
}

function basicChallengeOffered(response) {
  const challenge = response.headers?.get?.('www-authenticate');
  // Fail closed unless Basic is the leading challenge. This avoids treating
  // the word "Basic" inside another scheme's quoted parameters as a scheme.
  return typeof challenge === 'string' && /^\s*Basic(?:\s|$)/i.test(challenge);
}

function requestHeaders(method, authorization) {
  const headers = {
    Accept: method === 'REPORT' ? 'text/calendar, application/xml;q=0.9' : 'application/xml, text/xml;q=0.9',
    'Content-Type': 'application/xml; charset=utf-8',
    'User-Agent': 'loujc-availability-calendar/1.0',
  };
  if (authorization) headers.Authorization = authorization;
  return headers;
}

async function requestOnce(fetchImpl, url, method, body, depth, signal, authorization) {
  return fetchImpl(url, {
    method,
    body,
    redirect: 'manual',
    signal,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    headers: {
      ...requestHeaders(method, authorization),
      Depth: String(depth),
    },
  });
}

async function readOnlyCalDavRequest(
  target,
  {method, body, depth, expectedStatus, credential, allowedHosts, fetchImpl, maxBytes},
) {
  try {
    if (!READ_ONLY_METHODS.has(method) || typeof fetchImpl !== 'function') throw new Error('unsafe request');
    let url = normalizeICloudCalDavUrl(target, allowedHosts);
    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const authorization = `Basic ${Buffer.from(`${credential.username}:${credential.appPassword}`, 'utf8').toString('base64')}`;

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      let response = await requestOnce(fetchImpl, url, method, body, depth, signal);
      if (response.status === 401) {
        const offered = basicChallengeOffered(response);
        await cancelResponseBody(response);
        if (!offered) throw new Error('unsupported authentication challenge');
        response = await requestOnce(fetchImpl, url, method, body, depth, signal, authorization);
        if (response.status === 401) {
          await cancelResponseBody(response);
          throw new Error('authentication rejected');
        }
      }

      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirects === MAX_REDIRECTS) throw new Error('too many redirects');
        const location = response.headers?.get?.('location');
        await cancelResponseBody(response);
        if (!location) throw new Error('redirect missing location');
        url = normalizeICloudCalDavUrl(new URL(location, url).href, allowedHosts);
        // Authentication is deliberately not forwarded. The new endpoint must
        // issue its own Basic challenge before it can receive the credential.
        continue;
      }

      if (response.status !== expectedStatus) {
        await cancelResponseBody(response);
        throw new Error('unexpected response status');
      }
      const bytes = await readResponseBytes(response, maxBytes);
      const text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
      return {url, text};
    }
    throw new Error('too many redirects');
  } catch {
    throw genericRequestError();
  }
}

function parseXmlTree(xml) {
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw genericRequestError();
  const stack = [];
  let root = null;
  let nodeCount = 0;
  const parser = new SaxesParser({xmlns: true});

  parser.on('doctype', () => {
    throw genericRequestError();
  });
  parser.on('opentag', (tag) => {
    nodeCount += 1;
    if (nodeCount > MAX_XML_NODES || stack.length >= MAX_XML_DEPTH) throw genericRequestError();
    const node = {
      uri: tag.uri,
      local: tag.local,
      attributes: Object.values(tag.attributes).map((attribute) => ({
        uri: attribute.uri,
        local: attribute.local,
        value: attribute.value,
      })),
      children: [],
      text: '',
    };
    if (stack.length) stack.at(-1).children.push(node);
    else if (root) throw genericRequestError();
    else root = node;
    stack.push(node);
  });
  parser.on('text', (value) => {
    if (stack.length) stack.at(-1).text += value;
  });
  parser.on('cdata', (value) => {
    if (stack.length) stack.at(-1).text += value;
  });
  parser.on('closetag', () => {
    stack.pop();
  });
  parser.on('error', () => {
    throw genericRequestError();
  });
  parser.write(xml).close();
  if (!root || stack.length) throw genericRequestError();
  return root;
}

function childElements(node, uri, local) {
  return node.children.filter((child) => child.uri === uri && child.local === local);
}

function firstChild(node, uri, local) {
  return childElements(node, uri, local)[0] ?? null;
}

function successfulProperties(response) {
  const properties = [];
  for (const propstat of childElements(response, DAV_NAMESPACE, 'propstat')) {
    const status = firstChild(propstat, DAV_NAMESPACE, 'status')?.text.trim() ?? '';
    if (!/^HTTP\/\d(?:\.\d)?\s+200\b/i.test(status)) continue;
    const prop = firstChild(propstat, DAV_NAMESPACE, 'prop');
    if (prop) properties.push(...prop.children);
  }
  return properties;
}

function parseMultiStatus(xml) {
  const root = parseXmlTree(xml);
  if (root.uri !== DAV_NAMESPACE || root.local !== 'multistatus') throw genericRequestError();
  return childElements(root, DAV_NAMESPACE, 'response');
}

function propertyHrefs(responses, propertyUri, propertyLocal, responseBaseUrl, allowedHosts) {
  const hrefs = [];
  for (const response of responses) {
    for (const property of successfulProperties(response)) {
      if (property.uri !== propertyUri || property.local !== propertyLocal) continue;
      const propertyHrefNodes = childElements(property, DAV_NAMESPACE, 'href');
      if (!propertyHrefNodes.length) throw genericRequestError();
      for (const hrefNode of propertyHrefNodes) {
        const href = hrefNode.text.trim();
        if (!href) throw genericRequestError();
        hrefs.push(normalizeICloudCalDavUrl(new URL(href, responseBaseUrl).href, allowedHosts));
      }
    }
  }
  const unique = [...new Map(hrefs.map((url) => [url.href, url])).values()];
  if (!unique.length || unique.length > 10) throw genericRequestError();
  return unique;
}

function uniquePropertyHref(responses, propertyUri, propertyLocal, responseBaseUrl, allowedHosts) {
  const unique = propertyHrefs(
    responses,
    propertyUri,
    propertyLocal,
    responseBaseUrl,
    allowedHosts,
  );
  if (unique.length !== 1) throw genericRequestError();
  return unique[0];
}

function attributeValue(node, local) {
  return node.attributes.find((attribute) => attribute.local === local)?.value ?? null;
}

function discoverCalendarCollections(xml, responseBaseUrl, allowedHosts) {
  const responses = parseMultiStatus(xml);
  const collections = [];
  for (const response of responses) {
    const href = firstChild(response, DAV_NAMESPACE, 'href')?.text.trim();
    if (!href) continue;
    const properties = successfulProperties(response);
    const displayName = properties.find(
      (property) => property.uri === DAV_NAMESPACE && property.local === 'displayname',
    )?.text;
    const resourceType = properties.find(
      (property) => property.uri === DAV_NAMESPACE && property.local === 'resourcetype',
    );
    const components = properties.find(
      (property) => property.uri === CALDAV_NAMESPACE
        && property.local === 'supported-calendar-component-set',
    );
    if (
      displayName === undefined
      || !resourceType?.children.some(
        (child) => child.uri === CALDAV_NAMESPACE && child.local === 'calendar',
      )
      || !components?.children.some(
        (child) => child.uri === CALDAV_NAMESPACE
          && child.local === 'comp'
          && String(attributeValue(child, 'name')).toUpperCase() === 'VEVENT',
      )
    ) {
      continue;
    }
    collections.push({
      name: displayName.normalize('NFC'),
      url: normalizeICloudCalDavUrl(new URL(href, responseBaseUrl).href, allowedHosts),
    });
  }
  return collections;
}

function selectNamedCalendarUrls(collections, desiredNames) {
  const selected = desiredNames.map((name) => {
    const matches = collections.filter((collection) => collection.name === name);
    if (matches.length !== 1) throw genericRequestError();
    return matches[0].url;
  });
  if (new Set(selected.map((url) => url.href)).size !== selected.length) throw genericRequestError();
  return selected;
}

function roundedQueryWindow(windowStart, windowEnd) {
  if (
    !DateTime.isDateTime(windowStart)
    || !DateTime.isDateTime(windowEnd)
    || !windowStart.isValid
    || !windowEnd.isValid
  ) {
    throw genericConfigurationError();
  }
  const requestedStart = windowStart.toUTC();
  const requestedEnd = windowEnd.toUTC();
  const duration = requestedEnd.toMillis() - requestedStart.toMillis();
  if (duration <= 0 || duration > MAX_QUERY_MILLISECONDS) throw genericConfigurationError();
  const queryStart = DateTime.fromMillis(
    Math.floor(requestedStart.toMillis() / 1000) * 1000,
    {zone: 'utc'},
  );
  const queryEnd = DateTime.fromMillis(
    Math.ceil(requestedEnd.toMillis() / 1000) * 1000,
    {zone: 'utc'},
  );
  return {requestedStart, requestedEnd, queryStart, queryEnd};
}

function formatCalDavTimestamp(value) {
  return value.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
}

function freeBusyRequestBody(start, end) {
  return `<?xml version="1.0" encoding="utf-8"?>
<c:free-busy-query xmlns:c="urn:ietf:params:xml:ns:caldav">
  <c:time-range start="${formatCalDavTimestamp(start)}" end="${formatCalDavTimestamp(end)}"/>
</c:free-busy-query>`;
}

function unfoldCalendarLines(value) {
  const physical = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const unfolded = [];
  for (const line of physical) {
    if (/^[ \t]/.test(line)) {
      if (!unfolded.length) throw genericRequestError();
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
    if (unfolded.at(-1)?.length > 1_000_000) throw genericRequestError();
  }
  return unfolded;
}

function splitOutsideQuotes(value, delimiter) {
  const parts = [];
  let start = 0;
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '"') quoted = !quoted;
    else if (value[index] === delimiter && !quoted) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  if (quoted) throw genericRequestError();
  parts.push(value.slice(start));
  return parts;
}

function parseContentLine(line) {
  let quoted = false;
  let separator = -1;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted;
    else if (line[index] === ':' && !quoted) {
      separator = index;
      break;
    }
  }
  if (separator < 1 || quoted) throw genericRequestError();
  const headerParts = splitOutsideQuotes(line.slice(0, separator), ';');
  const name = headerParts.shift().toUpperCase();
  const parameters = new Map();
  for (const parameter of headerParts) {
    const equals = parameter.indexOf('=');
    if (equals < 1) throw genericRequestError();
    const key = parameter.slice(0, equals).toUpperCase();
    if (parameters.has(key)) throw genericRequestError();
    let parameterValue = parameter.slice(equals + 1);
    if (parameterValue.startsWith('"') && parameterValue.endsWith('"')) {
      parameterValue = parameterValue.slice(1, -1);
    }
    parameters.set(key, parameterValue);
  }
  return {name, parameters, value: line.slice(separator + 1)};
}

function parseUtcCalendarDateTime(value) {
  if (!/^\d{8}T\d{6}Z$/.test(value)) throw genericRequestError();
  const result = DateTime.fromFormat(value, "yyyyLLdd'T'HHmmss'Z'", {zone: 'utc'});
  if (!result.isValid) throw genericRequestError();
  return result;
}

function parsePositiveDuration(value) {
  const match = /^P(?:(\d+)W|(?:(\d+)D)?(?:T(?=\d)(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?)$/.exec(value);
  if (!match || !match.slice(1).some((part) => part !== undefined)) throw genericRequestError();
  const seconds = match[1] !== undefined
    ? Number(match[1]) * 7 * 24 * 60 * 60
    : Number(match[2] ?? 0) * 24 * 60 * 60
      + Number(match[3] ?? 0) * 60 * 60
      + Number(match[4] ?? 0) * 60
      + Number(match[5] ?? 0);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) throw genericRequestError();
  return seconds;
}

function parseFreeBusyPeriod(value) {
  const parts = value.split('/');
  if (parts.length !== 2) throw genericRequestError();
  const start = parseUtcCalendarDateTime(parts[0]);
  const end = parts[1].startsWith('P')
    ? start.plus({seconds: parsePositiveDuration(parts[1])})
    : parseUtcCalendarDateTime(parts[1]);
  if (!end.isValid || end <= start) throw genericRequestError();
  return {start, end};
}

export function parseFreeBusyCalendar(calendarText, windowStart, windowEnd) {
  try {
    const {requestedStart, requestedEnd} = roundedQueryWindow(windowStart, windowEnd);
    const lines = unfoldCalendarLines(calendarText);
    let calendarDepth = 0;
    let freeBusyDepth = 0;
    let calendarCount = 0;
    let freeBusyCount = 0;
    let calendarClosed = false;
    const intervals = [];

    for (const line of lines) {
      if (!line) continue;
      const content = parseContentLine(line);
      const token = content.value.trim().toUpperCase();
      if (content.name === 'BEGIN' && token === 'VCALENDAR') {
        if (calendarDepth !== 0 || calendarClosed) throw genericRequestError();
        calendarCount += 1;
        if (calendarCount !== 1) throw genericRequestError();
        calendarDepth = 1;
      } else if (content.name === 'END' && token === 'VCALENDAR') {
        if (calendarDepth !== 1 || freeBusyDepth !== 0) throw genericRequestError();
        calendarDepth = 0;
        calendarClosed = true;
      } else if (content.name === 'BEGIN' && token === 'VFREEBUSY') {
        if (calendarDepth !== 1 || freeBusyDepth !== 0) throw genericRequestError();
        freeBusyCount += 1;
        if (freeBusyCount !== 1) throw genericRequestError();
        freeBusyDepth = 1;
      } else if (content.name === 'END' && token === 'VFREEBUSY') {
        if (calendarDepth !== 1 || freeBusyDepth !== 1) throw genericRequestError();
        freeBusyDepth = 0;
      } else if (content.name === 'BEGIN' || content.name === 'END') {
        // A free-busy response must not contain VEVENT or another component.
        throw genericRequestError();
      } else if (content.name === 'FREEBUSY' && freeBusyDepth === 1) {
        const type = String(content.parameters.get('FBTYPE') ?? 'BUSY').toUpperCase();
        if (type === 'FREE') continue;
        for (const period of content.value.split(',')) {
          const {start, end} = parseFreeBusyPeriod(period);
          const clippedStart = start < requestedStart ? requestedStart : start;
          const clippedEnd = end > requestedEnd ? requestedEnd : end;
          if (clippedEnd > clippedStart) intervals.push({start: clippedStart, end: clippedEnd});
          if (intervals.length > MAX_BUSY_INTERVALS) throw genericRequestError();
        }
      } else if (content.name === 'FREEBUSY') {
        throw genericRequestError();
      } else if (calendarDepth !== 1 || calendarClosed) {
        throw genericRequestError();
      }
    }
    if (calendarCount !== 1 || freeBusyCount !== 1 || calendarDepth !== 0 || freeBusyDepth !== 0) {
      throw genericRequestError();
    }
    return intervals.sort((left, right) => left.start.toMillis() - right.start.toMillis());
  } catch {
    throw genericRequestError();
  }
}

export async function fetchICloudBusyIntervals(
  caldavConfig,
  {windowStart, windowEnd, allowedHosts, fetchImpl = globalThis.fetch} = {},
) {
  try {
    if (!caldavConfig || typeof caldavConfig !== 'object') throw genericConfigurationError();
    const calendarNames = parseICloudCalendarNames(
      JSON.stringify(caldavConfig.calendarNames),
      caldavConfig.expectedCalendarCount,
    );
    const credential = {
      username: validateCredentialPart(caldavConfig.username, {allowColon: false, maxLength: 320}),
      appPassword: validateCredentialPart(caldavConfig.appPassword, {maxLength: 256}),
    };
    const baseUrl = normalizeICloudCalDavUrl(caldavConfig.baseUrl, allowedHosts);
    const {requestedStart, requestedEnd, queryStart, queryEnd} = roundedQueryWindow(windowStart, windowEnd);

    const principalResponse = await readOnlyCalDavRequest(baseUrl, {
      method: 'PROPFIND',
      body: CURRENT_USER_PRINCIPAL_REQUEST,
      depth: 0,
      expectedStatus: 207,
      credential,
      allowedHosts,
      fetchImpl,
      maxBytes: MAX_DISCOVERY_BYTES,
    });
    const principalUrl = uniquePropertyHref(
      parseMultiStatus(principalResponse.text),
      DAV_NAMESPACE,
      'current-user-principal',
      principalResponse.url,
      allowedHosts,
    );

    const homeResponse = await readOnlyCalDavRequest(principalUrl, {
      method: 'PROPFIND',
      body: CALENDAR_HOME_REQUEST,
      depth: 0,
      expectedStatus: 207,
      credential,
      allowedHosts,
      fetchImpl,
      maxBytes: MAX_DISCOVERY_BYTES,
    });
    const calendarHomeUrls = propertyHrefs(
      parseMultiStatus(homeResponse.text),
      CALDAV_NAMESPACE,
      'calendar-home-set',
      homeResponse.url,
      allowedHosts,
    );

    const collections = [];
    for (const calendarHomeUrl of calendarHomeUrls) {
      const collectionsResponse = await readOnlyCalDavRequest(calendarHomeUrl, {
        method: 'PROPFIND',
        body: CALENDAR_COLLECTIONS_REQUEST,
        depth: 1,
        expectedStatus: 207,
        credential,
        allowedHosts,
        fetchImpl,
        maxBytes: MAX_DISCOVERY_BYTES,
      });
      collections.push(...discoverCalendarCollections(
        collectionsResponse.text,
        collectionsResponse.url,
        allowedHosts,
      ));
    }
    const calendarUrls = selectNamedCalendarUrls(collections, calendarNames);

    const requestBody = freeBusyRequestBody(queryStart, queryEnd);
    const intervals = [];
    for (const calendarUrl of calendarUrls) {
      const response = await readOnlyCalDavRequest(calendarUrl, {
        method: 'REPORT',
        body: requestBody,
        // Depth:1 includes the calendar object resources inside the selected
        // collection. Depth:0 would query only the collection resource itself.
        depth: 1,
        expectedStatus: 200,
        credential,
        allowedHosts,
        fetchImpl,
        maxBytes: MAX_FREE_BUSY_BYTES,
      });
      intervals.push(...parseFreeBusyCalendar(response.text, requestedStart, requestedEnd));
      if (intervals.length > MAX_BUSY_INTERVALS) throw genericRequestError();
    }
    return intervals.sort((left, right) => left.start.toMillis() - right.start.toMillis());
  } catch {
    throw genericRequestError();
  }
}
