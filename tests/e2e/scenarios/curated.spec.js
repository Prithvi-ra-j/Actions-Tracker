import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {runScenario} from '../../framework/index.js';

test('curated real-world scenarios execute within their budgets',async({page})=>{
  const data=JSON.parse(await fs.readFile('tests/scenarios/curated/core-real-world.json','utf8'));
  for(const scenario of data.scenarios){
    const result=await runScenario(page,scenario);
    expect(result.durationMs).toBeLessThanOrEqual(scenario.budgets.maxMs);
  }
});