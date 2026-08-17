import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {DateTime} from 'luxon';

import {
  IDEA_SNAPSHOT_MAX_BYTES,
  ideaSnapshotFromEnvironment,
  parseIdeaBusySnapshot,
} from './idea-snapshot.mjs';

const now = DateTime.fromISO('2026-07-14T01:00:00Z');
const config = {
  timezone: 'Asia/Shanghai',
  horizon_days: 56,
  slot_minutes: 30,
  idea_snapshot_coverage_days: 400,
  idea_snapshot_max_age_days: 90,
  display_hours: {start: '08:00', end: '22:00'},
};
const validatorPath = fileURLToPath(new URL('./idea-snapshot.mjs', import.meta.url));
const repositoryConfigPath = fileURLToPath(new URL('../data/availability.json', import.meta.url));

function minutes(value) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function makeSnapshot({
  policy = config,
  capturedAt = now.minus({hours: 1}),
  coverageStart = (() => {
    const capturedDay = capturedAt.setZone(policy.timezone).startOf('day');
    return capturedDay.minus({days: capturedDay.weekday - 1});
  })(),
  occupied = [],
  overrides = {},
} = {}) {
  const slotsPerDay = (
    minutes(policy.display_hours.end) - minutes(policy.display_hours.start)
  ) / policy.slot_minutes;
  const bitCount = policy.idea_snapshot_coverage_days * slotsPerDay;
  const bits = Buffer.alloc(Math.ceil(bitCount / 8));
  for (const bitIndex of occupied) {
    bits[Math.floor(bitIndex / 8)] |= 1 << (7 - (bitIndex % 8));
  }
  return JSON.stringify({
    schema_version: 1,
    encoding: 'day-major-msb0-base64',
    timezone: policy.timezone,
    slot_minutes: policy.slot_minutes,
    display_hours: {...policy.display_hours},
    coverage_start: coverageStart.toISODate(),
    coverage_end: coverageStart.plus({days: policy.idea_snapshot_coverage_days}).toISODate(),
    captured_at: capturedAt.toUTC().startOf('second').toISO({suppressMilliseconds: true}),
    busy_bits: bits.toString('base64'),
    ...overrides,
  });
}

test('fixed day-major MSB-first snapshot becomes anonymous merged intervals', () => {
  const snapshot = makeSnapshot({
    occupied: [
      0 * 28 + 2,
      1 * 28 + 2,
      1 * 28 + 3,
      3 * 28 + 27,
    ],
  });
  const intervals = parseIdeaBusySnapshot(snapshot, config, {now});
  assert.deepEqual(intervals.map(({start, end}) => [start.toISO(), end.toISO()]), [
    ['2026-07-13T09:00:00.000+08:00', '2026-07-13T09:30:00.000+08:00'],
    ['2026-07-14T09:00:00.000+08:00', '2026-07-14T10:00:00.000+08:00'],
    ['2026-07-16T21:30:00.000+08:00', '2026-07-16T22:00:00.000+08:00'],
  ]);
});

test('snapshot environment is optional only when truly absent and is bounded to 8 KiB', () => {
  assert.equal(ideaSnapshotFromEnvironment({}), null);
  assert.equal(ideaSnapshotFromEnvironment({IDEA_BUSY_SNAPSHOT: '   '}), null);
  assert.equal(
    ideaSnapshotFromEnvironment({IDEA_BUSY_SNAPSHOT: '  {"safe":true}\n'}),
    '{"safe":true}',
  );
  assert.throws(
    () => ideaSnapshotFromEnvironment({IDEA_BUSY_SNAPSHOT: 'x'.repeat(IDEA_SNAPSHOT_MAX_BYTES + 1)}),
    (error) => error.message === 'IDEA snapshot could not be validated safely',
  );
});

test('snapshot schema and nested display-hours keys are exact', () => {
  const rootExtra = JSON.parse(makeSnapshot());
  rootExtra.calendar_name = 'must-never-be-accepted';
  assert.throws(
    () => parseIdeaBusySnapshot(JSON.stringify(rootExtra), config, {now}),
    (error) => error.message === 'IDEA snapshot could not be validated safely'
      && !error.message.includes('calendar_name'),
  );

  const nestedExtra = JSON.parse(makeSnapshot());
  nestedExtra.display_hours.label = 'private';
  assert.throws(
    () => parseIdeaBusySnapshot(JSON.stringify(nestedExtra), config, {now}),
    (error) => error.message === 'IDEA snapshot could not be validated safely',
  );

  const duplicate = makeSnapshot().replace(
    '"schema_version":1',
    '"schema_version":1,"\\u0073chema_version":1',
  );
  assert.throws(
    () => parseIdeaBusySnapshot(duplicate, config, {now}),
    (error) => error.message === 'IDEA snapshot could not be validated safely',
  );
});

test('snapshot rejects non-canonical base64 and incorrect decoded length', () => {
  const missingPadding = JSON.parse(makeSnapshot());
  missingPadding.busy_bits = missingPadding.busy_bits.replace(/=+$/, '');
  assert.throws(
    () => parseIdeaBusySnapshot(JSON.stringify(missingPadding), config, {now}),
    /IDEA snapshot could not be validated safely/,
  );

  const short = JSON.parse(makeSnapshot());
  short.busy_bits = Buffer.alloc(2).toString('base64');
  assert.throws(
    () => parseIdeaBusySnapshot(JSON.stringify(short), config, {now}),
    /IDEA snapshot could not be validated safely/,
  );
});

test('unused low padding bits must be zero', () => {
  const oneBitConfig = {
    ...config,
    horizon_days: 1,
    idea_snapshot_coverage_days: 1,
    display_hours: {start: '08:00', end: '08:30'},
  };
  const valid = makeSnapshot({policy: oneBitConfig, occupied: [0]});
  assert.equal(parseIdeaBusySnapshot(valid, oneBitConfig, {now}).length, 1);

  const invalid = JSON.parse(valid);
  invalid.busy_bits = Buffer.from([0b10000001]).toString('base64');
  assert.throws(
    () => parseIdeaBusySnapshot(JSON.stringify(invalid), oneBitConfig, {now}),
    /IDEA snapshot could not be validated safely/,
  );
});

test('captured_at must be canonical UTC, near-current, and no older than 90 days', () => {
  const toleratedClockSkew = makeSnapshot({capturedAt: now.plus({minutes: 5})});
  assert.doesNotThrow(() => parseIdeaBusySnapshot(toleratedClockSkew, config, {now}));

  const future = makeSnapshot({capturedAt: now.plus({minutes: 5, seconds: 1})});
  assert.throws(
    () => parseIdeaBusySnapshot(future, config, {now}),
    /IDEA snapshot could not be validated safely/,
  );

  const expired = makeSnapshot({capturedAt: now.minus({days: 91})});
  assert.throws(
    () => parseIdeaBusySnapshot(expired, config, {now}),
    /IDEA snapshot could not be validated safely/,
  );

  const nonCanonical = JSON.parse(makeSnapshot());
  nonCanonical.captured_at = '2026-07-14T00:00:00.000Z';
  assert.throws(
    () => parseIdeaBusySnapshot(JSON.stringify(nonCanonical), config, {now}),
    /IDEA snapshot could not be validated safely/,
  );
});

test('coverage is exact, starts on Monday or a legacy capture day, and contains the public window', () => {
  const legacyCapturedAt = now.minus({days: 4, hours: 1});
  const legacy = makeSnapshot({
    capturedAt: legacyCapturedAt,
    coverageStart: legacyCapturedAt.setZone(config.timezone).startOf('day'),
  });
  assert.doesNotThrow(() => parseIdeaBusySnapshot(legacy, config, {now}));

  const wrongEnd = JSON.parse(makeSnapshot());
  wrongEnd.coverage_end = DateTime.fromISO(wrongEnd.coverage_end).minus({days: 1}).toISODate();
  assert.throws(
    () => parseIdeaBusySnapshot(JSON.stringify(wrongEnd), config, {now}),
    /IDEA snapshot could not be validated safely/,
  );

  const oldButFresh = now.minus({days: 89});
  const tooShortConfig = {
    ...config,
    idea_snapshot_coverage_days: 100,
  };
  const insufficient = makeSnapshot({policy: tooShortConfig, capturedAt: oldButFresh});
  assert.throws(
    () => parseIdeaBusySnapshot(insufficient, tooShortConfig, {now}),
    /IDEA snapshot could not be validated safely/,
  );

  const wrongStart = JSON.parse(makeSnapshot());
  wrongStart.coverage_start = DateTime.fromISO(wrongStart.coverage_start).plus({days: 2}).toISODate();
  wrongStart.coverage_end = DateTime.fromISO(wrongStart.coverage_end).plus({days: 2}).toISODate();
  assert.throws(
    () => parseIdeaBusySnapshot(JSON.stringify(wrongStart), config, {now}),
    /IDEA snapshot could not be validated safely/,
  );
});

test('snapshot errors never echo secret data or interval material', () => {
  const privateMarker = 'private-snapshot-marker-never-log';
  const invalid = JSON.parse(makeSnapshot());
  invalid.busy_bits = privateMarker;
  assert.throws(
    () => parseIdeaBusySnapshot(JSON.stringify(invalid), config, {now}),
    (error) => error.message === 'IDEA snapshot could not be validated safely'
      && !error.message.includes(privateMarker)
      && !error.message.includes(invalid.coverage_start),
  );
});

test('parser rejects inputs larger than 8 KiB before exposing their contents', () => {
  const marker = 'oversized-private-marker';
  const oversized = `${makeSnapshot()}${marker.repeat(500)}`;
  assert.ok(Buffer.byteLength(oversized) > IDEA_SNAPSHOT_MAX_BYTES);
  assert.throws(
    () => parseIdeaBusySnapshot(oversized, config, {now}),
    (error) => error.message === 'IDEA snapshot could not be validated safely'
      && !error.message.includes(marker),
  );
});

test('stdin validator streams a valid snapshot and fails closed without echoing invalid input', () => {
  const snapshot = makeSnapshot();
  const valid = spawnSync(
    process.execPath,
    [validatorPath, '--validate-stdin', '--config', repositoryConfigPath],
    {input: snapshot, encoding: 'utf8'},
  );
  assert.equal(valid.status, 0);
  assert.equal(valid.stdout, snapshot);
  assert.equal(valid.stderr, '');

  const privateMarker = 'stdin-private-marker-never-echo';
  const invalid = spawnSync(
    process.execPath,
    [validatorPath, '--validate-stdin', '--config', repositoryConfigPath],
    {input: privateMarker.repeat(IDEA_SNAPSHOT_MAX_BYTES), encoding: 'utf8'},
  );
  assert.notEqual(invalid.status, 0);
  assert.equal(invalid.stdout, '');
  assert.doesNotMatch(invalid.stderr, new RegExp(privateMarker));
});
