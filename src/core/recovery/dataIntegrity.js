import { dbGetAll } from '../../database/db.js';

const TIMESTAMP_FIELDS = ['createdAt', 'updatedAt', 'occurredAt', 'observedAt', 'date'];

export async function scanDataIntegrity({
  stores = ['goals', 'habits', 'habitOccurrences', 'facts', 'evidence', 'relations', 'memories', 'interventions'],
} = {}) {
  const issues = [];
  const recordsByStore = {};

  for (const store of stores) {
    let records = [];
    try { records = await dbGetAll(store); } catch (error) {
      issues.push({ type: 'store_unavailable', store, message: error.message });
      continue;
    }
    recordsByStore[store] = records;

    const ids = new Set();
    for (const record of records) {
      if (!record?.id && store !== 'goals') issues.push({ type: 'missing_id', store });
      if (record?.id) {
        if (ids.has(record.id)) issues.push({ type: 'duplicate_id', store, id: record.id });
        ids.add(record.id);
      }
      for (const field of TIMESTAMP_FIELDS) {
        if (record?.[field] != null && Number.isNaN(Date.parse(String(record[field])))) {
          issues.push({ type: 'invalid_timestamp', store, id: record.id, field });
        }
      }
    }
  }

  const factIds = new Set((recordsByStore.facts || []).map(f => f.id));
  for (const evidence of recordsByStore.evidence || []) {
    for (const factId of evidence.supportingFactIds || []) {
      if (!factIds.has(factId)) issues.push({ type: 'orphan_evidence_reference', evidenceId: evidence.id, factId });
    }
  }

  const entityIds = new Set([
    ...(recordsByStore.goals || []).map(g => g.id).filter(Boolean),
    ...(recordsByStore.habits || []).map(h => h.id).filter(Boolean),
    ...(recordsByStore.facts || []).map(f => f.id).filter(Boolean),
  ]);
  for (const relation of recordsByStore.relations || []) {
    if (relation.fromId && !entityIds.has(relation.fromId)) issues.push({ type: 'orphan_relation_from', relationId: relation.id });
    if (relation.toId && !entityIds.has(relation.toId)) issues.push({ type: 'orphan_relation_to', relationId: relation.id });
  }

  return {
    healthy: issues.length === 0,
    scannedStores: Object.keys(recordsByStore),
    issueCount: issues.length,
    issues,
    scannedAt: new Date().toISOString(),
  };
}

export function classifyIntegrityIssues(report) {
  return (report?.issues || []).map(issue => ({
    ...issue,
    recoverable: ['invalid_timestamp', 'orphan_evidence_reference'].includes(issue.type),
    severity: issue.type.includes('orphan') || issue.type.includes('duplicate') ? 'high' : 'medium',
  }));
}
