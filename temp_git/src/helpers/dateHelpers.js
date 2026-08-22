/**
 * Date helpers that always operate in LOCAL calendar time.
 *
 * IMPORTANT: Never use new Date().toISOString().slice(0, 10) — that returns
 * the UTC date, which can be a day behind or ahead depending on timezone.
 * All helpers here use local year/month/day values.
 */

/**
 * Returns today (or any date) as "YYYY-MM-DD" in local time.
 * @param {Date} [date=new Date()]
 */
export function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a "YYYY-MM-DD" string into a Date at local midnight.
 * Avoids UTC-shift bugs of new Date("YYYY-MM-DD") which is parsed as UTC.
 * @param {string} str
 */
export function localDateFromStr(str) {
  if (!str || typeof str !== 'string') return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Returns true if the given "YYYY-MM-DD" string is today (local time).
 * @param {string} dateStr
 */
export function isToday(dateStr) {
  return dateStr === localDateStr();
}

/**
 * Formats a "YYYY-MM-DD" string as a human-readable display string.
 * E.g., "Monday, Aug 17"
 * @param {string} dateStr
 */
export function formatDisplayDate(dateStr) {
  try {
    const d = localDateFromStr(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Returns the previous month as { year, month } (month is 1-based).
 */
export function getPrevMonth(year, month) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

/**
 * Returns the next month as { year, month } (month is 1-based).
 */
export function getNextMonth(year, month) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

/**
 * Returns the first date of a month as "YYYY-MM-DD".
 * @param {number} year
 * @param {number} month  1-based
 */
export function getMonthStartDate(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/**
 * Returns the last date of a month as "YYYY-MM-DD".
 * @param {number} year
 * @param {number} month  1-based
 */
export function getMonthEndDate(year, month) {
  const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Returns the number of days in a given month.
 * @param {number} year
 * @param {number} month  1-based
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Returns the 0-based day-of-week (0=Sun, 6=Sat) of the 1st of the month.
 * @param {number} year
 * @param {number} month  1-based
 */
export function getFirstDayOfWeek(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

/**
 * Returns the 7 dates of the current Mon–Sun week as "YYYY-MM-DD" strings.
 * Index 0 = Monday, index 6 = Sunday.
 */
export function getCurrentWeekDates() {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(localDateStr(d));
  }
  return dates;
}

/**
 * Short day-of-week labels for a Mon-start week.
 */
export const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Returns the full month name for a given 1-based month number.
 * @param {number} month  1-based
 */
export function getMonthName(month) {
  return new Date(2000, month - 1, 1).toLocaleDateString(undefined, { month: 'long' });
}

/**
 * Returns true if date2 is exactly one calendar day after date1.
 * Uses Math.round to safely handle DST transitions (±1 hour).
 * @param {string} date1Str  "YYYY-MM-DD"
 * @param {string} date2Str  "YYYY-MM-DD"
 */
export function areConsecutiveDays(date1Str, date2Str) {
  const d1 = localDateFromStr(date1Str);
  const d2 = localDateFromStr(date2Str);
  const diffMs = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Returns the number of days between today (local time) and Dec 31, 2026.
 */
export function getDaysUntilYearEnd(targetYear = 2026) {
  const today = new Date();
  // Set today's time to midnight to calculate full days correctly
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yearEnd = new Date(targetYear, 11, 31); // Month is 0-indexed (11 = Dec)
  const diffMs = yearEnd.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
