import { test,expect } from '@playwright/test';
import { validateScenario,mutateInput,mutatePath } from '../../framework/index.js';

test('scenario contract rejects incomplete input',()=>expect(()=>validateScenario({scenario_id:'bad'})).toThrow());
test('mutators are deterministic',()=>expect(mutateInput('goal',['whitespace','casing'])).toBe(mutateInput('goal',['whitespace','casing'])));
test('direct path mutation preserves steps',()=>{
  const s=[{id:'a',action:'wait',value:1},{id:'b',action:'wait',value:1}];
  expect(mutatePath(s,'direct')).toHaveLength(2);
});