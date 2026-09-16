/**
 * Jarvis Engine (§25).
 *
 * Orchestrates contextBuilder + jarvisPersona + llmClient.
 */

import { queryLLM } from './llmClient.js';
import { JARVIS_SYSTEM_PROMPT } from './jarvisPersona.js';
import { assembleContext } from './contextBuilder.js';
import { AIInsightSchema } from './aiSchemas.js';

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
    const rawResponse = await queryLLM(messages, { jsonMode: true, temperature: 0.2 });
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
      createdAt: new Date().toISOString()
    };
  } catch (err) {
    console.error("[JarvisEngine] Failed to generate insight:", err);
    throw err;
  }
}
