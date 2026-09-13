/**
 * simulations/generators/dateUtils.js
 * 
 * Local-time date utilities for simulation generators.
 * Matches the logic in statsEngine.js to ensure all generated dates
 * align perfectly with engine windows without timezone drift.
 */

export function subDays(todayStr, n) {
  const d = new Date(todayStr + 'T00:00:00');
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateRange(startStr, endStr) {
  const dates = [];
  let curr = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  
  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const day = String(curr.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}
