/**
 * Insights Repository (§33 Scheduled Analysis).
 *
 * Stores AI-generated insights created passively in the background.
 */

import { dbGet, dbPut, dbGetAll, dbDelete } from './db.js';

const STORE = 'insights';
const SCHEMA_VERSION = 1;

/**
 * Persists a new Insight record.
 *
 * @param {object} insight Must conform to AIInsight schema.
 * @returns {Promise<string>} The generated insight ID
 */
export async function addInsight(insight) {
  const record = {
    ...insight,
    id: insight.id || `insight_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    schemaVersion: SCHEMA_VERSION,
    status: insight.status || 'proposed', // 'proposed', 'confirmed', 'rejected', 'resolved', 'dismissed'
    createdAt: insight.createdAt || new Date().toISOString()
  };
  await dbPut(STORE, record);
  return record.id;
}

/**
 * Returns all insights.
 * @returns {Promise<object[]>}
 */
export async function getAllInsights() {
  const all = await dbGetAll(STORE);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Returns only active/unread insights (e.g., status is 'proposed').
 * @returns {Promise<object[]>}
 */
export async function getActiveInsights() {
  const all = await getAllInsights();
  return all.filter(i => i.status === 'proposed');
}

/**
 * Updates an insight's status.
 */
export async function updateInsightStatus(id, newStatus) {
  const record = await dbGet(STORE, id);
  if (!record) throw new Error(`Insight ${id} not found`);
  record.status = newStatus;
  await dbPut(STORE, record);
}

/**
 * Deletes an insight permanently.
 */
export async function deleteInsight(id) {
  await dbDelete(STORE, id);
}
