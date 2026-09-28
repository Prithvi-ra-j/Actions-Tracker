import { z } from 'zod';
import { queryLLM } from './llmClient.js';
import { JARVIS_SYSTEM_PROMPT } from './jarvisPersona.js';
import { assembleContext } from './contextBuilder.js';
import { buildExecutionPlan } from './executionGraph.js';
import { listTools, hasTool } from './toolRegistry.js';
import { JarvisInputSchema, JarvisTurnSchema } from './jarvisContracts.js';
import { getTool } from './toolRegistry.js';

const TURN_SCHEMA = JarvisTurnSchema;

function parseJson(raw) {
  try { return JSON.parse(raw); } catch {}
  const cleaned=String(raw).replace(/^\s*\`\`\`json/i,'').replace(/\`\`\`\s*$/,'').trim();
  return JSON.parse(cleaned);
}

function buildSystemPrompt() {
  const tools=listTools().map(t=>({name:t.name,description:t.description,riskLevel:t.riskLevel,requiresConfirmation:t.requiresConfirmation})).map(JSON.stringify).join('\n');
  return [JARVIS_SYSTEM_PROMPT,
    '',
    'UNIVERSAL ORCHESTRATOR CONTRACT',
    'Return JSON only.',
    'Never invent a tool. Select only from the registry below.',
    'The application is the execution authority; do not claim mutation until execution succeeds.',
    'When required information is missing, return a clarification and no actions.',
    'Use dependsOn for dependencies. Independent actions may have empty dependsOn and will run concurrently.',
    'For destructive or risk-marked tools, the application confirmation engine decides whether execution can proceed.',
    'Tool registry:', tools].join('\n');
}

export async function understandJarvisInput(input, { conversation = [], surface = 'global', signal } = {}) {
  const validated=JarvisInputSchema.parse(input);
  const contextText=await assembleContext('chat', validated.text);
  const messages=[
    {role:'system',content:buildSystemPrompt()},
    {role:'system',content:`Surface: ${surface}\nRelevant context:\n${contextText}`},
    ...conversation.filter(m=>['user','assistant'].includes(m.role)).slice(-24).map(m=>({role:m.role,content:String(m.content||'')})),
    {role:'user',content:validated.text},
  ];
  const raw=await queryLLM(messages,{jsonMode:true,temperature:0.1,intent:'jarvis_orchestrate',conversationId:validated.conversationId||null,requestId:validated.id,signal,messages});
  const parsed=TURN_SCHEMA.parse(parseJson(raw));
  const unknown=parsed.actions.filter(a=>!hasTool(a.tool));
  if(unknown.length) throw new Error(`Model requested unsupported tools: ${unknown.map(a=>a.tool).join(', ')}`);
  const plan=parsed.actions.length?buildExecutionPlan({inputId:validated.id,actions:parsed.actions}):null;
  return {input:validated,turn:parsed,plan};
}

export function summarizeExecution(result) {
  if (!result?.plan) return result?.turn?.message || 'No actions were executed.';
  const actions=result.plan.actions;
  const completed=actions.filter(a=>a.status==='completed').length;
  const failed=actions.filter(a=>a.status==='failed').length;
  const blocked=actions.filter(a=>a.status==='blocked').length;
  if(failed || blocked) return `${completed} action(s) completed. ${failed} failed and ${blocked} blocked.`;
  return `${completed} action(s) completed.`;
}
