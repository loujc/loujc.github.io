import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {DateTime} from 'luxon';

export const IDEA_SNAPSHOT_ENV_NAME = 'IDEA_BUSY_SNAPSHOT';
export const IDEA_SNAPSHOT_MAX_BYTES = 8 * 1024;
export const IDEA_SNAPSHOT_COVERAGE_DAYS = 400;
export const IDEA_SNAPSHOT_MAX_AGE_DAYS = 90;

const SNAPSHOT_ROOT_KEYS = [
  'busy_bits',
  'captured_at',
  'coverage_end',
  'coverage_start',
  'display_hours',
  'encoding',
  'schema_version',
  'slot_minutes',
  'timezone',
];
const DISPLAY_HOURS_KEYS = ['end', 'start'];
const SNAPSHOT_ENCODING = 'day-major-msb0-base64';
const GENERIC_ERROR = 'IDEA snapshot could not be validated safely';
const MAX_CLOCK_SKEW_MINUTES = 5;
const CANONICAL_UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const CANONICAL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CANONICAL_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function fail(stage = 'internal') {
  const error = new Error(GENERIC_ERROR);
  Object.defineProperty(error, 'validationStage', {
    value: stage,
    enumerable: false,
  });
  throw error;
}

function atStage(stage, callback) {
  try {
    return callback();
  } catch {
    fail(stage);
  }
}

function sameKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function assertNoDuplicateObjectKeys(jsonText) {
  let index = 0;

  function skipWhitespace() {
    while (/\s/.test(jsonText[index] ?? '')) index += 1;
  }

  function parseStringToken() {
    const start = index;
    if (jsonText[index] !== '"') fail();
    index += 1;
    while (index < jsonText.length) {
      if (jsonText[index] === '\\') {
        index += 2;
        continue;
      }
      if (jsonText[index] === '"') {
        index += 1;
        return JSON.parse(jsonText.slice(start, index));
      }
      index += 1;
    }
    fail();
  }

  function parseValue() {
    skipWhitespace();
    if (jsonText[index] === '{') {
      parseObject();
      return;
    }
    if (jsonText[index] === '[') {
      index += 1;
      skipWhitespace();
      if (jsonText[index] === ']') {
        index += 1;
        return;
      }
      while (index < jsonText.length) {
        parseValue();
        skipWhitespace();
        if (jsonText[index] === ']') {
          index += 1;
          return;
        }
        if (jsonText[index] !== ',') fail();
        index += 1;
      }
      fail();
    }
    if (jsonText[index] === '"') {
      parseStringToken();
      return;
    }
    const start = index;
    while (index < jsonText.length && !/[\s,}\]]/.test(jsonText[index])) index += 1;
    if (start === index) fail();
  }

  function parseObject() {
    index += 1;
    const keys = new Set();
    skipWhitespace();
    if (jsonText[index] === '}') {
      index += 1;
      return;
    }
    while (index < jsonText.length) {
      skipWhitespace();
      const key = parseStringToken();
      if (keys.has(key)) fail();
      keys.add(key);
      skipWhitespace();
      if (jsonText[index] !== ':') fail();
      index += 1;
      parseValue();
      skipWhitespace();
      if (jsonText[index] === '}') {
        index += 1;
        return;
      }
      if (jsonText[index] !== ',') fail();
      index += 1;
    }
    fail();
  }

  skipWhitespace();
  parseValue();
  skipWhitespace();
  if (index !== jsonText.length) fail();
}

function clockMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value));
  if (!match) fail();
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) fail();
  return hour * 60 + minute;
}

function validatePolicyConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) fail();
  if (!DateTime.local().setZone(config.timezone).isValid) fail();
  if (!Number.isInteger(config.horizon_days) || config.horizon_days < 1) fail();
  if (!Number.isInteger(config.slot_minutes) || config.slot_minutes < 5 || 60 % config.slot_minutes !== 0) {
    fail();
  }
  if (
    !Number.isInteger(config.idea_snapshot_coverage_days)
    || config.idea_snapshot_coverage_days < 1
    || config.idea_snapshot_coverage_days > IDEA_SNAPSHOT_COVERAGE_DAYS
  ) {
    fail();
  }
  if (
    !Number.isInteger(config.idea_snapshot_max_age_days)
    || config.idea_snapshot_max_age_days < 1
    || config.idea_snapshot_max_age_days > IDEA_SNAPSHOT_MAX_AGE_DAYS
  ) {
    fail();
  }
  if (!sameKeys(config.display_hours, DISPLAY_HOURS_KEYS)) fail();
  const displayStart = clockMinutes(config.display_hours.start);
  const displayEnd = clockMinutes(config.display_hours.end);
  if (displayEnd <= displayStart || (displayEnd - displayStart) % config.slot_minutes !== 0) fail();
  return {
    displayStart,
    displayEnd,
    slotsPerDay: (displayEnd - displayStart) / config.slot_minutes,
  };
}

function canonicalDate(value, zone) {
  if (typeof value !== 'string' || !CANONICAL_DATE.test(value)) fail();
  const parsed = DateTime.fromISO(value, {zone});
  if (!parsed.isValid || parsed.toISODate() !== value) fail();
  return parsed.startOf('day');
}

function canonicalCapturedAt(value) {
  if (typeof value !== 'string' || !CANONICAL_UTC_SECONDS.test(value)) fail();
  const parsed = DateTime.fromISO(value, {setZone: true});
  if (
    !parsed.isValid
    || parsed.offset !== 0
    || parsed.toUTC().toISO({suppressMilliseconds: true}) !== value
  ) {
    fail();
  }
  return parsed.toUTC();
}

function canonicalBitset(value, expectedBytes, expectedBits) {
  if (
    typeof value !== 'string'
    || !value
    || !CANONICAL_BASE64.test(value)
  ) {
    fail();
  }
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== expectedBytes || decoded.toString('base64') !== value) fail();

  const usedBitsInLastByte = expectedBits % 8;
  if (usedBitsInLastByte !== 0) {
    const unusedLowBitMask = (1 << (8 - usedBitsInLastByte)) - 1;
    if ((decoded.at(-1) & unusedLowBitMask) !== 0) fail();
  }
  return decoded;
}

function normalizedWindow(config, now, windowStart, windowEnd) {
  if (!DateTime.isDateTime(now) || !now.isValid) fail();
  const localDay = now.setZone(config.timezone).startOf('day');
  const expectedStart = localDay.minus({days: localDay.weekday - 1});
  const expectedEnd = expectedStart.plus({days: config.horizon_days});
  const start = windowStart ?? expectedStart;
  const end = windowEnd ?? expectedEnd;
  if (
    !DateTime.isDateTime(start)
    || !DateTime.isDateTime(end)
    || !start.isValid
    || !end.isValid
    || start.toMillis() !== expectedStart.toMillis()
    || end.toMillis() !== expectedEnd.toMillis()
  ) {
    fail();
  }
  return {windowStart: expectedStart, windowEnd: expectedEnd};
}

export function ideaSnapshotFromEnvironment(environment = process.env) {
  const raw = environment?.[IDEA_SNAPSHOT_ENV_NAME];
  if (raw == null || (typeof raw === 'string' && !raw.trim())) return null;
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > IDEA_SNAPSHOT_MAX_BYTES) fail();
  return raw.trim();
}

export function parseIdeaBusySnapshot(
  snapshotText,
  config,
  {
    now = DateTime.utc(),
    windowStart,
    windowEnd,
  } = {},
) {
  try {
    if (
      typeof snapshotText !== 'string'
      || !snapshotText.trim()
      || Buffer.byteLength(snapshotText, 'utf8') > IDEA_SNAPSHOT_MAX_BYTES
    ) {
      fail('input');
    }
    const policy = atStage('policy', () => validatePolicyConfig(config));
    atStage('json-structure', () => assertNoDuplicateObjectKeys(snapshotText.trim()));
    const snapshot = atStage('json-structure', () => JSON.parse(snapshotText));
    if (!sameKeys(snapshot, SNAPSHOT_ROOT_KEYS)) fail('schema');
    if (!sameKeys(snapshot.display_hours, DISPLAY_HOURS_KEYS)) fail('schema');
    if (
      snapshot.schema_version !== 1
      || snapshot.encoding !== SNAPSHOT_ENCODING
      || snapshot.timezone !== config.timezone
      || snapshot.slot_minutes !== config.slot_minutes
      || snapshot.display_hours.start !== config.display_hours.start
      || snapshot.display_hours.end !== config.display_hours.end
    ) {
      fail('schema');
    }

    const coverageStart = atStage(
      'coverage',
      () => canonicalDate(snapshot.coverage_start, config.timezone),
    );
    const coverageEnd = atStage(
      'coverage',
      () => canonicalDate(snapshot.coverage_end, config.timezone),
    );
    if (
      coverageEnd.toMillis()
      !== coverageStart.plus({days: config.idea_snapshot_coverage_days}).toMillis()
    ) {
      fail('coverage');
    }

    const capturedAt = atStage('capture-time', () => canonicalCapturedAt(snapshot.captured_at));
    const nowUtc = now.toUTC();
    const capturedDay = capturedAt.setZone(config.timezone).startOf('day');
    const capturedWeekStart = capturedDay.minus({days: capturedDay.weekday - 1});
    if (
      capturedAt > nowUtc.plus({minutes: MAX_CLOCK_SKEW_MINUTES})
      || capturedAt < nowUtc.minus({days: config.idea_snapshot_max_age_days})
      || (
        coverageStart.toMillis() !== capturedDay.toMillis()
        && coverageStart.toMillis() !== capturedWeekStart.toMillis()
      )
    ) {
      fail('capture-time');
    }

    const publicWindow = atStage(
      'public-window',
      () => normalizedWindow(config, now, windowStart, windowEnd),
    );
    if (coverageStart > publicWindow.windowStart || coverageEnd < publicWindow.windowEnd) {
      fail('public-window');
    }

    const expectedBits = config.idea_snapshot_coverage_days * policy.slotsPerDay;
    const expectedBytes = Math.ceil(expectedBits / 8);
    const bitset = atStage(
      'bitset',
      () => canonicalBitset(snapshot.busy_bits, expectedBytes, expectedBits),
    );
    return atStage('interval-decoding', () => {
      const intervals = [];
      for (let dayIndex = 0; dayIndex < config.idea_snapshot_coverage_days; dayIndex += 1) {
        const day = coverageStart.plus({days: dayIndex});
        if (day < publicWindow.windowStart || day >= publicWindow.windowEnd) continue;

        let runStartSlot = null;
        for (let slotIndex = 0; slotIndex <= policy.slotsPerDay; slotIndex += 1) {
          let occupied = false;
          if (slotIndex < policy.slotsPerDay) {
            const bitIndex = dayIndex * policy.slotsPerDay + slotIndex;
            occupied = (bitset[Math.floor(bitIndex / 8)] & (1 << (7 - (bitIndex % 8)))) !== 0;
          }
          if (occupied && runStartSlot == null) runStartSlot = slotIndex;
          if (!occupied && runStartSlot != null) {
            intervals.push({
              start: day.plus({minutes: policy.displayStart + runStartSlot * config.slot_minutes}),
              end: day.plus({minutes: policy.displayStart + slotIndex * config.slot_minutes}),
            });
            runStartSlot = null;
          }
        }
      }
      return intervals;
    });
  } catch (error) {
    const generic = new Error(GENERIC_ERROR);
    Object.defineProperty(generic, 'validationStage', {
      value: error?.validationStage ?? 'internal',
      enumerable: false,
    });
    throw generic;
  }
}

function parseCliArgs(argv) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const args = {
    config: path.resolve(scriptDir, '..', 'data', 'availability.json'),
    validateStdin: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--validate-stdin') args.validateStdin = true;
    else if (argv[index] === '--config') args.config = path.resolve(argv[++index]);
    else fail();
  }
  if (!args.validateStdin) fail();
  return args;
}

async function readSnapshotStdin() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > IDEA_SNAPSHOT_MAX_BYTES) fail('input');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, bytes).toString('utf8');
}

async function main(argv = process.argv.slice(2)) {
  let cliStage = 'arguments';
  try {
    const args = parseCliArgs(argv);
    cliStage = 'input-read';
    const [snapshotText, configText] = await Promise.all([
      readSnapshotStdin(),
      readFile(args.config, 'utf8'),
    ]);
    cliStage = 'config-json';
    const config = JSON.parse(configText);
    cliStage = 'snapshot';
    parseIdeaBusySnapshot(snapshotText, config);
    cliStage = 'output';
    process.stdout.write(snapshotText.trim());
  } catch (error) {
    const candidate = error?.validationStage ?? cliStage;
    const stage = /^[a-z-]+$/.test(candidate) ? candidate : 'internal';
    process.stderr.write(`IDEA snapshot validation failed at ${stage}.\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
