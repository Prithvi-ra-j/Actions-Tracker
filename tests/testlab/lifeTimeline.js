function parseStart(startAt) {
  const timestamp = Date.parse(startAt);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Timeline startAt must be a valid date-time string.');
  }
  return timestamp;
}

export function createLifeTimeline({ startAt, events = [], onEvent = async () => {} }) {
  if (!Array.isArray(events)) throw new Error('Timeline events must be an array.');
  if (typeof onEvent !== 'function') throw new Error('Timeline onEvent must be a function.');

  const startTimestamp = parseStart(startAt);
  const schedule = events
    .map((entry, index) => {
      if (!Number.isInteger(entry.day) || entry.day < 0) {
        throw new Error(`Timeline event ${index} must use a non-negative integer day.`);
      }
      if (!Array.isArray(entry.events) || entry.events.some(value => typeof value !== 'string' || !value.trim())) {
        throw new Error(`Timeline event ${index} must contain non-empty event names.`);
      }
      return { day: entry.day, events: [...entry.events], index };
    })
    .sort((left, right) => left.day - right.day || left.index - right.index);

  let currentDay = 0;
  let paused = false;
  const snapshots = [];
  const injected = new Set();

  function dateAt(day) {
    return new Date(startTimestamp + day * 24 * 60 * 60 * 1000).toISOString();
  }

  async function advanceToDay(targetDay) {
    if (!Number.isInteger(targetDay) || targetDay < currentDay) {
      throw new Error('Timeline can only advance to a future non-negative integer day.');
    }
    if (paused) return snapshot();

    currentDay = targetDay;
    for (const entry of schedule) {
      if (entry.day > targetDay || injected.has(entry.index)) continue;
      injected.add(entry.index);
      const eventSnapshot = Object.freeze({
        day: entry.day,
        at: dateAt(entry.day),
        events: [...entry.events],
      });
      await onEvent(eventSnapshot);
      snapshots.push(eventSnapshot);
    }
    return snapshot();
  }

  function snapshot() {
    return Object.freeze({
      currentDay,
      currentTime: dateAt(currentDay),
      paused,
      events: snapshots.map(entry => ({ ...entry, events: [...entry.events] })),
    });
  }

  return {
    advanceDays: days => {
      if (!Number.isInteger(days) || days < 0) {
        throw new Error('Timeline advanceDays requires a non-negative integer.');
      }
      return advanceToDay(currentDay + days);
    },
    advanceToDay,
    pause: () => { paused = true; },
    resume: () => { paused = false; },
    snapshot,
  };
}
