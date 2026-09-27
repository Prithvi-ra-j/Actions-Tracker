import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';

import {
  addDays,
  daysBetween,
  endOfDay,
  localDateStr,
  localDateTime,
  parseLocalDate,
  startOfDay,
  subtractDays,
} from '../../src/helpers/dateHelpers.js';
import {
  createAction,
  createDomainEvent,
  createEvidence,
  createInsight,
  createIntent,
  createPattern,
} from '../../src/core/domain/domainEvents.js';
import { initDB } from '../../src/database/db.js';
import { getAppMeta, setAppMeta } from '../../src/database/appMetaRepository.js';

describe('workstream foundation', () => {
  it('uses local calendar semantics for dates and date ranges', () => {
    const input = new Date(2024, 0, 15, 23, 30, 12);
    expect(localDateStr(input)).toBe('2024-01-15');
    expect(localDateTime(input)).toBe('2024-01-15T23:30:12');

    const parsed = parseLocalDate('2024-02-29');
    expect(parsed.getFullYear()).toBe(2024);
    expect(parsed.getMonth()).toBe(1);
    expect(parsed.getDate()).toBe(29);

    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(subtractDays('2024-03-01', 1)).toBe('2024-02-29');
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);

    const start = startOfDay('2024-03-10');
    const end = endOfDay('2024-03-10');
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it('persists app metadata and supports migration version tracking', async () => {
    await initDB();
    await setAppMeta('dbVersion', 12);
    await setAppMeta('lastMigrationAt', '2026-09-27T12:00:00');

    expect(await getAppMeta('dbVersion')).toBe(12);
    expect(await getAppMeta('lastMigrationAt')).toBe('2026-09-27T12:00:00');
  });

  it('creates canonical domain events and typed entities', () => {
    const event = createDomainEvent({
      aggregateType: 'intent',
      aggregateId: 'intent-001',
      eventType: 'created',
      payload: { title: 'Build a 10K running habit' },
    });

    expect(event.kind).toBe('domain_event');
    expect(event.aggregateType).toBe('intent');
    expect(event.payload.title).toBe('Build a 10K running habit');

    const intent = createIntent({ id: 'intent-001', title: 'Build a 10K running habit', status: 'active' });
    const action = createAction({ id: 'action-001', type: 'habit', title: 'Run three times per week' });
    const evidence = createEvidence({ id: 'evidence-001', domain: 'body', signal: 'training_session', value: 1, confidence: 0.8 });
    const pattern = createPattern({ id: 'pattern-001', type: 'morning_consistency', summary: 'Morning sessions are more consistent' });
    const insight = createInsight({ id: 'insight-001', type: 'pattern', title: 'Morning consistency', confidence: 0.82 });

    expect(intent.kind).toBe('intent');
    expect(action.kind).toBe('action');
    expect(evidence.kind).toBe('evidence');
    expect(pattern.kind).toBe('pattern');
    expect(insight.kind).toBe('insight');
  });
});
