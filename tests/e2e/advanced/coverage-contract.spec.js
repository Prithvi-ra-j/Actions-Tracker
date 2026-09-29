import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('capability map is structurally complete',async()=>{
  const m=JSON.parse(await fs.readFile('tests/scenarios/capability-map.json','utf8'));
  expect(m.capabilities.length).toBeGreaterThanOrEqual(10);
  for(const c of m.capabilities){
    expect(c.id).toBeTruthy(); expect(c.risk).toMatch(/^P[0-3]$/);
    expect(Array.isArray(c.surfaces)).toBeTruthy(); expect(typeof c.destructive).toBe('boolean');
  }
});
test('risk register and failure taxonomy exist',async()=>{
  const risk=JSON.parse(await fs.readFile('tests/scenarios/risk-register.json','utf8'));
  const taxonomy=JSON.parse(await fs.readFile('tests/scenarios/failure-taxonomy.json','utf8'));
  expect(risk.risks.length).toBeGreaterThan(0);
  expect(taxonomy.categories).toEqual(expect.arrayContaining(['security','accessibility','concurrency','pwa-lifecycle','performance']));
});