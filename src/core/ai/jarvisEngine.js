/**
 * Jarvis Engine (§25).
 *
 * Orchestrates contextBuilder + jarvisPersona + llmClient.
 */

import { queryLLM } from './llmClient.js';
import { JARVIS_SYSTEM_PROMPT } from './jarvisPersona.js';
import { assembleContext } from './contextBuilder.js';
import { AIInsightSchema } from './aiSchemas.js';
import { ActionProposalSchema } from './actionSchemas.js';
import { validateClaimSupport } from './contextBuilder.js';
import { z } from 'zod';

const ConversationalResponseSchema = z.object({
  message: z.string(),
  // LLMs commonly emit proposal:null for ordinary conversation. Treat that
  // the same as an omitted proposal instead of rejecting the whole response.
  proposal: ActionProposalSchema.nullable().optional(),
  claims: z.array(z.object({
    text: z.string(),
    evidenceIds: z.array(z.string()),
  })).nullable().optional(),
});

export function validateEvidenceClaims(response, contextText) {
  const context = JSON.parse(contextText);
  validateClaimSupport(response.claims || [], context);
  return response;
}

const EXISTING_ENTITY_ACTIONS = new Set([
  'modify_habit',
  'pause_habit',
  'archive_habit',
  'modify_roadmap',
  'update_mastery_level',
]);

function normalizeActionProposal(proposal) {
  if (!proposal || typeof proposal !== 'object') return proposal;

  const actionType = proposal.actionType;
  const payload = { ...(proposal.payload || {}) };

  // Models occasionally use a nearby field name for goal title/label.
  if (actionType === 'add_goal' && !payload.label && !payload.title) {
    payload.label = payload.name || payload.outcome || payload.goal || payload.description;
  }

  const rawImpact = proposal.impact && typeof proposal.impact === 'object'
    ? proposal.impact
    : {};

  const impact = {
    affectedDomains: Array.isArray(rawImpact.affectedDomains) ? rawImpact.affectedDomains : [],
    scoringImpact: typeof rawImpact.scoringImpact === 'string'
      ? rawImpact.scoringImpact
      : 'No immediate score change; evidence accumulates after the change.',
    routineImpact: typeof rawImpact.routineImpact === 'string'
      ? rawImpact.routineImpact
      : 'No routine change specified.',
    identityAlignment: typeof rawImpact.identityAlignment === 'string'
      ? rawImpact.identityAlignment
      : '',
    disciplineImpact: typeof rawImpact.disciplineImpact === 'string'
      ? rawImpact.disciplineImpact
      : 'No direct discipline change.',
    risks: Array.isArray(rawImpact.risks) ? rawImpact.risks : [],
    dependencies: Array.isArray(rawImpact.dependencies) ? rawImpact.dependencies : [],
  };

  const confidenceNumber = Number(proposal.confidence);
  return {
    ...proposal,
    payload,
    impact,
    reasoning: typeof proposal.reasoning === 'string' ? proposal.reasoning : '',
    confidence: Number.isFinite(confidenceNumber)
      ? Math.max(0, Math.min(1, confidenceNumber))
      : 0.5,
  };
}

function normalizeConversationalResponse(responseObj, modificationContext = null) {
  const normalized = {
    ...responseObj,
    proposal: normalizeActionProposal(responseObj?.proposal),
  };

  // Normalize null to the same internal representation as an omitted proposal.
  if (normalized.proposal === null) delete normalized.proposal;

  // The UI supplies the exact proposal being modified. Preserve its
  // existing payload so a short edit such as "make it one hour" does not
  // accidentally drop the habit name, frequency, domain, etc.
  if (normalized.proposal && modificationContext) {
    const sameAction = normalized.proposal.actionType === modificationContext.actionType;
    const mergedPayload = sameAction
      ? { ...modificationContext.payload, ...normalized.proposal.payload }
      : { ...normalized.proposal.payload };

    // Existing-entity mutations must retain the opaque database ID. The UI
    // knows it; the model should not have to invent or remember it.
    if (
      EXISTING_ENTITY_ACTIONS.has(normalized.proposal.actionType) &&
      modificationContext.payload?.id &&
      !mergedPayload.id
    ) {
      mergedPayload.id = modificationContext.payload.id;
    }

    normalized.proposal = {
      ...normalized.proposal,
      payload: mergedPayload,
    };
  }

  return normalized;
}

/**
 * Generates an insight based on current user context.
 * 
 * @param {string} userQuery Optional user prompt or specific question.
 * @returns {Promise<object>} Returns an AIInsight JSON object.
 */
export async function generateInsight(userQuery = "Analyze my current state and identify any contradictions or bottlenecks.") {
  const contextText = await assembleContext('audit');

  const messages = [
    { role: 'system', content: JARVIS_SYSTEM_PROMPT },
    { role: 'user', content: `Here is the current system state and evidence:\n\n${contextText}\n\nTask: ${userQuery}` }
  ];

  try {
    const rawResponse = await queryLLM(messages, { jsonMode: true, temperature: 0.2, intent: 'audit', messages });
    let insight;
    try {
      insight = JSON.parse(rawResponse);
    } catch (parseErr) {
      // Sometimes models wrap JSON in markdown despite instructions.
      const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      insight = JSON.parse(cleaned);
    }
    
    // §30 Write Boundary Validation: Strict schema validation
    const validatedInsight = AIInsightSchema.parse(insight);

    return {
      id: `insight_${Date.now()}`,
      ...validatedInsight,
      status: 'proposed',
      contextVersion: JSON.parse(contextText).context_version,
      promptVersion: '1.1',
      modelId: 'configured-provider',
      createdAt: new Date().toISOString()
    };
  } catch (err) {
    console.error("[JarvisEngine] Failed to generate insight:", err);
    throw err;
  }
}

/**
 * Handles a conversational turn with Jarvis.
 * 
 * @param {string} userMessage The user's input.
 * @param {Array} history Previous messages [{ role, content }] (optional).
 * @returns {Promise<object>} Returns { message, proposal }
 */
export async function chatWithJarvis(userMessage, history = [], modificationContext = null, options = {}) {
  const contextText = await assembleContext('chat', userMessage);

  const modificationInstruction = modificationContext
    ? {
        role: 'system',
        content: [
          'The user is modifying an existing approved proposal from this conversation.',
          'Return a new proposal describing the requested change.',
          'Preserve the existing target ID for any action that modifies an existing entity.',
          'Existing proposal context:',
          JSON.stringify({
            actionType: modificationContext.actionType,
            payload: modificationContext.payload,
          }),
        ].join('\n'),
      }
    : null;
  
  // UI messages contain display-only metadata (proposal, contextUsed, claims,
  // proposalStatus). Never send that metadata back to an OpenAI-compatible API:
  // its chat message schema only accepts the role/content fields here.
  const llmHistory = (history || [])
    .filter(message => message && ['user', 'assistant', 'system'].includes(message.role))
    .map(message => ({
      role: message.role,
      content: String(message.llmContent ?? message.content ?? message.message ?? ''),
    }))
    .filter(message => message.content.trim());

  const messages = [
    { role: 'system', content: JARVIS_SYSTEM_PROMPT },
    { role: 'system', content: `Here is the CURRENT system state and evidence:\n\n${contextText}` },
    ...(modificationInstruction ? [modificationInstruction] : []),
    ...llmHistory,
    { role: 'user', content: userMessage }
  ];
  
  try {
    const rawResponse = await queryLLM(messages, { jsonMode: true, temperature: 0.2, intent: 'jarvis_chat', messages });
    let responseObj;
    try {
      responseObj = JSON.parse(rawResponse);
    } catch (parseErr) {
      const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      responseObj = JSON.parse(cleaned);
    }
    
    // Normalize the common null-proposal case before schema validation and
    // deterministically retain the target ID during proposal modifications.
    const normalized = normalizeConversationalResponse(responseObj, modificationContext);
    const validated = ConversationalResponseSchema.parse(normalized);
    const context = JSON.parse(contextText);
    // During Jarvis onboarding, the conversation is itself collecting new user
    // information. Those answers are not yet persisted evidence, so requiring
    // evidence IDs here can reject an otherwise valid onboarding turn.
    if (!options.onboarding) {
      validateEvidenceClaims(validated, contextText);
    }

    return {
      ...validated,
      contextUsed: {
        contextVersion: context.context_version,
        evidenceCount: context.recent_evidence_facts?.length ?? 0,
        memoryCount: context.semantic_memories?.length ?? 0,
        activeHabitCount: context.active_habits?.length ?? 0,
        activeGoalCount: context.active_goals?.length ?? 0,
        activeHabits: (context.active_habits || []).slice(0, 8).map(habit => ({
          id: habit.id, name: habit.name, domain: habit.domain,
        })),
        activeGoals: (context.active_goals || []).slice(0, 8).map(goal => goal.title),
        recentEvidence: (context.recent_evidence_facts || []).slice(-8).map(fact => ({
          id: fact.id, type: fact.type, date: fact.date,
        })),
      },
    };
  } catch (err) {
    if (err?.issues) {
      console.error('[JarvisEngine] Chat schema validation failed:', err.issues);
    }
    console.error('[JarvisEngine] Chat failed:', err);
    throw err;
  }
}
