import { describe, expect, it } from 'vitest';
import { createGroundedClaim } from '../../src/core/evidence/claimEngine.js';
import { buildEvidenceGraph } from '../../src/core/evidence/evidenceGraph.js';
import { explainProvenance } from '../../src/core/evidence/provenanceEngine.js';

describe('evidence provenance graph', () => {
  it('traces source evidence through a claim, recommendation and outcome', () => {
    const facts = [
      { id: 'fact_1', type: 'habit_completion', value: 0.41 },
    ];
    const evidence = [
      {
        id: 'evidence_1',
        supportingFactIds: ['fact_1'],
        signal: 'evening_completion',
      },
    ];
    const signal = {
      id: 'signal_1',
      evidenceIds: ['evidence_1'],
      type: 'baseline_deviation',
    };
    const recommendation = {
      id: 'recommendation_1',
      signalIds: ['signal_1'],
    };
    const outcome = {
      id: 'outcome_1',
      recommendationId: 'recommendation_1',
      evidenceIds: ['evidence_1'],
    };
    const claim = createGroundedClaim({
      claimId: 'claim_1',
      text: 'Evening completion is declining.',
      evidence,
      confidence: 0.84,
      derivedSignal: signal.id,
      recommendationId: recommendation.id,
      outcomeIds: [outcome.id],
      calculation: '7-day completion vs 30-day baseline',
      window: { start: '2026-09-21', end: '2026-09-28' },
    });

    const graph = buildEvidenceGraph({
      facts,
      evidence,
      signals: [signal],
      claims: [claim],
      recommendations: [recommendation],
      outcomes: [outcome],
    });

    expect(graph.nodes.map(node => node.type)).toEqual([
      'fact',
      'evidence',
      'signal',
      'claim',
      'recommendation',
      'outcome',
    ]);

    expect(graph.edges).toEqual(expect.arrayContaining([
      { from: 'evidence_1', to: 'fact_1', type: 'supports' },
      { from: 'signal_1', to: 'evidence_1', type: 'derived_from' },
      { from: 'claim_1', to: 'evidence_1', type: 'grounded_by' },
      { from: 'claim_1', to: 'signal_1', type: 'derived_from' },
      { from: 'claim_1', to: 'recommendation_1', type: 'informs' },
      { from: 'claim_1', to: 'outcome_1', type: 'validated_by' },
      { from: 'recommendation_1', to: 'signal_1', type: 'based_on' },
      { from: 'outcome_1', to: 'evidence_1', type: 'measured_by' },
      { from: 'outcome_1', to: 'recommendation_1', type: 'result_of' },
    ]));

    const explanation = explainProvenance(claim.provenance, { evidence_1: evidence[0] }, {
      signalsById: { signal_1: signal },
      recommendationsById: { recommendation_1: recommendation },
      outcomesById: { outcome_1: outcome },
    });

    expect(explanation.claim).toBe('Evening completion is declining.');
    expect(explanation.confidence).toBe(0.84);
    expect(explanation.derivedSignal.id).toBe('signal_1');
    expect(explanation.recommendation.id).toBe('recommendation_1');
    expect(explanation.outcomes[0].id).toBe('outcome_1');
  });
});
