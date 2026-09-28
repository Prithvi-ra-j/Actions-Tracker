import { describe, expect, it } from 'vitest';
import { createSystemProposal, decideSystemProposal } from '../../src/core/onboarding/systemProposal.js';
import { calculateCalibrationProfile } from '../../src/core/scoring/calibrationProfile.js';
import { scoreRecommendation, applyCapacityFilter, diversifyRecommendations } from '../../src/core/today/recommendationPolicy.js';
import { classifyGoalHealth } from '../../src/core/goals/goalHealth.js';
import { evaluateIntervention, createIntervention, closeIntervention } from '../../src/core/ai/interventionLearning.js';
import { isWithinQuietHours, shouldSurfaceInsight } from '../../src/core/ai/proactivePolicy.js';
import { createStructuredError, isRetryableError } from '../../src/core/observability/structuredError.js';
import { classifyRetry } from '../../src/core/recovery/retryPolicy.js';

describe('Actions-Tracker 9/10 blueprint contracts', () => {
  it('creates and explicitly decides a system proposal', () => {
    const proposal = createSystemProposal({
      summary: 'Initial operating model',
      items: [
        { kind: 'goal', title: 'Improve endurance', payload: { timeHorizon: '90 days' } },
        { kind: 'habit', title: 'Run three times a week' },
      ],
    });
    expect(proposal.status).toBe('draft');
    const decided = decideSystemProposal(proposal, {
      [proposal.items[0].id]: 'approve',
      [proposal.items[1].id]: 'reject',
    });
    expect(decided.items).toHaveLength(1);
    expect(decided.items[0].status).toBe('approved');
    expect(decided.status).toBe('approved');
  });

  it('returns insufficient calibration for sparse/noisy data and stable for strong evidence', () => {
    expect(calculateCalibrationProfile({}).stage).toBe('No data');
    expect(calculateCalibrationProfile({ sampleSize: 2, coverage: 0.3, confidence: 0.4 }).stage).toBe('Initial estimate');
    expect(calculateCalibrationProfile({
      sampleSize: 30, coverage: 0.95, confidence: 0.95, freshness: 0.95, contradictionRate: 0.02,
      baselineAvailable: true,
    }).stage).toBe('Stable');
  });

  it('ranks Today candidates deterministically and respects capacity', () => {
    const scored = scoreRecommendation({ priority: 100, urgency: 90, goalRelevance: 80 });
    expect(scored).toBeGreaterThan(50);
    const filtered = applyCapacityFilter([
      { id: 'hard', type: 'action', effort: 95 },
      { id: 'evidence', type: 'evidence', effort: 5 },
    ], { capacityUsed: 20, capacityLimit: 100, reserve: 10 });
    expect(filtered.map(item => item.id)).toEqual(['evidence']);
    const diversified = diversifyRecommendations([
      { id: 'a', score: 90, domain: 'body' },
      { id: 'b', score: 80, domain: 'body' },
      { id: 'c', score: 70, domain: 'knowledge' },
    ], 3);
    expect(diversified.map(item => item.id)).toEqual(['a', 'c']);
  });

  it('classifies goal health without arbitrary numeric verdicts', () => {
    expect(classifyGoalHealth({ recentEvidenceCount: 0, recentActionCount: 0 })).toBe('INSUFFICIENT EVIDENCE');
    expect(classifyGoalHealth({ recentEvidenceCount: 3, recentActionCount: 2, progress: 0.4, targetProgress: 1 })).toBe('ON TRACK');
    expect(classifyGoalHealth({ recentEvidenceCount: 1, recentActionCount: 0, daysSinceEvidence: 21 })).toBe('STALLED');
  });

  it('evaluates interventions and preserves their learning result', () => {
    const intervention = createIntervention({ hypothesis: 'Earlier sessions improve completion.' });
    const evaluation = evaluateIntervention({ baseline: 0.4, outcome: 0.8, expected: 0.7 });
    const closed = closeIntervention(intervention, evaluation);
    expect(closed.status).toBe('completed');
    expect(closed.evaluation.result).toBe('positive');
    expect(closed.evaluation.effect).toBeCloseTo(0.4);
  });

  it('enforces notification quiet hours, budgets and confidence', () => {
    expect(isWithinQuietHours(new Date('2026-09-28T23:00:00'))).toBe(true);
    expect(shouldSurfaceInsight({ confidence: 0.5, severity: 'LOW', now: new Date('2026-09-28T12:00:00') }).reason).toBe('low_confidence');
    expect(shouldSurfaceInsight({ confidence: 0.95, severity: 'LOW', emittedToday: 2, now: new Date('2026-09-28T12:00:00') }).reason).toBe('notification_budget');
  });

  it('redacts structured failures and classifies transient errors for retry', () => {
    const structured = createStructuredError({
      error: new Error('token=super-secret failed'),
      category: 'AI',
      operation: 'llm_call',
      metadata: { apiKey: 'secret' },
    });
    expect(structured.category).toBe('AI');
    expect(structured.message).not.toContain('super-secret');
    expect(structured.metadata.apiKey).toBe('[redacted]');
    expect(isRetryableError(new Error('network timeout'))).toBe(true);
    expect(classifyRetry(new Error('network timeout'), 0, 3).retry).toBe(true);
    expect(classifyRetry(new Error('invalid schema'), 0, 3).retry).toBe(false);
  });
});
