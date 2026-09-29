import fs from 'node:fs/promises';
const map=JSON.parse(await fs.readFile('tests/scenarios/capability-map.json','utf8'));
let titles=[];
try{const r=JSON.parse(await fs.readFile('test-results/playwright.json','utf8')); const walk=s=>[...(s.specs||[]).map(x=>x.title),...(s.suites||[]).flatMap(walk)]; titles=(r.suites||[]).flatMap(walk);}catch{}
const rows=map.capabilities.map(c=>({id:c.id,risk:c.risk,covered:titles.some(t=>t.includes(c.id))}));
const out={generatedAt:new Date().toISOString(),total:rows.length,covered:rows.filter(x=>x.covered).length,rows};
await fs.mkdir('test-results',{recursive:true}); await fs.writeFile('test-results/coverage.json',JSON.stringify(out,null,2)); console.log(JSON.stringify(out,null,2));