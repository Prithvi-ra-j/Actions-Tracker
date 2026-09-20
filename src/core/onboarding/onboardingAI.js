import { queryLlmJson } from '../ai/llmClient.js';
import * as schemas from './schemas.js';

/**
 * A thin wrapper around the LLM client that binds onboarding tasks to specific Zod schemas.
 * In a real implementation this would format prompts safely.
 */
export async function parseIdentity(freeText) {
  const prompt = `Extract identity elements from this free text: "${freeText}"`;
  return await queryLlmJson(prompt, schemas.IntakeIdentitySchema, { 
    temperature: 0.1,
    system: "You are an AI extracting structured identity data. Never invent information not present in the source."
  });
}

export async function parseConstraints(freeText) {
  const prompt = `Extract time constraints from this free text: "${freeText}"`;
  return await queryLlmJson(prompt, schemas.ParseConstraintsSchema, {
    temperature: 0.1,
    system: "Extract strict time blocks (work, commute, sleep) from text. Use 24-hour HH:MM format."
  });
}

export async function extractBaseline(freeText, focusAxes) {
  const prompt = `Extract baseline frequencies (times per week) for these axes: ${focusAxes.join(', ')} from this text: "${freeText}"`;
  return await queryLlmJson(prompt, schemas.ExtractBaselineSchema, {
    temperature: 0.1,
    system: "Extract behavior frequency. Distinguish between actual ('did it 2x') and intended ('meant to do it 4x')."
  });
}

export async function proposeQuests(draftContext) {
  const prompt = `Based on this draft context, propose quests:\n${JSON.stringify(draftContext)}`;
  return await queryLlmJson(prompt, schemas.ProposeQuestsSchema, {
    temperature: 0.4,
    system: "Propose 1-3 highly specific, measurable quests per focus axis based on the user's vision and constraints."
  });
}

export async function refineHabit(habitTemplate, draftContext) {
  const prompt = `Refine this habit template based on the user's draft context.\nTemplate: ${JSON.stringify(habitTemplate)}\nContext: ${JSON.stringify(draftContext)}`;
  return await queryLlmJson(prompt, schemas.DesignHabitSchema, {
    temperature: 0.2,
    system: "Make the habit specific. Create a 'tiny version' that takes <2 minutes. Bind it to an existing time/event anchor from their constraints."
  });
}

export async function reviewDraft(draftContext) {
  const prompt = `Review this complete onboarding draft for contradictions and risks:\n${JSON.stringify(draftContext)}`;
  return await queryLlmJson(prompt, schemas.ReviewDraftSchema, {
    temperature: 0.1,
    system: "Look for over-commitment (too many habits), impossible goals given constraints, or misaligned axes vs vision."
  });
}
