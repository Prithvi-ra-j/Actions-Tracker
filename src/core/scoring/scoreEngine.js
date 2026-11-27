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
import { checkAndWriteWeeklySnapshot, getAllSnapshots }       from '../../database/statSnapshotsRepository.js';

import { buildEvidenceFromFacts, computeCoverageReport, getExpectedSignals } from '../evidence/evidenceBuilder.js';
import { createScoreProjection, createLowCoverageProjection } from '../../models/scoreSchema.js';
import { createEvidence }                    from '../../models/evidenceSchema.js';

import { calcAxisStat } from '../../helpers/statsEngine.js';
import { localDateStr } from '../../helpers/dateHelpers.js';
import { getAllLogs } from '../../database/logsRepository.js';
import { getAllAxisConfigs } from '../../database/axisConfigRepository.js';
import { getAllQuests } from '../../database/questBoardRepository.js';

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
import { getAllSettings }        from '../../database/settingsRepository.js';
import { getEffectiveFacts } from '../facts/effectiveFacts.js';

const SCORE_ENGINE_VERSION = '1.0';

function periodDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localDateStr(new Date(value));
}

async function getEffectiveFactsInPeriod(period, domain) {
  const allFacts = await getAllFacts();
  return getEffectiveFacts(allFacts).filter(fact => fact.occurredAt >= period.start && fact.occurredAt <= period.end &&
    fact.meta?.domain === domain && !fact.meta?.secondaryDomain);
}

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
  // Pre-load data needed by statsEngine for canonical math
  const allLogs = await getAllLogs();
  const axisConfigs = await getAllAxisConfigs();
  const allQuests = await getAllQuests();
  const allHabits = await getAllHabits();

  const axisLogs = allLogs.filter(l => l.axis === domain);
  const axisConfig = axisConfigs.find(c => c.axis === domain) ?? { hasConsistencyTerm: true, expectedPerWeek: 7, paused: false };
  const axisQuests = allQuests.filter(q => q.axis === domain);
  const axisHabits = allHabits.filter(h => h.domain === domain && h.status === 'active');
  
  // Get canonical score from the pure math engine
  const canonicalValue = calcAxisStat(domain, axisLogs, axisConfig, axisQuests, periodDate(period.end), axisHabits);

  let projection;
  switch (domain) {
    case 'discipline': projection = await _buildDisciplineProjection(period); break;
    case 'knowledge':  projection = await _buildKnowledgeProjection(period); break;
    case 'body':       projection = await _buildBodyProjection(period); break;
    case 'strategy':   projection = await _buildStrategyProjection(period); break;
    case 'creativity': projection = await _buildCreativityProjection(period); break;
    case 'social':     projection = await _buildSocialProjection(period); break;
    default:
      return createLowCoverageProjection(
        domain, period, 'scoreEngine', SCORE_ENGINE_VERSION,
        `no engine implemented for domain "${domain}" yet`
      );
  }

  // Step 4: Scoring Authority Resolver (P0)
  // If evidence is strong enough, the engine's projection value takes authority.
  // Otherwise, it falls back to the canonical statsEngine value.
  const requiredSignalsPresent = projection.components && projection.components.length > 0;
  const noCriticalWarnings = !projection.warnings || !projection.warnings.some(w => w.startsWith('low_coverage'));
  
  const authority = (
    projection.coverage >= 0.8 &&
    projection.confidence >= 0.7 &&
    requiredSignalsPresent &&
    noCriticalWarnings
  );

  if (authority) {
    projection.scoreSource = 'evidence';
    // projection.value remains whatever the domain engine calculated based on evidence
  } else {
    projection.scoreSource = 'canonical';
    projection.fallbackReason = 'Insufficient evidence coverage/confidence';
    projection.value = canonicalValue; 
  }
  
  // Step 7: Plateau Detection
  const allSnapshots = await getAllSnapshots();
  const todayDate = new Date(periodDate(period.end) + 'T00:00:00');
  const fourWeeksAgo = new Date(todayDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  const recentSnapshots = allSnapshots.filter(s => new Date(s.date + 'T00:00:00') >= fourWeeksAgo);
  
  let isPlateau = false;
  if (recentSnapshots.length >= 2) {
    const oldest = recentSnapshots[recentSnapshots.length - 1];
    const newest = recentSnapshots[0];
    const oldestScore = oldest.stats?.[domain] ?? 0;
    const newestScore = newest.stats?.[domain] ?? 0;
    
    if (Math.abs(newestScore - oldestScore) <= 3) {
      const isMaintaining = axisHabits.length > 0 && axisHabits.every(h => h.phase === 'maintaining');
      if (!isMaintaining) {
        isPlateau = true;
      }
    }
  }

  if (isPlateau) {
    projection.isPlateau = true;
    projection.warnings = projection.warnings || [];
    projection.warnings.push('plateau_detected: Score has barely changed in 4 weeks. Consider increasing difficulty or shifting phase to maintaining.');
  }

  return createScoreProjection(projection);
}

async function _buildDisciplineProjection(period) {
  // 1. Load recorded occurrences in the period, excluding rest dates
  const habits = await getAllHabits();
  const settings = await getAllSettings();
  const restDates = new Set(Object.keys(settings).filter(key => key.startsWith('restDay:') && settings[key] === 'true')
    .map(key => key.slice('restDay:'.length)));
  if (settings.restDay) restDates.add(settings.restDay);

  const allOccurrences = [];
  for (const habit of habits) {
    const occs = await getOccurrencesForHabit(habit.id);
    // Filter to period
    const startDate = periodDate(period.start);
    const endDate = periodDate(period.end);
    for (const occurrence of occs) {
      if (occurrence.reason === 'rest_day') restDates.add(occurrence.scheduledFor.split('T')[0]);
    }
    const inWindow = occs.filter(o => {
      const date = o.scheduledFor.split('T')[0];
      const attribution = o.attribution || { primary: habit.domain, secondary: habit.secondaryDomain };
      return date >= startDate && date <= endDate && attribution.primary === 'discipline' && !attribution.secondary;
    });
    allOccurrences.push(...inWindow);
  }

  // 2. Collect signals from domain engine
  const signals = disciplineEngine.collectSignals(allOccurrences.filter(occ =>
    !restDates.has(occ.scheduledFor.split('T')[0])));

  // 3. Calculate preliminary projection (for coverage/confidence)
  const projection = disciplineEngine.calculateScore(signals, period);

  return projection;
}

async function _buildKnowledgeProjection(period) {
  // 1. Load facts in period
  const facts = await getEffectiveFactsInPeriod(period, 'knowledge');

  // 2. Load learnings (all time — mastery accumulates)
  const learnings = (await getAllLearnings()).filter(learning =>
    learning.tags?.[0]?.toLowerCase() === 'knowledge');

  // 3. Load books
  const books = (await getAllBooks()).filter(book => book.domain === 'knowledge' && !book.secondaryDomain);

  // 4. Collect signals from domain engine
  const signals = knowledgeEngine.collectSignals({ facts, learnings, books });

  // 5. Calculate preliminary projection
  const projection = knowledgeEngine.calculateScore(signals, period);

  return projection;
}

async function _buildBodyProjection(period) {
  const facts = await getEffectiveFactsInPeriod(period, 'body');
  const signals = bodyEngine.collectSignals({ facts });
  const projection = bodyEngine.calculateScore(signals, period);
  return projection;
}

async function _buildStrategyProjection(period) {
  const facts = await getEffectiveFactsInPeriod(period, 'strategy');
  const signals = strategyEngine.collectSignals({ facts });
  const projection = strategyEngine.calculateScore(signals, period);
  return projection;
}

async function _buildCreativityProjection(period) {
  const facts = await getEffectiveFactsInPeriod(period, 'creativity');
  const signals = creativityEngine.collectSignals({ facts });
  const projection = creativityEngine.calculateScore(signals, period);
  return projection;
}

async function _buildSocialProjection(period) {
  const facts = await getEffectiveFactsInPeriod(period, 'social');
  const signals = socialEngine.collectSignals({ facts });
  const projection = socialEngine.calculateScore(signals, period);
  return projection;
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
