import { describe, expect, it } from 'vitest';
import {
  CERTIFICATION_STATUSES,
  createCertificationEvidence,
  certifyScenario,
  failScenario,
} from '../../src/core/certification/certificationEvidence.js';

describe('certification evidence contract', () => {
  it('creates a reproducible certification record', () => {
    const record = createCertificationEvidence({
      gate: 'intervention_lifecycle',
      scenario: 'expired window evaluates and updates learning',
      environment: 'vitest',
      commit: 'test-commit',
      expected: { status: 'completed', result: 'positive' },
      observed: { status: 'completed', result: 'positive' },
      evidence: ['intervention_1', 'fact_1', 'intervention_1'],
    });

    expect(record.status).toBe('tested');
    expect(record.evidence).toEqual(['intervention_1', 'fact_1']);
    expect(CERTIFICATION_STATUSES).toContain(record.status);
  });

  it('supports explicit certified and blocked outcomes', () => {
    expect(certifyScenario({
      gate: 'android',
      scenario: 'reopen after upgrade',
    }, { dataIntact: true }, ['device-run-1']).status).toBe('certified');

    expect(failScenario({
      gate: 'android',
      scenario: 'TalkBack navigation',
    }, 'focus order mismatch').status).toBe('blocked');
  });
});
