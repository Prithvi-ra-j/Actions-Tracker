/**
 * Monthly Audit Engine (§32).
 *
 * Forces the AI to strictly answer 14 questions based on the last 30 days of evidence.
 */

import { queryLLM } from './llmClient.js';
import { JARVIS_SYSTEM_PROMPT } from './jarvisPersona.js';
import { addAudit } from '../../database/auditRepository.js';
import { AIAuditSchema } from './aiSchemas.js';
import { assembleContext, validateEvidenceReferences } from './contextBuilder.js';

const AUDIT_QUESTIONS_PROMPT = `
You are generating a Monthly Audit. You must analyze the evidence and output a JSON object adhering to this schema:
{
  "period": { "start": "ISO_DATE", "end": "ISO_DATE" },
  "domains": ["body", "strategy", "etc"],
  "scoreChanges": [{"domain": "body", "previous": 0, "current": 0, "delta": 0}],
  "wins": ["Win 1", "Win 2"],
  "failures": ["Failure 1", "Failure 2"],
  "contradictions": ["Contradiction 1"],
  "patterns": ["Pattern 1"],
  "risks": ["Risk 1"],
  "recommendations": ["Do X"],
  "nextPeriodFocus": ["Focus Y"],
  "supportingEvidenceIds": ["fact_123"]
}

Base your analysis on answering the following 14 questions internally before generating the final JSON arrays:
1. What did the user intend?
2. What actually happened?
3. Where did intention and behavior diverge?
4. Which domains improved?
5. Which stalled or regressed?
6. What repeated patterns appeared?
7. What did the user overestimate?
8. What did the user underestimate?
9. Where was activity high but development low?
10. What is the current bottleneck?
11. What should happen next month?
12. What should stop?
13. What should receive more attention?
14. What should not be changed yet?
`;

export async function runMonthlyAudit() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const contextData = JSON.parse(await assembleContext('audit'));
  contextData.audit_period = { start: startIso, end: endIso };
  const contextText = JSON.stringify(contextData, null, 2);

  const messages = [
    { role: 'system', content: JARVIS_SYSTEM_PROMPT + '\n\n' + AUDIT_QUESTIONS_PROMPT },
    { role: 'user', content: `Here is the system state and evidence for the last 30 days:\n\n${contextText}\n\nGenerate the Monthly Audit JSON.` }
  ];

  try {
    const rawResponse = await queryLLM(messages, { jsonMode: true, temperature: 0.3, maxTokens: 2000, intent: 'monthly_audit', messages });
    let auditData;
    try {
      auditData = JSON.parse(rawResponse);
    } catch (parseErr) {
      const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      auditData = JSON.parse(cleaned);
    }

    // Assign period if not provided
    if (!auditData.period) auditData.period = { start: startIso, end: endIso };
    
    validateEvidenceReferences(auditData.supportingEvidenceIds || [], contextData);

    // §30 Write Boundary Validation: Strict schema validation
    const validatedAudit = AIAuditSchema.parse(auditData);

    // Save to DB
    const id = await addAudit({
      ...validatedAudit,
      analysisVersion: '1.1',
      contextVersion: contextData.context_version,
      promptVersion: '1.1',
      modelId: 'configured-provider',
    });

    return { id, ...validatedAudit };
  } catch (err) {
    console.error("[AuditEngine] Failed to generate monthly audit:", err);
    throw err;
  }
}

