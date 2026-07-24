import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {DateTime, Duration} from 'luxon';
import ical from 'node-ical';

import {
  fetchICloudBusyIntervals,
  iCloudCalDavFailureStage,
  iCloudCalDavConfigFromEnvironment,
} from './icloud-caldav.mjs';
import {
  IDEA_SNAPSHOT_COVERAGE_DAYS,
  IDEA_SNAPSHOT_MAX_AGE_DAYS,
  ideaSnapshotFromEnvironment,
  parseIdeaBusySnapshot,
} from './idea-snapshot.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_CONFIG_PATH = path.join(PROJECT_ROOT, 'data', 'availability.json');
const DEFAULT_OUTPUT_PATH = path.join(PROJECT_ROOT, 'public', 'availability', 'busy.json');
const MAX_CALDAV_CALENDARS = 10;

const PUBLIC_ROOT_KEYS = [
  'busy',
  'display_hours',
  'generated_at',
  'schema_version',
  'slot_minutes',
  'status',
  'timezone',
  'window_end',
  'window_start',
];
const PUBLIC_BUSY_KEYS = ['end', 'start'];
const PUBLIC_DISPLAY_HOURS_KEYS = ['end', 'start'];

function unwrap(value) {
  if (value && typeof value === 'object' && 'val' in value) return value.val;
  return value;
}

function normalizeToken(value) {
  return String(unwrap(value) ?? '').trim().toUpperCase();
}

function eventOccupiesTime(event) {
  if (!event || event.type !== 'VEVENT') return false;
  if (normalizeToken(event.status) === 'CANCELLED') return false;
  if (normalizeToken(event.method) === 'CANCEL') return false;
  return normalizeToken(event.transparency) !== 'TRANSPARENT';
}

function parseClock(value, name) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value));
  if (!match) throw new Error(`${name} must use HH:MM format`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error(`${name} is outside a valid day`);
  return {hour, minute};
}

function normalizeAllowedCaldavHosts(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('allowed_caldav_hosts must contain at least one hostname');
  }
  const hosts = value.map((entry) => String(entry).trim().toLowerCase());
  for (const host of hosts) {
    const candidate = host.startsWith('*.') ? host.slice(2) : host;
    if (
      !candidate.includes('.')
      || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(candidate)
      || candidate.includes('..')
    ) {
      throw new Error('allowed_caldav_hosts contains an invalid hostname');
    }
  }
  return [...new Set(hosts)];
}

export async function readAvailabilityConfig(configPath = DEFAULT_CONFIG_PATH) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  if (!DateTime.local().setZone(config.timezone).isValid) throw new Error('Invalid availability timezone');
  if (!Number.isInteger(config.horizon_days) || config.horizon_days < 1 || config.horizon_days > 93) {
    throw new Error('horizon_days must be an integer from 1 to 93');
  }
  if (!Number.isInteger(config.slot_minutes) || config.slot_minutes < 5 || 60 % config.slot_minutes !== 0) {
    throw new Error('slot_minutes must evenly divide one hour');
  }
  const start = parseClock(config.display_hours?.start, 'display_hours.start');
  const end = parseClock(config.display_hours?.end, 'display_hours.end');
  if (end.hour * 60 + end.minute <= start.hour * 60 + start.minute) {
    throw new Error('display_hours.end must be later than display_hours.start');
  }
  if (
    !Number.isInteger(config.expected_caldav_calendar_count)
    || config.expected_caldav_calendar_count < 1
    || config.expected_caldav_calendar_count > MAX_CALDAV_CALENDARS
  ) {
    throw new Error(`expected_caldav_calendar_count must be an integer from 1 to ${MAX_CALDAV_CALENDARS}`);
  }
  const allowedCaldavHosts = normalizeAllowedCaldavHosts(config.allowed_caldav_hosts);
  if (
    config.idea_snapshot_coverage_days !== IDEA_SNAPSHOT_COVERAGE_DAYS
  ) {
    throw new Error(`idea_snapshot_coverage_days must be ${IDEA_SNAPSHOT_COVERAGE_DAYS}`);
  }
  if (
    !Number.isInteger(config.idea_snapshot_max_age_days)
    || config.idea_snapshot_max_age_days < 1
    || config.idea_snapshot_max_age_days > IDEA_SNAPSHOT_MAX_AGE_DAYS
  ) {
    throw new Error(`idea_snapshot_max_age_days must be an integer from 1 to ${IDEA_SNAPSHOT_MAX_AGE_DAYS}`);
  }
  return {
    ...config,
    allowed_caldav_hosts: allowedCaldavHosts,
    display_hours_parts: {start, end},
  };
}

export function selectAvailabilitySourceMode({
  iCloudConfig,
  ideaSnapshot,
  localInputCount,
  requireRemoteSources = false,
}) {
  if (
    !Number.isInteger(localInputCount)
    || localInputCount < 0
    || typeof requireRemoteSources !== 'boolean'
  ) {
    throw new Error('Availability source state could not be validated safely');
  }
  const remoteGroups = [Boolean(iCloudConfig), Boolean(ideaSnapshot)];
  const hasAnyRemoteGroup = remoteGroups.some(Boolean);

  if (hasAnyRemoteGroup && localInputCount > 0) {
    throw new Error('Choose exactly one availability source mode');
  }
  if (hasAnyRemoteGroup && !remoteGroups.every(Boolean)) {
    throw new Error('Availability sources are not fully configured');
  }
  if (hasAnyRemoteGroup) return 'production';
  if (localInputCount > 0) return 'local';
  if (requireRemoteSources) throw new Error('Availability sources are required in production');
  return 'unconfigured';
}

function fullDayInterval(instance, timezone) {
  const start = DateTime.fromObject(
    {
      year: instance.start.getFullYear(),
      month: instance.start.getMonth() + 1,
      day: instance.start.getDate(),
    },
    {zone: timezone},
  ).startOf('day');
  let end = DateTime.fromObject(
    {
      year: instance.end.getFullYear(),
      month: instance.end.getMonth() + 1,
      day: instance.end.getDate(),
    },
    {zone: timezone},
  ).startOf('day');
  if (end <= start) end = start.plus({days: 1});
  return {start, end};
}

function timedInterval(instance, timezone) {
  const start = DateTime.fromJSDate(instance.start, {zone: 'utc'}).setZone(timezone);
  let end = DateTime.fromJSDate(instance.end, {zone: 'utc'}).setZone(timezone);
  if (!end.isValid || end <= start) end = start.plus({minutes: 30});
  return {start, end};
}

function parseICalDate(value, params, fallbackZone) {
  const raw = String(value).trim();
  const zone = params?.TZID || fallbackZone;
  if (/^\d{8}$/.test(raw)) {
    return DateTime.fromFormat(raw, 'yyyyLLdd', {zone}).startOf('day');
  }
  if (/^\d{8}T\d{6}Z$/.test(raw)) {
    return DateTime.fromFormat(raw, "yyyyLLdd'T'HHmmss'Z'", {zone: 'utc'});
  }
  if (/^\d{8}T\d{4}Z$/.test(raw)) {
    return DateTime.fromFormat(raw, "yyyyLLdd'T'HHmm'Z'", {zone: 'utc'});
  }
  if (/^\d{8}T\d{6}$/.test(raw)) {
    return DateTime.fromFormat(raw, "yyyyLLdd'T'HHmmss", {zone});
  }
  if (/^\d{8}T\d{4}$/.test(raw)) {
    return DateTime.fromFormat(raw, "yyyyLLdd'T'HHmm", {zone});
  }
  return DateTime.invalid('Unsupported iCalendar date');
}

function eventDuration(event) {
  if (event.start instanceof Date && event.end instanceof Date && event.end > event.start) {
    return event.end.getTime() - event.start.getTime();
  }
  return 30 * 60 * 1000;
}

function isExcludedStart(start, event, isFullDay, timezone) {
  if (!event.exdate) return false;
  for (const excluded of new Set(Object.values(event.exdate))) {
    if (!(excluded instanceof Date)) continue;
    if (isFullDay || excluded.dateOnly) {
      const excludedDay = DateTime.fromJSDate(excluded).setZone(timezone).toISODate();
      if (excludedDay === start.setZone(timezone).toISODate()) return true;
    } else if (excluded.getTime() === start.toMillis()) {
      return true;
    }
  }
  return false;
}

function expandRDates(event, timezone) {
  if (!event.rdate) return [];
  const durationMs = eventDuration(event);
  const instances = [];

  const entries = Array.isArray(event.rdate) ? event.rdate : [event.rdate];
  for (const entry of entries) {
    const params = entry && typeof entry === 'object' ? entry.params || {} : {};
    const raw = String(unwrap(entry) ?? '');
    const isPeriod = String(params.VALUE || '').toUpperCase() === 'PERIOD';
    const isFullDay = String(params.VALUE || '').toUpperCase() === 'DATE';

    for (const item of raw.split(',').map((part) => part.trim()).filter(Boolean)) {
      const [startRaw, endRaw] = isPeriod ? item.split('/', 2) : [item, null];
      const start = parseICalDate(startRaw, params, timezone);
      if (!start.isValid || (isPeriod && !endRaw)) throw new Error('invalid RDATE');
      if (isExcludedStart(start, event, isFullDay, timezone)) continue;

      let end;
      if (endRaw?.startsWith('P')) {
        end = start.plus(Duration.fromISO(endRaw));
      } else if (endRaw) {
        end = parseICalDate(endRaw, params, timezone);
      } else if (isFullDay) {
        end = start.plus({days: Math.max(1, Math.round(durationMs / 86_400_000))});
      } else {
        end = start.plus({milliseconds: durationMs});
      }
      if (!end?.isValid || end <= start) throw new Error('invalid RDATE');
      instances.push({start: start.toJSDate(), end: end.toJSDate(), isFullDay, event});
    }
  }
  return instances;
}

function roundOutward(interval, slotMinutes) {
  const slotMs = slotMinutes * 60 * 1000;
  return {
    start: DateTime.fromMillis(Math.floor(interval.start.toMillis() / slotMs) * slotMs, {zone: interval.start.zone}),
    end: DateTime.fromMillis(Math.ceil(interval.end.toMillis() / slotMs) * slotMs, {zone: interval.end.zone}),
  };
}

function clipToPublicHours(interval, config, windowStart, windowEnd) {
  const boundedStart = DateTime.max(interval.start, windowStart);
  const boundedEnd = DateTime.min(interval.end, windowEnd);
  if (boundedEnd <= boundedStart) return [];

  const result = [];
  let day = boundedStart.setZone(config.timezone).startOf('day');
  const finalDay = boundedEnd.minus({milliseconds: 1}).setZone(config.timezone).startOf('day');
  while (day <= finalDay) {
    const publicStart = day.set(config.display_hours_parts.start);
    const publicEnd = day.set(config.display_hours_parts.end);
    const start = DateTime.max(boundedStart, publicStart);
    const end = DateTime.min(boundedEnd, publicEnd);
    if (end > start) result.push({start, end});
    day = day.plus({days: 1});
  }
  return result;
}

function mergeIntervals(intervals) {
  const sorted = intervals.toSorted((left, right) => left.start.toMillis() - right.start.toMillis());
  const merged = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end) {
      if (interval.end > previous.end) previous.end = interval.end;
    } else {
      merged.push({...interval});
    }
  }
  return merged;
}

function expandEvent(event, windowStart, windowEnd, timezone) {
  const expansionOptions = {
    from: windowStart.toJSDate(),
    to: windowEnd.toJSDate(),
    includeOverrides: true,
    excludeExdates: true,
    expandOngoing: true,
  };
  const instances = ical.expandRecurringEvent(event, expansionOptions);
  for (const override of new Set(Object.values(event.recurrences || {}))) {
    if (!eventOccupiesTime(override)) continue;
    instances.push(...ical.expandRecurringEvent(override, expansionOptions));
  }
  instances.push(...expandRDates(event, timezone));
  return instances;
}

function withoutLibraryLogging(callback) {
  const originalWarn = console.warn;
  const originalError = console.error;
  let hadDiagnostics = false;
  console.warn = () => {
    hadDiagnostics = true;
  };
  console.error = () => {
    hadDiagnostics = true;
  };
  try {
    const result = callback();
    if (hadDiagnostics) throw new Error('calendar parser diagnostics');
    return result;
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
}

function unfoldedCalendarLines(calendarText) {
  const physicalLines = calendarText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = [];
  for (const line of physicalLines) {
    if (/^[ \t]/.test(line) && lines.length) lines[lines.length - 1] += line.slice(1);
    else lines.push(line);
  }
  return lines;
}

function assertSupportedCalendarStructure(calendarText) {
  let eventDepth = 0;
  for (const line of unfoldedCalendarLines(calendarText)) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const header = line.slice(0, separator);
    const value = line.slice(separator + 1).trim().toUpperCase();
    const parts = header.split(';');
    const propertyName = parts[0].split('.').at(-1).trim().toUpperCase();

    if (propertyName === 'BEGIN' && value === 'VEVENT') {
      eventDepth += 1;
      if (eventDepth !== 1) throw new Error('invalid VEVENT nesting');
    } else if (propertyName === 'END' && value === 'VEVENT') {
      eventDepth -= 1;
      if (eventDepth !== 0) throw new Error('invalid VEVENT nesting');
    } else if (propertyName === 'END' && value === 'VCALENDAR' && eventDepth !== 0) {
      throw new Error('unterminated VEVENT');
    }

    if (propertyName === 'RECURRENCE-ID') {
      for (const parameter of parts.slice(1)) {
        const equals = parameter.indexOf('=');
        if (equals < 0) continue;
        const name = parameter.slice(0, equals).trim().toUpperCase();
        if (name === 'RANGE') throw new Error('unsupported recurrence range');
      }
    }
  }
  if (eventDepth !== 0) throw new Error('unterminated VEVENT');
}

function assertParsedEventIsSafe(event, seen = new Set()) {
  if (!event || event.type !== 'VEVENT' || seen.has(event)) return;
  seen.add(event);
  if (eventOccupiesTime(event)) {
    if (!(event.start instanceof Date) || !Number.isFinite(event.start.getTime())) {
      throw new Error('invalid event start');
    }
    if (event.end != null && (!(event.end instanceof Date) || !Number.isFinite(event.end.getTime()))) {
      throw new Error('invalid event end');
    }
  }
  for (const override of Object.values(event.recurrences || {})) {
    assertParsedEventIsSafe(override, seen);
  }
}

export function availabilityWindow(config, now = DateTime.utc()) {
  return {
    generatedAt: now.toUTC().startOf('second'),
    windowStart: now.setZone(config.timezone).startOf('day'),
    windowEnd: now.setZone(config.timezone).startOf('day').plus({days: config.horizon_days}),
  };
}

export function calendarTextsToIntervals(calendarTexts, config, now = DateTime.utc()) {
  process.env.TZ = config.timezone;
  const {windowStart, windowEnd} = availabilityWindow(config, now);
  const intervals = [];

  for (const calendarText of calendarTexts) {
    try {
      withoutLibraryLogging(() => {
        assertSupportedCalendarStructure(calendarText);
        const parsed = ical.sync.parseICS(calendarText);
        for (const component of Object.values(parsed)) {
          assertParsedEventIsSafe(component);
          if (!eventOccupiesTime(component)) continue;
          for (const instance of expandEvent(component, windowStart, windowEnd, config.timezone)) {
            if (!eventOccupiesTime(instance.event)) continue;
            const rawInterval = instance.isFullDay
              ? fullDayInterval(instance, config.timezone)
              : timedInterval(instance, config.timezone);
            intervals.push(rawInterval);
          }
        }
      });
    } catch {
      throw new Error('Calendar data could not be parsed safely');
    }
  }

  return intervals;
}

export function buildPublicPayload(rawIntervals, config, now = DateTime.utc()) {
  const {generatedAt, windowStart, windowEnd} = availabilityWindow(config, now);
  const intervals = [];
  for (const interval of rawIntervals) {
    if (
      !interval
      || !DateTime.isDateTime(interval.start)
      || !DateTime.isDateTime(interval.end)
      || !interval.start.isValid
      || !interval.end.isValid
      || interval.end <= interval.start
    ) {
      throw new Error('Busy interval data could not be parsed safely');
    }
    const rounded = roundOutward(interval, config.slot_minutes);
    intervals.push(...clipToPublicHours(rounded, config, windowStart, windowEnd));
  }

  const busy = mergeIntervals(intervals).map((interval) => ({
    start: interval.start.toUTC().toISO({suppressMilliseconds: true}),
    end: interval.end.toUTC().toISO({suppressMilliseconds: true}),
  }));

  const payload = {
    schema_version: 1,
    status: 'ready',
    generated_at: generatedAt.toISO({suppressMilliseconds: true}),
    timezone: config.timezone,
    window_start: windowStart.toISODate(),
    window_end: windowEnd.toISODate(),
    slot_minutes: config.slot_minutes,
    display_hours: {...config.display_hours},
    busy,
  };
  assertPublicPayload(payload);
  return payload;
}

export function sanitizeCalendarText(calendarTexts, config, now = DateTime.utc()) {
  return buildPublicPayload(calendarTextsToIntervals(calendarTexts, config, now), config, now);
}

export function unconfiguredPayload(config, now = DateTime.utc()) {
  const generatedAt = now.toUTC().startOf('second');
  const windowStart = now.setZone(config.timezone).startOf('day');
  const payload = {
    schema_version: 1,
    status: 'unconfigured',
    generated_at: generatedAt.toISO({suppressMilliseconds: true}),
    timezone: config.timezone,
    window_start: windowStart.toISODate(),
    window_end: windowStart.plus({days: config.horizon_days}).toISODate(),
    slot_minutes: config.slot_minutes,
    display_hours: {...config.display_hours},
    busy: [],
  };
  assertPublicPayload(payload);
  return payload;
}

function sameKeys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...allowed].sort());
}

export function assertPublicPayload(payload) {
  if (!sameKeys(payload, PUBLIC_ROOT_KEYS)) throw new Error('Public calendar payload contains unexpected root fields');
  if (payload.schema_version !== 1) throw new Error('Public calendar payload has an unsupported schema');
  if (!['ready', 'unconfigured'].includes(payload.status)) throw new Error('Public calendar payload has invalid status');
  const generatedAt = DateTime.fromISO(payload.generated_at, {setZone: true});
  if (!generatedAt.isValid) {
    throw new Error('Public calendar payload has an invalid generation timestamp');
  }
  if (!DateTime.local().setZone(payload.timezone).isValid) throw new Error('Public calendar payload has an invalid timezone');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.window_start) || !/^\d{4}-\d{2}-\d{2}$/.test(payload.window_end)) {
    throw new Error('Public calendar payload has an invalid date window');
  }
  const windowStart = DateTime.fromISO(payload.window_start, {zone: payload.timezone});
  const windowEnd = DateTime.fromISO(payload.window_end, {zone: payload.timezone});
  if (!windowStart.isValid || !windowEnd.isValid || windowEnd <= windowStart) {
    throw new Error('Public calendar payload has an invalid date window');
  }
  if (generatedAt.setZone(payload.timezone).toISODate() !== payload.window_start) {
    throw new Error('Public calendar window does not match its generation date');
  }
  if (!Number.isInteger(payload.slot_minutes) || payload.slot_minutes < 5 || 60 % payload.slot_minutes !== 0) {
    throw new Error('Public calendar payload has an invalid slot size');
  }
  if (!sameKeys(payload.display_hours, PUBLIC_DISPLAY_HOURS_KEYS)) {
    throw new Error('Public calendar display hours contain unexpected fields');
  }
  const displayStart = parseClock(payload.display_hours.start, 'display_hours.start');
  const displayEnd = parseClock(payload.display_hours.end, 'display_hours.end');
  if (displayEnd.hour * 60 + displayEnd.minute <= displayStart.hour * 60 + displayStart.minute) {
    throw new Error('Public calendar payload has invalid display hours');
  }
  if (!Array.isArray(payload.busy)) throw new Error('Public calendar busy field must be an array');
  if (payload.busy.length > 5000) throw new Error('Public calendar contains too many busy intervals');
  let previousEnd = null;
  for (const interval of payload.busy) {
    if (!sameKeys(interval, PUBLIC_BUSY_KEYS)) throw new Error('Busy interval contains a private field');
    if (!DateTime.fromISO(interval.start, {setZone: true}).isValid || !DateTime.fromISO(interval.end, {setZone: true}).isValid) {
      throw new Error('Busy interval contains an invalid timestamp');
    }
    const intervalStart = DateTime.fromISO(interval.start, {setZone: true});
    const intervalEnd = DateTime.fromISO(interval.end, {setZone: true});
    if (intervalEnd <= intervalStart) {
      throw new Error('Busy interval has a non-positive duration');
    }
    if (previousEnd && intervalStart <= previousEnd) {
      throw new Error('Busy intervals must be sorted and merged');
    }
    const localStart = intervalStart.setZone(payload.timezone);
    const localEnd = intervalEnd.setZone(payload.timezone);
    if (localStart < windowStart || localEnd > windowEnd || localStart.toISODate() !== localEnd.toISODate()) {
      throw new Error('Busy interval is outside the public date window');
    }
    const publicStart = localStart.startOf('day').set(displayStart);
    const publicEnd = localStart.startOf('day').set(displayEnd);
    if (localStart < publicStart || localEnd > publicEnd) {
      throw new Error('Busy interval is outside public display hours');
    }
    previousEnd = intervalEnd;
  }
}

function parseArgs(argv) {
  const args = {
    config: DEFAULT_CONFIG_PATH,
    output: DEFAULT_OUTPUT_PATH,
    inputs: [],
    requireSources: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--config') args.config = path.resolve(argv[++index]);
    else if (token === '--output') args.output = path.resolve(argv[++index]);
    else if (token === '--input') args.inputs.push(path.resolve(argv[++index]));
    else if (token === '--require-sources') args.requireSources = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return args;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const config = await readAvailabilityConfig(args.config);
  process.env.TZ = config.timezone;
  const localInputs = await Promise.all(args.inputs.map((input) => readFile(input, 'utf8')));
  const caldavConfig = iCloudCalDavConfigFromEnvironment(
    process.env,
    config.expected_caldav_calendar_count,
  );
  const ideaSnapshot = ideaSnapshotFromEnvironment(process.env);
  const sourceMode = selectAvailabilitySourceMode({
    iCloudConfig: caldavConfig,
    ideaSnapshot,
    localInputCount: localInputs.length,
    requireRemoteSources: args.requireSources,
  });

  let payload;
  if (sourceMode === 'production') {
    const now = DateTime.utc();
    const {windowStart, windowEnd} = availabilityWindow(config, now);
    const ideaIntervals = parseIdeaBusySnapshot(ideaSnapshot, config, {
      now,
      windowStart,
      windowEnd,
    });
    const iCloudIntervals = await fetchICloudBusyIntervals(caldavConfig, {
      allowedHosts: config.allowed_caldav_hosts,
      windowStart,
      windowEnd,
    });
    payload = buildPublicPayload(
      [...iCloudIntervals, ...ideaIntervals],
      config,
      now,
    );
  } else if (sourceMode === 'local') {
    payload = sanitizeCalendarText(localInputs, config);
  } else {
    payload = unconfiguredPayload(config);
  }
  await mkdir(path.dirname(args.output), {recursive: true});
  await writeFile(args.output, `${JSON.stringify(payload)}\n`, {mode: 0o644});
  console.log(payload.status === 'ready' ? 'Anonymized availability generated.' : 'Availability source is not configured.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Availability generation failed: ${error.message}`);
    const failureStage = iCloudCalDavFailureStage(error);
    if (failureStage) console.error(`Availability failure stage: ${failureStage}`);
    process.exitCode = 1;
  });
}
