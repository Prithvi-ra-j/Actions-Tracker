import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { test as base } from '@playwright/test';

export const PERSONAS={
  ideal:{errorRate:.02,persistence:.95,exploration:.10},
  rushed:{errorRate:.18,persistence:.55,exploration:.20},
  confused:{errorRate:.35,persistence:.35,exploration:.55},
  checkboxGamer:{errorRate:.08,persistence:.80,exploration:.05},
  inactive:{errorRate:.04,persistence:.10,exploration:.02}
};

const Step=z.object({
  id:z.string(),
  action:z.enum(['goto','click','fill','press','check','uncheck','select','wait','reload','back','forward','scroll','evaluate','screenshot']),
  target:z.string().optional(),
  value:z.union([z.string(),z.number(),z.boolean()]).optional(),
  timeoutMs:z.number().int().positive().max(60000).optional()
});
export const Scenario=z.object({
  scenario_id:z.string(),version:z.string(),seed:z.number().int().nonnegative(),product:z.literal('actions-tracker'),
  persona:z.string(),objective:z.string().min(10),risk:z.object({level:z.enum(['P0','P1','P2','P3']),score:z.number().min(0).max(100)}),
  preconditions:z.array(z.string()).default([]),steps:z.array(Step).min(1).max(80),invariants:z.array(z.string()).default([]),
  evidence_policy:z.object({screenshotOnStepFailure:z.boolean().default(true),trace:z.enum(['off','on-failure','always']).default('on-failure')}).default({}),
  budgets:z.object({maxSteps:z.number().int().positive().max(80).default(40),maxMs:z.number().int().positive().default(300000),maxLLMCalls:z.number().int().nonnegative().max(10).default(0)}).default({}),
  cleanup:z.array(z.string()).default([])
});
export const validateScenario=input=>Scenario.parse(input);

export const INPUT_MUTATORS={
  whitespace:v=>typeof v==='string'?'  '+v+'  ':v,
  casing:v=>typeof v==='string'?v.split(' ').map((x,i)=>i%2?x.toUpperCase():x.toLowerCase()).join(' '):v,
  unicode:v=>typeof v==='string'?v+' ✓ café':v,
  punctuation:v=>typeof v==='string'?v+'?!...,':v,
  empty:()=>'', long:v=>typeof v==='string'?v.repeat(50).slice(0,2000):v,
  injectionProbe:v=>typeof v==='string'?'<img src=x onerror="window.__xss_probe()">':v
};
export const mutateInput=(v,names=['whitespace','casing','unicode'])=>names.reduce((x,n)=>INPUT_MUTATORS[n](x),v);

export const PATH_MUTATORS={
  direct:s=>s,
  reloadBetween:s=>s.flatMap((x,i)=>i?[{id:x.id+'-reload',action:'reload'},x]:[x]),
  interrupt:s=>s.flatMap((x,i)=>i===1?[{id:'interrupt-scroll',action:'scroll',value:600},x]:[x]),
  backForward:s=>s.length>2?[s[0],{id:'back',action:'back'},{id:'forward',action:'forward'},...s.slice(1)]:s
};
export const mutatePath=(steps,mode='direct')=>structuredClone(PATH_MUTATORS[mode](steps));

export async function snapshot(page){
  return page.evaluate(async()=>{
    const local={};
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);local[k]=localStorage.getItem(k);}
    let db=[];
    try{if(indexedDB.databases)db=(await indexedDB.databases()).map(x=>({name:x.name,version:x.version}));}catch{}
    return {url:location.href,title:document.title,local,db};
  });
}
export const diff=(a,b)=>({urlChanged:a.url!==b.url,storageChanged:[...new Set([...Object.keys(a.local),...Object.keys(b.local)])].filter(k=>a.local[k]!==b.local[k]),dbChanged:JSON.stringify(a.db)!==JSON.stringify(b.db)});
export async function assertSafeShell(page){
  await page.locator('body').waitFor({state:'visible'});
  await expectTextNot(page,/vite|failed to compile|internal server error/i);
  const body=(await page.locator('body').innerText()).toLowerCase();
  if(/service_role|supabase_anon_key|bearer\\s+[a-z0-9._-]{20,}/i.test(body))throw new Error('Possible credential leakage in rendered UI');
}
async function expectTextNot(page,re){if(re.test(await page.locator('body').innerText()))throw new Error('Critical error text rendered: '+re);}
export async function runScenario(page,raw){
  const s=validateScenario(raw),start=Date.now();
  if(s.steps.length>s.budgets.maxSteps)throw new Error('Step budget exceeded');
  for(const step of s.steps){
    if(Date.now()-start>s.budgets.maxMs)throw new Error('Time budget exceeded');
    if(step.action==='goto')await page.goto(String(step.value??'/'));
    else if(step.action==='click')await page.getByRole('button',{name:new RegExp(step.target||'.*','i')}).first().click();
    else if(step.action==='fill')await page.locator(step.target).first().fill(String(step.value??''));
    else if(step.action==='press')await page.locator(step.target).first().press(String(step.value));
    else if(step.action==='wait')await page.waitForTimeout(Number(step.value||250));
    else if(step.action==='reload')await page.reload();
    else if(step.action==='back')await page.goBack().catch(()=>{});
    else if(step.action==='forward')await page.goForward().catch(()=>{});
    else if(step.action==='scroll')await page.mouse.wheel(0,Number(step.value||500));
    else if(step.action==='screenshot')await page.screenshot({path:path.resolve('test-results','evidence',s.scenario_id+'.png'),fullPage:true});
    else if(step.action==='evaluate')await page.evaluate(String(step.value||'undefined'));
  }
  return {scenarioId:s.scenario_id,durationMs:Date.now()-start};
}
export async function applyFault(page,name){
  if(name==='offline')await page.context().setOffline(true);
  if(name==='slow3g')await page.route('**/*',async r=>{await new Promise(x=>setTimeout(x,1200));await r.continue();});
  if(name==='flaky')await page.route('**/*',async r=>Math.random()<.08?r.abort():r.continue());
}
export async function evidence(testInfo,payload){
  const dir=path.resolve('test-results','evidence');await fs.mkdir(dir,{recursive:true});
  const file=path.join(dir,testInfo.project.name+'-'+testInfo.testId+'.json');
  await fs.writeFile(file,JSON.stringify(payload,null,2));await testInfo.attach('evidence',{path:file,contentType:'application/json'});
}
export const test=base.extend({
  realUser:async({page},use,testInfo)=>{
    const before=await snapshot(page),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await use({page});
    const after=await snapshot(page);
    await evidence(testInfo,{before,after,diff:diff(before,after),pageErrors:errors});
  }
});