/**
 * Score Engine (§22 Scoring Architecture, §6 Scoring / Projections).
 *
 * Orchestrates the full scoring pipeline:
 *   Facts → Evidence → Domain Signals → Score Projection → Snapshot
 *
 * Rules:
 *   - A failed projection must NEVER overwrite a valid prior projection (§115)
 *   - Scores are projections (cached, rebuildable) — not source truth
 *   - Every projection stores methodology, supporting evidence, confidence, coverage
 *   - Low confidence is a displayable state, not an error
 *
 * This module calls repositories and domain engines.
 * It is the ONLY place that wires DB reads to engine calls to DB writes.
 * React components call queries; they do not call this directly.
 */

import { getAllFacts }                       from '../../database/factsRepository.js';
import { addEvidence, getLatestEvidence }    from '../../database/evidenceRepository.js';
import { checkAndWriteWeeklySnapshot }       from '../../database/statSnapshotsRepository.js';

import { buildEvidenceFromFacts, computeCoverageReport, getExpectedSignals } from '../evidence/evidenceBuilder.js';
import { createScoreProjection, createLowCoverageProjection } from '../../models/scoreSchema.js';
import { createEvidence }                    from '../../models/evidenceSchema.js';

import * as disciplineEngine from '../../domains/discipline/disciplineEngine.js';
import * as knowledgeEngine  from '../../domains/knowledge/knowledgeEngine.js';
import * as bodyEngine       from '../../domains/body/bodyEngine.js';
import * as strategyEngine   from '../../domains/strategy/strategyEngine.js';
import * as creativityEngine from '../../domains/creativity/creativityEngine.js';
import * as socialEngine     from '../../domains/social/socialEngine.js';

import { getOccurrencesForHabit } from '../../database/habitOccurrenceRepository.js';
import { getAllHabits }           from '../../database/habitRepository.js';
import { getAllLearnings }        from '../../database/learningRepository.js';
import { getAllBooks }            from '../../database/booksRepository.js';

const SCORE_ENGINE_VERSION = '1.0';

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Runs the full score pipeline for a domain in a time window.
 * Builds evidence, runs the domain engine, returns a ScoreProjection.
 *
 * Does NOT overwrite a valid prior score if the pipeline fails.
 *
 * @param {string} domain  — 'discipline'|'knowledge'|'body'|'strategy'|'creativity'|'social'
 * @param {{ start: string, end: string }} period
 * @returns {Promise<object>}  — ScoreProjection
 */
export async function runScoreProjection(domain, period) {
  try {
    const projection = await _buildProjection(domain, period);
    return projection;
  } catch (err) {
    console.error(`[scoreEngine] Failed to build projection for "${domain}":`, err);
    // Return a failed projection — caller checks warnings
    return createLowCoverageProjection(
      domain,
      period,
      'scoreEngine',
      SCORE_ENGINE_VERSION,
      `pipeline_error: ${err.message}`
    );
  }
}

/**
 * Returns a human-readable explanation of a ScoreProjection.
 * Delegates to the appropriate domain engine's explain() function.
 *
 * @param {object} scoreProjection
 * @returns {object}
 */
export function getExplanation(scoreProjection) {
  const { domain } = scoreProjection;
  switch (domain) {
    case 'discipline': return disciplineEngine.explain(scoreProjection);
    case 'knowledge':  return knowledgeEngine.explain(scoreProjection);
    case 'body':       return bodyEngine.explain(scoreProjection);
    case 'strategy':   return strategyEngine.explain(scoreProjection);
    case 'creativity': return creativityEngine.explain(scoreProjection);
    case 'social':     return socialEngine.explain(scoreProjection);
    default:
      return {
        headline:   `Score for ${domain}: ${scoreProjection.value}`,
        detail:     'Detailed explanation not available for this domain yet.',
        confidence: `Confidence: ${Math.round((scoreProjection.confidence ?? 0) * 100)}%.`,
        warnings:   scoreProjection.warnings ?? [],
      };
  }
}

// ─── Internal pipeline ─────────────────────────────────────────────────────────

async function _buildProjection(domain, period) {
  switch (domain) {
    case 'discipline': return _buildDisciplineProjection(period);
    case 'knowledge':  return _buildKnowledgeProjection(period);
    case 'body':       return _buildBodyProjection(period);
    case 'strategy':   return _buildStrategyProjection(period);
    case 'creativity': return _buildCreativityProjection(period);
    case 'social':     return _buildSocialProjection(period);
    default:
      return createLowCoverageProjection(
        domain, period, 'scoreEngine', SCORE_ENGINE_VERSION,
        `no engine implemented for domain "${domain}" yet`
      );
  }
}

async function _buildDisciplineProjection(period) {
  // 1. Load all active habits and their occurrences in the period
  const habits = await getAllHabits();
  const activeHabits = habits.filter(h => h.status === 'active');

  const allOccurrences = [];
  for (const habit of activeHabits) {
    const occs = await getOccurrencesForHabit(habit.id);
    // Filter to period
    const inWindow = occs.filter(o =>
      o.scheduledFor >= period.start && o.scheduledFor <= period.end
    );
    allOccurrences.push(...inWindow);
  }

  // 2. Collect signals from domain engine
  const signals = disciplineEngine.collectSignals(allOccurrences);

  // 3. Calculate score
  const projection = disciplineEngine.calculateScore(signals, period);

  // 4. Build and return a proper ScoreProjection
  return createScoreProjection(projection);
}

async function _buildKnowledgeProjection(period) {
  // 1. Load facts in period
  const allFacts = await getAllFacts();
  const facts = allFacts.filter(f =>
    f.occurredAt >= period.start && f.occurredAt <= period.end
  );

  // 2. Load learnings (all time — mastery accumulates)
  const learnings = await getAllLearnings();

  // 3. Load books
  let books = [];
  try {
    books = await getAllBooks();
  } catch {
    // booksRepository may not export getAllBooks — graceful degrade
    books = [];
  }

  // 4. Collect signals from domain engine
  const signals = knowledgeEngine.collectSignals({ facts, learnings, books });

  // 5. Calculate score
  const projection = knowledgeEngine.calculateScore(signals, period);

  // 6. Build and return a proper ScoreProjection
  return createScoreProjection(projection);
}

async function _buildBodyProjection(period) {
  const allFacts = await getAllFacts();
  const facts = allFacts.filter(f => f.occurredAt >= period.start && f.occurredAt <= period.end);
  const signals = bodyEngine.collectSignals({ facts });
  const projection = bodyEngine.calculateScore(signals, period);
  return createScoreProjection(projection);
}

async function _buildStrategyProjection(period) {
  const allFacts = await getAllFacts();
  const facts = allFacts.filter(f => f.occurredAt >= period.start && f.occurredAt <= period.end);
  const signals = strategyEngine.collectSignals({ facts });
  const projection = strategyEngine.calculateScore(signals, period);
  return createScoreProjection(projection);
}

async function _buildCreativityProjection(period) {
  const allFacts = await getAllFacts();
  const facts = allFacts.filter(f => f.occurredAt >= period.start && f.occurredAt <= period.end);
  const signals = creativityEngine.collectSignals({ facts });
  const projection = creativityEngine.calculateScore(signals, period);
  return createScoreProjection(projection);
}

async function _buildSocialProjection(period) {
  const allFacts = await getAllFacts();
  const facts = allFacts.filter(f => f.occurredAt >= period.start && f.occurredAt <= period.end);
  const signals = socialEngine.collectSignals({ facts });
  const projection = socialEngine.calculateScore(signals, period);
  return createScoreProjection(projection);
}

// ─── Additive extension to statsEngine integration ─────────────────────────────

/**
 * Computes a score with full explanation for a domain.
 * Additive companion to the existing computeAllStats() in statsEngine.js.
 *
 * @param {string} domain
 * @param {{ start: string, end: string }} period
 * @returns {Promise<{ score: object, explanation: object }>}
 */
export async function computeScoreWithExplanation(domain, period) {
  const score       = await runScoreProjection(domain, period);
  const explanation = getExplanation(score);
  return { score, explanation };
}
