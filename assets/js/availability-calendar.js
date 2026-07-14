(() => {
  const ROOT_KEYS = [
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
  const BUSY_KEYS = ['end', 'start'];
  const HOURS_KEYS = ['end', 'start'];
  const HOUR_HEIGHT = 40;
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

  const sortedKeysEqual = (value, expected) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
  };

  const validPayload = (payload) => {
    if (!sortedKeysEqual(payload, ROOT_KEYS)) return false;
    if (payload.schema_version !== 1) return false;
    if (!['ready', 'unconfigured'].includes(payload.status)) return false;
    if (!ISO_UTC.test(payload.generated_at) || !Number.isFinite(Date.parse(payload.generated_at))) return false;
    if (typeof payload.timezone !== 'string') return false;
    try {
      new Intl.DateTimeFormat('en', {timeZone: payload.timezone}).format();
    } catch {
      return false;
    }
    if (!ISO_DATE.test(payload.window_start) || !ISO_DATE.test(payload.window_end)) return false;
    if (payload.window_end <= payload.window_start) return false;
    if (instantParts(payload.generated_at, payload.timezone).date !== payload.window_start) return false;
    if (!Number.isInteger(payload.slot_minutes) || payload.slot_minutes < 5 || 60 % payload.slot_minutes !== 0) return false;
    if (!sortedKeysEqual(payload.display_hours, HOURS_KEYS)) return false;
    if (!CLOCK.test(payload.display_hours.start) || !CLOCK.test(payload.display_hours.end)) return false;
    if (payload.display_hours.end <= payload.display_hours.start) return false;
    if (!Array.isArray(payload.busy)) return false;
    if (payload.status === 'unconfigured' && payload.busy.length) return false;
    let previousEnd = 0;
    const publicStartMinutes = clockMinutes(payload.display_hours.start);
    const publicEndMinutes = clockMinutes(payload.display_hours.end);
    return payload.busy.every((interval) => {
      if (!sortedKeysEqual(interval, BUSY_KEYS)) return false;
      if (!ISO_UTC.test(interval.start) || !ISO_UTC.test(interval.end)) return false;
      const start = Date.parse(interval.start);
      const end = Date.parse(interval.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || start <= previousEnd) return false;
      const localStart = instantParts(interval.start, payload.timezone);
      const localEnd = instantParts(interval.end, payload.timezone);
      if (localStart.date < payload.window_start
          || localEnd.date >= payload.window_end
          || localStart.date !== localEnd.date
          || localStart.minutes < publicStartMinutes
          || localEnd.minutes > publicEndMinutes) return false;
      previousEnd = end;
      return true;
    });
  };

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

  const mondayOf = (key) => {
    const date = dateFromKey(key);
    const weekday = date.getUTCDay() || 7;
    return addDays(key, 1 - weekday);
  };

  const clampWeek = (key, min, max) => (key < min ? min : key > max ? max : key);

  const todayKey = (timezone) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
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

  const makeButtonIconLabel = (button, label) => {
    if (button.textContent.trim() === '←' || button.textContent.trim() === '→') button.title = label;
  };

  document.querySelectorAll('.availability-calendar').forEach(async (root) => {
    const strings = JSON.parse(root.querySelector('.availability-strings').textContent);
    const state = root.querySelector('.availability-state');
    const stateText = state.querySelector('span:last-child');
    const toolbar = root.querySelector('.availability-toolbar');
    const desktop = root.querySelector('.availability-desktop');
    const mobile = root.querySelector('.availability-mobile');
    const footer = root.querySelector('.availability-footer');
    const updated = root.querySelector('.availability-updated');
    const weekLabel = root.querySelector('.availability-week-label');
    const previous = root.querySelector('[data-action="previous"]');
    const next = root.querySelector('[data-action="next"]');
    const today = root.querySelector('[data-action="today"]');
    const locale = root.dataset.locale || 'en-US';
    const fallbackTimezone = root.dataset.timezone || 'Asia/Shanghai';
    const staleHours = Number(root.dataset.staleHours || 3);

    makeButtonIconLabel(previous, strings.previous_week);
    makeButtonIconLabel(next, strings.next_week);

    const failClosed = (message, kind = 'error') => {
      state.hidden = false;
      state.dataset.kind = kind;
      stateText.textContent = message;
      toolbar.hidden = true;
      desktop.hidden = true;
      mobile.hidden = true;
      footer.hidden = true;
    };

    try {
      const response = await fetch(root.dataset.availabilityUrl, {cache: 'no-store', credentials: 'same-origin'});
      if (!response.ok) throw new Error('unavailable');
      const payload = await response.json();
      if (!validPayload(payload) || payload.status !== 'ready') throw new Error('unavailable');

      const generatedAt = new Date(payload.generated_at);
      const age = Date.now() - generatedAt.getTime();
      if (!Number.isFinite(age) || age < -600_000 || age > staleHours * 3_600_000) {
        failClosed(strings.stale, 'stale');
        return;
      }

      const timezone = payload.timezone || fallbackTimezone;
      const startMinutes = clockMinutes(payload.display_hours.start);
      const endMinutes = clockMinutes(payload.display_hours.end);
      const totalMinutes = endMinutes - startMinutes;
      if (totalMinutes <= 0) throw new Error('unavailable');

      const minWeek = mondayOf(payload.window_start);
      const maxWeek = mondayOf(addDays(payload.window_end, -1));
      const currentWeek = mondayOf(todayKey(timezone));
      let activeWeek = clampWeek(currentWeek, minWeek, maxWeek);

      const dateLabel = new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      const compactDateLabel = new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      const updateLabel = new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: timezone,
      });
      const timeLabel = new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: timezone,
      });

      const busyByDay = new Map();
      payload.busy.forEach((interval) => {
        const day = instantParts(interval.start, timezone).date;
        if (!busyByDay.has(day)) busyByDay.set(day, []);
        busyByDay.get(day).push(interval);
      });

      const makeBusyLabel = (interval) => (
        `${strings.busy}, ${timeLabel.format(new Date(interval.start))}–${timeLabel.format(new Date(interval.end))}`
      );

      const renderDesktop = (days) => {
        desktop.replaceChildren();
        desktop.style.setProperty('--availability-grid-height', `${Math.round((totalMinutes / 60) * HOUR_HEIGHT)}px`);
        desktop.style.setProperty('--availability-hour-height', `${HOUR_HEIGHT}px`);

        const grid = document.createElement('div');
        grid.className = 'availability-week-grid';
        const corner = document.createElement('div');
        corner.className = 'availability-grid-corner';
        grid.append(corner);

        days.forEach((day) => {
          const header = document.createElement('div');
          header.className = 'availability-day-header';
          if (day < payload.window_start || day >= payload.window_end) header.classList.add('is-outside-window');
          if (day === todayKey(timezone)) header.classList.add('is-today');
          header.textContent = dateLabel.format(dateFromKey(day));
          grid.append(header);
        });

        const axis = document.createElement('div');
        axis.className = 'availability-time-axis';
        for (let minute = startMinutes; minute <= endMinutes; minute += 60) {
          const label = document.createElement('span');
          label.style.top = `${((minute - startMinutes) / 60) * HOUR_HEIGHT}px`;
          label.textContent = `${String(Math.floor(minute / 60)).padStart(2, '0')}:00`;
          axis.append(label);
        }
        grid.append(axis);

        days.forEach((day) => {
          const column = document.createElement('div');
          column.className = 'availability-day-column';
          const isPublished = day >= payload.window_start && day < payload.window_end;
          if (!isPublished) {
            column.classList.add('is-outside-window');
            column.setAttribute('aria-label', strings.outside_window);
          }
          if (day === todayKey(timezone)) column.classList.add('is-today');
          (isPublished ? busyByDay.get(day) || [] : []).forEach((interval) => {
            const start = Math.max(startMinutes, instantParts(interval.start, timezone).minutes);
            const end = Math.min(endMinutes, instantParts(interval.end, timezone).minutes);
            if (end <= start) return;
            const block = document.createElement('div');
            block.className = 'availability-busy-block';
            block.style.top = `${((start - startMinutes) / 60) * HOUR_HEIGHT}px`;
            block.style.height = `${Math.max(3, ((end - start) / 60) * HOUR_HEIGHT)}px`;
            block.setAttribute('aria-label', makeBusyLabel(interval));
            block.title = makeBusyLabel(interval);
            if (end - start >= 45) block.textContent = strings.busy;
            column.append(block);
          });
          grid.append(column);
        });
        desktop.append(grid);
      };

      const renderMobile = (days) => {
        mobile.replaceChildren();
        days.forEach((day) => {
          const card = document.createElement('section');
          card.className = 'availability-day-card';
          if (day === todayKey(timezone)) card.classList.add('is-today');
          const heading = document.createElement('h3');
          heading.textContent = dateLabel.format(dateFromKey(day));
          card.append(heading);
          const isPublished = day >= payload.window_start && day < payload.window_end;
          const intervals = busyByDay.get(day) || [];
          if (!isPublished || !intervals.length) {
            const empty = document.createElement('p');
            empty.className = 'availability-day-empty';
            empty.textContent = isPublished ? strings.no_busy : strings.outside_window;
            card.append(empty);
          } else {
            const list = document.createElement('ul');
            intervals.forEach((interval) => {
              const item = document.createElement('li');
              const swatch = document.createElement('span');
              swatch.setAttribute('aria-hidden', 'true');
              const label = document.createElement('strong');
              label.textContent = strings.busy;
              const time = document.createElement('time');
              time.textContent = `${timeLabel.format(new Date(interval.start))}–${timeLabel.format(new Date(interval.end))}`;
              item.append(swatch, label, time);
              list.append(item);
            });
            card.append(list);
          }
          mobile.append(card);
        });
      };

      const render = () => {
        const days = Array.from({length: 7}, (_, index) => addDays(activeWeek, index));
        const visibleEnd = days.at(-1);
        weekLabel.textContent = strings.week_of.replace('{date}', compactDateLabel.format(dateFromKey(activeWeek)));
        weekLabel.title = `${compactDateLabel.format(dateFromKey(activeWeek))} – ${compactDateLabel.format(dateFromKey(visibleEnd))}`;
        previous.disabled = activeWeek <= minWeek;
        next.disabled = activeWeek >= maxWeek;
        renderDesktop(days);
        renderMobile(days);
      };

      previous.addEventListener('click', () => {
        activeWeek = clampWeek(addDays(activeWeek, -7), minWeek, maxWeek);
        render();
      });
      next.addEventListener('click', () => {
        activeWeek = clampWeek(addDays(activeWeek, 7), minWeek, maxWeek);
        render();
      });
      today.addEventListener('click', () => {
        activeWeek = clampWeek(mondayOf(todayKey(timezone)), minWeek, maxWeek);
        render();
      });

      state.hidden = true;
      toolbar.hidden = false;
      desktop.hidden = false;
      mobile.hidden = false;
      footer.hidden = false;
      updated.textContent = strings.updated.replace('{time}', updateLabel.format(generatedAt));
      render();
    } catch {
      failClosed(strings.unavailable);
    }
  });
})();
