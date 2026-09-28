import { describe, expect, it } from 'vitest';
import { classifyIntegrityIssues } from '../../src/core/recovery/dataIntegrity.js';

describe('data integrity recovery', () => {
  it('classifies orphan and timestamp corruption as repair candidates', () => {
    const report = classifyIntegrityIssues({
      issues: [
        { type: 'orphan_evidence_reference' },
        { type: 'invalid_timestamp' },
        { type: 'duplicate_id' },
      ],
    });
    expect(report[0].recoverable).toBe(true);
    expect(report[1].recoverable).toBe(true);
    expect(report[2].severity).toBe('high');
  });
});
