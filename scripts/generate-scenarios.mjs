import fs from 'node:fs/promises';
const map=JSON.parse(await fs.readFile('tests/scenarios/capability-map.json','utf8'));
const scenarios=map.capabilities.map(c=>({scenario_id:'GENERATED-'+c.id,version:'1.0.0',seed:hash(c.id),product:'actions-tracker',persona:'ideal',objective:'Exercise '+c.id,risk:{level:c.risk,score:c.risk==='P0'?90:c.risk==='P1'?70:40},preconditions:[],steps:[{id:'launch',action:'goto',value:'/'}],invariants:['body visible'],evidence_policy:{screenshotOnStepFailure:true,trace:'on-failure'},budgets:{maxSteps:40,maxMs:180000,maxLLMCalls:0},cleanup:[]}));
await fs.mkdir('tests/scenarios/generated',{recursive:true});
await fs.writeFile('tests/scenarios/generated/capabilities.json',JSON.stringify({generatedAt:new Date().toISOString(),scenarios},null,2));
function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}