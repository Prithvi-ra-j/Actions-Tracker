import { addFact, getAllFacts } from '../../database/factsRepository.js';

const PREFIX = 'calibration.baseline';

export async function saveBaseline(metric, baseline, { evidenceIds = [], source = 'system' } = {}) {
  if (!metric || !baseline) throw new Error('metric and baseline are required');
  return addFact({
    type: PREFIX,
    objectId: metric,
    value: baseline.value,
    occurredAt: baseline.lastObservedAt || new Date().toISOString(),
    meta: { metric, baseline, evidenceIds, source, version: baseline.version },
  });
}

export async function getLatestBaseline(metric) {
  const facts = await getAllFacts();
  return facts
    .filter(f => f.type === PREFIX && f.objectId === metric)
    .sort((a, b) => String(a.occurredAt || a.createdAt).localeCompare(String(b.occurredAt || b.createdAt)))
    .at(-1)?.meta?.baseline || null;
}

export async function getAllBaselines() {
  const facts = await getAllFacts();
  const map = new Map();
  for (const fact of facts.filter(f => f.type === PREFIX)) {
    map.set(fact.objectId, fact.meta?.baseline);
  }
  return Object.fromEntries(map);
}
