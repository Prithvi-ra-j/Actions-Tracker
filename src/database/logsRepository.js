import { dbGet, dbPut, dbGetAll, dbGetRange, dbGetAllByIndex } from './db.js';

export async function addLog(log) {
  // log: { axis, type, value, date, meta }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await dbPut('logs', { id, ...log, createdAt });
  return id;
}

export async function commitLog(log) {
  // Similar to addLog but accepts a fully formed log object with id and createdAt
  await dbPut('logs', log);
  return log.id;
}

export async function getLogsByDateRange(startDate, endDate) {
  // Uses index if available, or fetch all and filter for now since IDB index range queries
  // require bound keys which we can simulate by filtering all logs, or creating an index range.
  // Using dbGetAllByIndex doesn't support ranges out of the box in our db.js helper.
  // Easiest is to fetch all and filter since data size is small.
  const allLogs = await dbGetAll('logs');
  return allLogs.filter(log => log.date >= startDate && log.date <= endDate);
}

export async function getLogsByAxis(axis) {
  return await dbGetAllByIndex('logs', 'axis', axis);
}

export async function getAllLogs() {
  return await dbGetAll('logs');
}

export async function deleteLog(id) {
  const { getDB } = await import('./db.js');
  const tx = getDB().transaction('logs', 'readwrite');
  tx.objectStore('logs').delete(id);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Failed to delete log'));
    tx.onabort = () => reject(tx.error || new Error('Log deletion aborted'));
  });
}

export async function deleteDailyCheckboxLog(date, taskKey) {
  // Used for daily checkboxes when untoggled
  const allLogs = await dbGetAll('logs');
  const target = allLogs.find(l => l.type === 'daily_checkbox' && l.date === date && l.meta?.task === taskKey);
  if (target) {
    const { getDB } = await import('./db.js');
    const tx = getDB().transaction('logs', 'readwrite');
    tx.objectStore('logs').delete(target.id);
  }
}
