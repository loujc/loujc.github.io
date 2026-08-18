((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AvailabilityScheduling = api;
})(typeof globalThis === 'object' ? globalThis : window, () => {
  const dateFromKey = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  };

  const keyFromDate = (date) => [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');

  const addDays = (key, days) => {
    const date = dateFromKey(key);
    date.setUTCDate(date.getUTCDate() + days);
    return keyFromDate(date);
  };

  const clockMinutes = (clock) => {
    const [hour, minute] = clock.split(':').map(Number);
    return hour * 60 + minute;
  };

  const instantParts = (value, timezone) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(value));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      date: `${values.year}-${values.month}-${values.day}`,
      minutes: Number(values.hour) * 60 + Number(values.minute),
    };
  };

  const wallClockStamp = (dateKey, minutes) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
  };

  const zonedWallTimeToInstant = (dateKey, minutes, timezone) => {
    const target = wallClockStamp(dateKey, minutes);
    let instant = target;
    for (let iteration = 0; iteration < 4; iteration += 1) {
      const observed = instantParts(instant, timezone);
      const difference = target - wallClockStamp(observed.date, observed.minutes);
      instant += difference;
      if (difference === 0) break;
    }
    const finalParts = instantParts(instant, timezone);
    return finalParts.date === dateKey && finalParts.minutes === minutes ? instant : Number.NaN;
  };

  const candidateSlots = (payload, durationMinutes, minNoticeHours, now = Date.now()) => {
    const slots = [];
    const startMinutes = clockMinutes(payload.display_hours.start);
    const endMinutes = clockMinutes(payload.display_hours.end);
    const noticeCutoff = now + minNoticeHours * 3_600_000;
    const durationMilliseconds = durationMinutes * 60_000;
    for (let day = payload.window_start; day < payload.window_end; day = addDays(day, 1)) {
      for (
        let minute = startMinutes;
        minute + durationMinutes <= endMinutes;
        minute += payload.slot_minutes
      ) {
        const start = zonedWallTimeToInstant(day, minute, payload.timezone);
        if (!Number.isFinite(start) || start < noticeCutoff) continue;
        const end = start + durationMilliseconds;
        const occupied = payload.busy.some((interval) => (
          start < Date.parse(interval.end) && end > Date.parse(interval.start)
        ));
        if (!occupied) slots.push({date: day, start, end});
      }
    }
    return slots;
  };

  const buildMeetingMailto = ({recipient, subject, body}) => (
    `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  );

  return Object.freeze({
    buildMeetingMailto,
    candidateSlots,
    zonedWallTimeToInstant,
  });
});
