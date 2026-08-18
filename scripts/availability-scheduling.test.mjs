import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  buildMeetingMailto,
  candidateSlots,
  zonedWallTimeToInstant,
} = require('../assets/js/availability-scheduling.js');

const payload = {
  timezone: 'Asia/Shanghai',
  window_start: '2026-08-20',
  window_end: '2026-08-21',
  slot_minutes: 30,
  display_hours: {start: '08:00', end: '10:00'},
  busy: [{start: '2026-08-20T00:30:00Z', end: '2026-08-20T01:00:00Z'}],
};

test('wall time conversion preserves the configured calendar timezone', () => {
  assert.equal(
    zonedWallTimeToInstant('2026-08-20', 8 * 60, 'Asia/Shanghai'),
    Date.parse('2026-08-20T00:00:00Z'),
  );
});

test('candidate slots stay inside display hours and never overlap occupied time', () => {
  const slots = candidateSlots(payload, 30, 24, Date.parse('2026-08-18T00:00:00Z'));
  assert.deepEqual(
    slots.map(({start, end}) => [new Date(start).toISOString(), new Date(end).toISOString()]),
    [
      ['2026-08-20T00:00:00.000Z', '2026-08-20T00:30:00.000Z'],
      ['2026-08-20T01:00:00.000Z', '2026-08-20T01:30:00.000Z'],
      ['2026-08-20T01:30:00.000Z', '2026-08-20T02:00:00.000Z'],
    ],
  );
});

test('longer meetings reject partial conflicts and minimum notice is enforced', () => {
  const early = candidateSlots(payload, 60, 24, Date.parse('2026-08-18T00:00:00Z'));
  assert.deepEqual(early.map(({start}) => new Date(start).toISOString()), [
    '2026-08-20T01:00:00.000Z',
  ]);

  const late = candidateSlots(payload, 30, 24, Date.parse('2026-08-19T01:00:01Z'));
  assert.deepEqual(late.map(({start}) => new Date(start).toISOString()), [
    '2026-08-20T01:30:00.000Z',
  ]);
});

test('meeting mailto percent-encodes visitor content in the draft query', () => {
  const mailto = buildMeetingMailto({
    recipient: 'owner@example.com',
    subject: 'Meeting request from A & B',
    body: 'Line one\nPurpose: chips + agents?',
  });
  assert.equal(mailto.startsWith('mailto:owner@example.com?subject='), true);
  assert.equal(mailto.includes('A & B'), false);
  assert.equal(mailto.includes('\n'), false);
  assert.match(mailto, /body=Line%20one%0APurpose%3A%20chips%20%2B%20agents%3F$/);
});
