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
  const END_CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$|24:00$/;
  const scheduling = globalThis.AvailabilityScheduling || {};
  const {buildMeetingMailto, candidateSlots} = scheduling;

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
    if (mondayOf(instantParts(payload.generated_at, payload.timezone).date) !== payload.window_start) return false;
    if (!Number.isInteger(payload.slot_minutes) || payload.slot_minutes < 5 || 60 % payload.slot_minutes !== 0) return false;
    if (!sortedKeysEqual(payload.display_hours, HOURS_KEYS)) return false;
    if (!CLOCK.test(payload.display_hours.start) || !END_CLOCK.test(payload.display_hours.end)) return false;
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
      const endsAtDayBoundary = localEnd.date === addDays(localStart.date, 1) && localEnd.minutes === 0;
      const localEndMinutes = endsAtDayBoundary ? 1440 : localEnd.minutes;
      if (localStart.date < payload.window_start
          || localEnd.date > payload.window_end
          || (localStart.date !== localEnd.date && !endsAtDayBoundary)
          || localStart.minutes < publicStartMinutes
          || localEndMinutes > publicEndMinutes) return false;
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
    const meeting = root.querySelector('.meeting-request');
    const meetingForm = meeting?.querySelector('.meeting-request-form');
    const meetingStatus = meeting?.querySelector('.meeting-request-status');
    const meetingReview = meeting?.querySelector('.meeting-review');
    const meetingFallback = meeting?.querySelector('.meeting-email-fallback');
    const locale = root.dataset.locale || 'en-US';
    const fallbackTimezone = root.dataset.timezone || 'Asia/Shanghai';
    const staleHours = Number(root.dataset.staleHours || 6);

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
      if (meeting) {
        meeting.dataset.state = 'unavailable';
        if (meetingForm) meetingForm.hidden = true;
        if (meetingReview) meetingReview.hidden = true;
        if (meetingStatus) {
          meetingStatus.hidden = false;
          meetingStatus.textContent = strings.meeting_unavailable;
        }
        if (meetingFallback) meetingFallback.hidden = false;
      }
    };

    try {
      const response = await fetch(root.dataset.availabilityUrl, {cache: 'no-store', credentials: 'same-origin'});
      if (!response.ok) throw new Error('unavailable');
      const payload = await response.json();
      if (!validPayload(payload) || payload.status !== 'ready') throw new Error('unavailable');

      const generatedAt = new Date(payload.generated_at);
      const timezone = payload.timezone || fallbackTimezone;
      const isFresh = () => {
        const age = Date.now() - generatedAt.getTime();
        return Number.isFinite(age) && age >= -600_000 && age <= staleHours * 3_600_000;
      };
      const isTodayPublished = () => {
        const currentDay = todayKey(timezone);
        return currentDay >= payload.window_start && currentDay < payload.window_end;
      };
      if (!isFresh() || !isTodayPublished()) {
        failClosed(strings.stale, 'stale');
        return;
      }

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

      const initializeMeetingRequest = () => {
        if (!meeting || !meetingForm || !meetingStatus || !meetingReview) return;
        const recipient = meeting.dataset.meetingRecipient || '';
        const minNoticeHours = Number(meeting.dataset.minNoticeHours || 24);
        const dateSelect = meetingForm.elements.namedItem('meeting-date');
        const timeSelect = meetingForm.elements.namedItem('meeting-time');
        const nameInput = meetingForm.elements.namedItem('meeting-name');
        const emailInput = meetingForm.elements.namedItem('meeting-email');
        const purposeInput = meetingForm.elements.namedItem('meeting-purpose');
        const reviewButton = meetingForm.querySelector('.meeting-review-button');
        const reviewCandidate = meetingReview.querySelector('.meeting-review-candidate');
        const reviewLocal = meetingReview.querySelector('.meeting-review-local');
        const reviewSnapshot = meetingReview.querySelector('.meeting-review-snapshot');
        const reviewPurpose = meetingReview.querySelector('.meeting-review-purpose');
        const openEmail = meetingReview.querySelector('.meeting-open-email');
        const copyRequest = meetingReview.querySelector('.meeting-copy-request');
        const feedback = meetingReview.querySelector('.meeting-request-feedback');
        if (
          typeof candidateSlots !== 'function' || typeof buildMeetingMailto !== 'function'
          || !recipient || !Number.isFinite(minNoticeHours) || minNoticeHours < 0
          || !dateSelect || !timeSelect || !nameInput || !emailInput || !purposeInput
          || !reviewButton || !reviewCandidate || !reviewLocal || !reviewSnapshot
          || !reviewPurpose || !openEmail || !copyRequest || !feedback
        ) {
          meetingStatus.textContent = strings.meeting_unavailable;
          return;
        }

        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
        const meetingDateLabel = new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
        const ownerSlotLabel = new Intl.DateTimeFormat(locale, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
          timeZone: timezone,
          timeZoneName: 'short',
        });
        const localSlotLabel = new Intl.DateTimeFormat(locale, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
          timeZone: browserTimezone,
          timeZoneName: 'short',
        });
        const shortOwnerTime = new Intl.DateTimeFormat(locale, {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
          timeZone: timezone,
        });
        const shortLocalTime = new Intl.DateTimeFormat(locale, {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
          timeZone: browserTimezone,
        });
        let meetingPayload = payload;
        let slots = [];
        let copyText = '';

        const selectedDuration = () => Number(
          meetingForm.querySelector('input[name="meeting-duration"]:checked')?.value || 30,
        );

        const hideReview = () => {
          meetingReview.hidden = true;
          feedback.textContent = '';
          copyText = '';
        };

        const populateTimes = () => {
          const selectedDate = dateSelect.value;
          const previousValue = timeSelect.value;
          timeSelect.replaceChildren();
          const daySlots = slots.filter((slot) => slot.date === selectedDate);
          daySlots.forEach((slot) => {
            const option = document.createElement('option');
            option.value = String(slot.start);
            const ownerTime = shortOwnerTime.format(new Date(slot.start));
            const localTime = shortLocalTime.format(new Date(slot.start));
            option.textContent = browserTimezone === timezone
              ? ownerTime
              : `${ownerTime} · ${localTime} ${strings.meeting_local_time}`;
            timeSelect.append(option);
          });
          if (daySlots.some((slot) => String(slot.start) === previousValue)) {
            timeSelect.value = previousValue;
          }
          timeSelect.disabled = daySlots.length === 0;
          reviewButton.disabled = daySlots.length === 0;
        };

        const populateSlots = () => {
          const previousDate = dateSelect.value;
          slots = candidateSlots(
            meetingPayload,
            selectedDuration(),
            minNoticeHours,
          );
          const dates = [...new Set(slots.map((slot) => slot.date))];
          dateSelect.replaceChildren();
          dates.forEach((date) => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = meetingDateLabel.format(dateFromKey(date));
            dateSelect.append(option);
          });
          if (dates.includes(previousDate)) dateSelect.value = previousDate;
          dateSelect.disabled = dates.length === 0;
          meetingStatus.hidden = dates.length > 0;
          meetingStatus.textContent = dates.length > 0 ? '' : strings.meeting_no_slots;
          populateTimes();
          hideReview();
        };

        meetingForm.querySelectorAll('input[name="meeting-duration"]').forEach((input) => {
          input.addEventListener('change', populateSlots);
        });
        dateSelect.addEventListener('change', () => {
          populateTimes();
          hideReview();
        });
        meetingForm.addEventListener('input', (event) => {
          if (!event.target.matches('input[name="meeting-duration"]')) hideReview();
        });

        meetingForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          nameInput.value = nameInput.value.trim();
          emailInput.value = emailInput.value.trim();
          purposeInput.value = purposeInput.value.trim();
          if (!meetingForm.checkValidity()) {
            meetingForm.reportValidity();
            return;
          }

          const selectedStart = Number(timeSelect.value);
          const duration = selectedDuration();
          if (!Number.isFinite(selectedStart)) return;
          reviewButton.disabled = true;
          meetingStatus.hidden = false;
          meetingStatus.textContent = strings.meeting_loading;
          hideReview();

          try {
            const separator = root.dataset.availabilityUrl.includes('?') ? '&' : '?';
            const response = await fetch(
              `${root.dataset.availabilityUrl}${separator}meeting-check=${Date.now()}`,
              {cache: 'no-store', credentials: 'same-origin'},
            );
            if (!response.ok) throw new Error('unavailable');
            const freshPayload = await response.json();
            const freshGeneratedAt = Date.parse(freshPayload.generated_at);
            const freshAge = Date.now() - freshGeneratedAt;
            if (
              !validPayload(freshPayload)
              || freshPayload.status !== 'ready'
              || !Number.isFinite(freshAge)
              || freshAge < -600_000
              || freshAge > staleHours * 3_600_000
              || todayKey(freshPayload.timezone) < freshPayload.window_start
              || todayKey(freshPayload.timezone) >= freshPayload.window_end
            ) {
              throw new Error('unavailable');
            }

            const freshSlots = candidateSlots(
              freshPayload,
              duration,
              minNoticeHours,
            );
            const candidate = freshSlots.find((slot) => slot.start === selectedStart);
            meetingPayload = freshPayload;
            if (!candidate) {
              populateSlots();
              meetingStatus.hidden = false;
              meetingStatus.textContent = strings.meeting_changed;
              return;
            }

            const ownerCandidate = `${ownerSlotLabel.format(new Date(candidate.start))}–${shortOwnerTime.format(new Date(candidate.end))}`;
            const localCandidate = `${localSlotLabel.format(new Date(candidate.start))}–${shortLocalTime.format(new Date(candidate.end))}`;
            const snapshotLabel = updateLabel.format(new Date(freshPayload.generated_at));
            const durationLabel = duration === 60
              ? strings.meeting_duration_60
              : strings.meeting_duration_30;
            const subject = strings.meeting_email_subject.replace('{name}', nameInput.value);
            const body = [
              strings.meeting_title,
              '',
              `${strings.meeting_candidate}: ${ownerCandidate}`,
              `${strings.meeting_local_time}: ${localCandidate} (${browserTimezone})`,
              `${strings.meeting_duration}: ${durationLabel}`,
              `${strings.meeting_name}: ${nameInput.value}`,
              `${strings.meeting_email}: ${emailInput.value}`,
              `${strings.meeting_purpose}: ${purposeInput.value}`,
              `${strings.meeting_snapshot}: ${snapshotLabel}`,
              '',
              strings.meeting_notice,
            ].join('\n');

            reviewCandidate.textContent = ownerCandidate;
            reviewLocal.textContent = `${localCandidate} (${browserTimezone})`;
            reviewSnapshot.textContent = snapshotLabel;
            reviewPurpose.textContent = purposeInput.value;
            openEmail.href = buildMeetingMailto({recipient, subject, body});
            copyText = `To: ${recipient}\nSubject: ${subject}\n\n${body}`;
            meetingStatus.hidden = true;
            meetingReview.hidden = false;
          } catch {
            meetingStatus.hidden = false;
            meetingStatus.textContent = strings.meeting_unavailable;
          } finally {
            reviewButton.disabled = false;
          }
        });

        copyRequest.addEventListener('click', async () => {
          if (!copyText) return;
          let copied = false;
          try {
            await navigator.clipboard.writeText(copyText);
            copied = true;
          } catch {
            const textarea = document.createElement('textarea');
            textarea.value = copyText;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.append(textarea);
            textarea.select();
            copied = document.execCommand('copy');
            textarea.remove();
          }
          feedback.textContent = copied ? strings.meeting_copied : strings.meeting_unavailable;
        });

        meeting.dataset.state = 'ready';
        meetingForm.hidden = false;
        if (meetingFallback) meetingFallback.hidden = false;
        populateSlots();
      };

      const formatBusyTime = (value, day, allowDayBoundary = false) => {
        const parts = instantParts(value, timezone);
        if (allowDayBoundary && parts.date === addDays(day, 1) && parts.minutes === 0) return '24:00';
        return timeLabel.format(new Date(value));
      };

      const makeBusyLabel = (interval) => {
        const day = instantParts(interval.start, timezone).date;
        return `${strings.busy}, ${formatBusyTime(interval.start, day)}–${formatBusyTime(interval.end, day, true)}`;
      };

      const updateNowMarkers = () => {
        const now = new Date();
        const current = instantParts(now, timezone);
        const currentLabel = timeLabel.format(now);
        root.querySelectorAll('.availability-now-line').forEach((marker) => {
          const inRange = current.date === marker.dataset.day
            && current.minutes >= startMinutes
            && current.minutes < endMinutes;
          marker.hidden = !inRange;
          if (!inRange) return;
          marker.style.top = `${((current.minutes - startMinutes) / 60) * HOUR_HEIGHT}px`;
          marker.setAttribute('aria-label', strings.now.replace('{time}', currentLabel));
          const label = marker.querySelector('time');
          label.dateTime = now.toISOString();
          label.textContent = currentLabel;
        });
        root.querySelectorAll('.availability-now-mobile').forEach((marker) => {
          const inRange = current.date === marker.dataset.day
            && current.minutes >= startMinutes
            && current.minutes < endMinutes;
          marker.hidden = !inRange;
          if (!inRange) return;
          const label = marker.querySelector('time');
          label.dateTime = now.toISOString();
          label.textContent = strings.now.replace('{time}', currentLabel);
        });
      };

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
          (isPublished ? busyByDay.get(day) || [] : []).forEach((interval, index) => {
            const start = Math.max(startMinutes, instantParts(interval.start, timezone).minutes);
            const endParts = instantParts(interval.end, timezone);
            const endAtDayBoundary = endParts.date === addDays(day, 1) && endParts.minutes === 0;
            const end = Math.min(endMinutes, endAtDayBoundary ? 1440 : endParts.minutes);
            if (end <= start) return;
            const block = document.createElement('div');
            block.className = 'availability-busy-block';
            block.style.top = `${((start - startMinutes) / 60) * HOUR_HEIGHT}px`;
            block.style.height = `${Math.max(3, ((end - start) / 60) * HOUR_HEIGHT)}px`;
            block.setAttribute('role', 'img');
            block.setAttribute('aria-label', makeBusyLabel(interval));
            block.title = makeBusyLabel(interval);
            block.style.setProperty('--availability-block-index', index);
            if (end - start >= 45) block.textContent = strings.busy;
            column.append(block);
          });
          if (day === todayKey(timezone)) {
            const marker = document.createElement('div');
            marker.className = 'availability-now-line';
            marker.dataset.day = day;
            marker.setAttribute('role', 'img');
            const label = document.createElement('time');
            marker.append(label);
            column.append(marker);
          }
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
          if (day === todayKey(timezone)) {
            const now = document.createElement('div');
            now.className = 'availability-now-mobile';
            now.dataset.day = day;
            const dot = document.createElement('span');
            dot.setAttribute('aria-hidden', 'true');
            const time = document.createElement('time');
            now.append(dot, time);
            card.append(now);
          }
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
              time.textContent = `${formatBusyTime(interval.start, day)}–${formatBusyTime(interval.end, day, true)}`;
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
        updateNowMarkers();
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

      initializeMeetingRequest();
      state.hidden = true;
      toolbar.hidden = false;
      desktop.hidden = false;
      mobile.hidden = false;
      footer.hidden = false;
      updated.textContent = strings.updated.replace('{time}', updateLabel.format(generatedAt));
      render();
      let renderedToday = todayKey(timezone);
      const refreshTimer = window.setInterval(() => {
        if (!isFresh() || !isTodayPublished()) {
          window.clearInterval(refreshTimer);
          failClosed(strings.stale, 'stale');
          return;
        }
        const nextToday = todayKey(timezone);
        if (nextToday !== renderedToday) {
          renderedToday = nextToday;
          activeWeek = clampWeek(mondayOf(nextToday), minWeek, maxWeek);
          render();
          return;
        }
        updateNowMarkers();
      }, 30_000);
    } catch {
      failClosed(strings.unavailable);
    }
  });
})();
