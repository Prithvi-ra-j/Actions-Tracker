import fs from 'node:fs/promises';
let r={};try{r=JSON.parse(await fs.readFile('test-results/playwright.json','utf8'));}catch{}
const failures=[];function walk(s){for(const x of s.specs||[])for(const t of x.tests||[])for(const q of t.results||[])if(q.status==='failed')failures.push({title:x.title,error:q.error?.message||'unknown'});for(const x of s.suites||[])walk(x);}
for(const s of r.suites||[])walk(s);
const clusters={};for(const f of failures){const k=f.error.replace(/\d+/g,'N').slice(0,180);(clusters[k]??=[]).push(f.title);}
await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/failure-clusters.json',JSON.stringify({generatedAt:new Date().toISOString(),clusters},null,2));console.log('failure clusters:',Object.keys(clusters).length);