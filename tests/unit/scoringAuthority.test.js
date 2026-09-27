import { describe, expect, it } from 'vitest';
import { resolveScoreAuthority } from '../../src/core/scoring/scoringAuthority.js';
import { SCORING_CONTRACT_VERSION, SCORING_CONTRACTS } from '../../src/core/scoring/scoringContracts.js';

describe('canonical scoring authority', () => {
  it('uses evidence only when coverage, confidence and signals are sufficient', () => {
    const result = resolveScoreAuthority({
      evidenceValue: 72,
      canonicalValue: 61,
      coverage: 0.85,
      confidence: 0.8,
      components: [{ signal: 'consistency' }],
      warnings: [],
    });
    expect(result.source).toBe('evidence');
    expect(result.value).toBe(72);
    expect(result.fallbackReason).toBeNull();
  });

  it('falls back deterministically when evidence is sparse', () => {
    const result = resolveScoreAuthority({
      evidenceValue: 72,
      canonicalValue: 61,
      coverage: 0.4,
      confidence: 0.9,
      components: [{ signal: 'consistency' }],
      warnings: [],
    });
    expect(result.source).toBe('canonical');
    expect(result.value).toBe(61);
    expect(result.fallbackReason).toBeTruthy();
  });

  it('exposes a versioned contract for every canonical axis', () => {
    expect(SCORING_CONTRACT_VERSION).toBe('1.1');
    for (const contract of Object.values(SCORING_CONTRACTS)) {
      expect(contract.contractVersion).toBe(SCORING_CONTRACT_VERSION);
      expect(contract.signals.length).toBeGreaterThan(0);
    }
  });
});
