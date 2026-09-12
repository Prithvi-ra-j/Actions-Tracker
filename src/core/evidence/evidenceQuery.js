/**
 * Evidence query layer (§27 AI Context Retrieval, §4 Evidence Substrate).
 *
 * Composes evidence repository reads with coverage reporting.
 * Used by domain engines and Jarvis context assembly.
 *
 * This is the primary interface between the evidence store and any
 * component that needs to reason about what the user has done.
 *
 * Ranking: by recency, then confidence, then signal strength.
 */

import {
  getEvidenceByDomainAndWindow,
  getLatestEvidence,
} from '../../database/evidenceRepository.js';
import { computeCoverageReport, getExpectedSignals } from './evidenceBuilder.js';

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the ranked evidence context for a domain within a time window.
 * This is the primary input to domain engines.
 *
 * @param {string} domain
 * @param {{ start: string, end: string }} timeWindow
 * @returns {Promise<{ evidence: object[], coverage: object }>}
 */
export async function getEvidenceContext(domain, timeWindow) {
  const evidence = await getEvidenceByDomainAndWindow(domain, timeWindow.start, timeWindow.end);
  const ranked   = rankEvidence(evidence);

  const expectedSignals = getExpectedSignals(domain);
  const presentSignals  = [...new Set(evidence.map(e => e.signal))];
  const missingSignals  = expectedSignals.filter(s => !presentSignals.includes(s));

  const coverageRatio = expectedSignals.length > 0
    ? presentSignals.filter(s => expectedSignals.includes(s)).length / expectedSignals.length
    : 0;

  return {
    evidence: ranked,
    coverage: {
      ratio:          coverageRatio,
      confidence:     coverageRatio,
      presentSignals,
      missingSignals,
    },
  };
}

/**
 * Returns a full coverage report for a domain, comparing expected signals
 * against evidence records present in the store.
 *
 * Useful for building the "evidence coverage" section of Stats and Audits.
 *
 * @param {string} domain
 * @param {{ start: string, end: string }} timeWindow
 * @returns {Promise<{ coverage: number, confidence: number, presentSignals: string[], missingSignals: string[] }>}
 */
export async function getCoverageReport(domain, timeWindow) {
  const evidence        = await getEvidenceByDomainAndWindow(domain, timeWindow.start, timeWindow.end);
  const expectedSignals = getExpectedSignals(domain);
  const presentSignals  = [...new Set(evidence.map(e => e.signal))];
  const missingSignals  = expectedSignals.filter(s => !presentSignals.includes(s));

  const coverage = expectedSignals.length > 0
    ? presentSignals.filter(s => expectedSignals.includes(s)).length / expectedSignals.length
    : 0;

  return {
    coverage,
    confidence:     coverage,
    presentSignals,
    missingSignals,
  };
}

/**
 * Returns the most recent evidence record for a domain, or null.
 * Used by engines that only need to know the current state.
 *
 * @param {string} domain
 * @returns {Promise<object|null>}
 */
export async function getLatestDomainEvidence(domain) {
  return getLatestEvidence(domain);
}

// ─── Internal ──────────────────────────────────────────────────────────────────

/**
 * Ranks evidence by recency desc, then confidence desc.
 * @param {object[]} evidence
 * @returns {object[]}
 */
function rankEvidence(evidence) {
  return [...evidence].sort((a, b) => {
    const recencyDiff = b.createdAt.localeCompare(a.createdAt);
    if (recencyDiff !== 0) return recencyDiff;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });
}
