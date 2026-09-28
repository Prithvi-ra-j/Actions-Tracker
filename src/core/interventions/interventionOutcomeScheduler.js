import { getAllFacts } from '../../database/factsRepository.js';
import { getActiveInterventions } from '../../database/interventionRepository.js';
import { collectInterventionOutcome } from './interventionOutcomeCollector.js';
import { saveTelemetryEvent } from '../../database/telemetryRepository.js';

const DAY_MS = 86400000;

function asTime(value) {
  const time = value instanceof Date ? value.getTime() : Date.parse(value || '');
  return Number.isFinite(time) ? time : null;
}

function matchesMeasurement(fact, measurement = {}) {
  if (measurement.factType && fact.type !== measurement.factType) return false;
  if (measurement.objectId && fact.objectId !== measurement.objectId) return false;
  return true;
}

function numericValue(fact, field = 'value') {
  const value = field === 'value' ? fact?.value : fact?.[field];
  return Number(value);
}

function aggregateFacts(facts, measurement = {}) {
  const values = facts
    .map(fact => numericValue(fact, measurement.valueField || 'value'))
    .filter(Number.isFinite);

  if (!values.length) return null;

  switch (measurement.aggregation || 'latest') {
    case 'count':
      return values.length;
    case 'sum':
      return values.reduce((sum, value) => sum + value, 0);
    case 'average':
    case 'mean':
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case 'latest':
    default:
      return values[values.length - 1];
  }
}

export function getInterventionOutcomeDueAt(intervention) {
  if (intervention?.outcomeDueAt) return intervention.outcomeDueAt;
  const startedAt = asTime(intervention?.outcomeWindowStartedAt || intervention?.proposedAt);
  const days = Number(intervention?.outcomeWindowDays);
  if (!Number.isFinite(startedAt) || !Number.isFinite(days)) return null;
  return new Date(startedAt + Math.max(1, days) * DAY_MS).toISOString();
}

export function isInterventionOutcomeDue(intervention, now = new Date()) {
  if (!intervention || intervention.status !== 'active') return false;
  const dueAt = asTime(getInterventionOutcomeDueAt(intervention));
  const nowMs = asTime(now);
  return dueAt !== null && nowMs !== null && dueAt <= nowMs;
}

export function collectMeasurementFromFacts(intervention, facts = [], now = new Date()) {
  const measurement = intervention?.measurement;
  if (!measurement || typeof measurement !== 'object') {
    return { status: 'not_configured', reason: 'missing_measurement_contract' };
  }

  const expected = Number(measurement.expectedValue ?? measurement.expected);
  if (!Number.isFinite(expected)) {
    return { status: 'not_configured', reason: 'missing_expected_value' };
  }

  const startedAt = asTime(intervention.outcomeWindowStartedAt || intervention.proposedAt);
  const nowMs = asTime(now);
  if (startedAt === null || nowMs === null) {
    return { status: 'not_configured', reason: 'invalid_intervention_window' };
  }

  const relevant = facts
    .filter(fact => matchesMeasurement(fact, measurement))
    .map(fact => ({ fact, at: asTime(fact.occurredAt || fact.observedAt || fact.recordedAt || fact.date) }))
    .filter(item => item.at !== null)
    .sort((a, b) => a.at - b.at);

  const before = relevant
    .filter(item => item.at < startedAt)
    .map(item => item.fact);

  const outcomeFacts = relevant
    .filter(item => item.at >= startedAt && item.at <= nowMs)
    .map(item => item.fact);

  const baselineFromFacts = aggregateFacts(before, measurement);
  const baseline = Number.isFinite(Number(measurement.baselineValue))
    ? Number(measurement.baselineValue)
    : baselineFromFacts;

  if (!Number.isFinite(baseline)) {
    return {
      status: 'insufficient_evidence',
      reason: 'missing_baseline',
      expected,
      evidenceFactIds: outcomeFacts.map(f => f.id).filter(Boolean),
    };
  }

  if (outcomeFacts.length < Math.max(1, Number(measurement.minSamples || 1))) {
    return {
      status: 'insufficient_evidence',
      reason: 'outcome_window_has_insufficient_evidence',
      baseline,
      expected,
      observedCount: outcomeFacts.length,
      evidenceFactIds: outcomeFacts.map(f => f.id).filter(Boolean),
    };
  }

  const outcome = aggregateFacts(outcomeFacts, measurement);
  if (!Number.isFinite(outcome)) {
    return {
      status: 'insufficient_evidence',
      reason: 'outcome_values_not_numeric',
      baseline,
      expected,
      evidenceFactIds: outcomeFacts.map(f => f.id).filter(Boolean),
    };
  }

  return {
    status: 'ready',
    baseline,
    outcome,
    expected,
    higherIsBetter: measurement.higherIsBetter !== false,
    minEffect: Number(measurement.minEffect || 0),
    evidenceFactIds: outcomeFacts.map(f => f.id).filter(Boolean),
  };
}

/**
 * Evaluates every active intervention whose outcome window has expired.
 * It is deliberately idempotent: only active interventions are eligible,
 * and an intervention is closed only after an evaluable outcome exists.
 */
export async function runInterventionOutcomeScheduler({
  now = new Date(),
  facts = null,
  interventions = null,
} = {}) {
  const [allFacts, activeInterventions] = await Promise.all([
    facts || getAllFacts(),
    interventions || getActiveInterventions(),
  ]);

  const due = activeInterventions.filter(item => isInterventionOutcomeDue(item, now));
  const results = [];

  for (const intervention of due) {
    const measurement = collectMeasurementFromFacts(intervention, allFacts, now);

    if (measurement.status !== 'ready') {
      results.push({
        interventionId: intervention.id,
        status: measurement.status,
        reason: measurement.reason,
        dueAt: getInterventionOutcomeDueAt(intervention),
      });
      continue;
    }

    try {
      const completed = await collectInterventionOutcome(intervention.id, {
        baseline: measurement.baseline,
        outcome: measurement.outcome,
        expected: measurement.expected,
        higherIsBetter: measurement.higherIsBetter,
        minEffect: measurement.minEffect,
        completedAt: new Date(now).toISOString(),
      });

      results.push({
        interventionId: intervention.id,
        status: 'completed',
        result: completed.evaluation?.result || 'inconclusive',
        evidenceFactIds: measurement.evidenceFactIds,
        completed,
      });
    } catch (error) {
      results.push({
        interventionId: intervention.id,
        status: 'failed',
        reason: error?.message || 'outcome_evaluation_failed',
      });
    }
  }

  const evaluated = results.filter(item => item.status === 'completed').length;
  const skipped = results.length - evaluated;

  try {
    await saveTelemetryEvent('intervention_outcome_scheduler', new Date(now).toISOString().slice(0, 10), {
      dueCount: due.length,
      evaluated,
      skipped,
      results: results.map(({ completed, ...item }) => item),
    });
  } catch {
    // Telemetry must never prevent the lifecycle from completing.
  }

  return {
    checkedAt: new Date(now).toISOString(),
    dueCount: due.length,
    evaluated,
    skipped,
    results,
  };
}
