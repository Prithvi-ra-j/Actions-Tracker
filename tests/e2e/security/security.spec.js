import { test,expect } from '@playwright/test';

test('safe XSS probe never executes',async({page})=>{
  let fired=false;
  await page.exposeFunction('xssProbe',()=>{fired=true});
  await page.goto('/');
  const fields=page.locator('input,textarea,[contenteditable="true"]');
  for(let i=0;i<Math.min(await fields.count(),8);i++){
    const f=fields.nth(i);
    if(await f.isEditable().catch(()=>false))await f.fill('<img src=x onerror="xssProbe()">').catch(()=>{});
  }
  await page.waitForTimeout(400);
  expect(fired).toBe(false);
});
test('rendered UI does not expose common credential patterns',async({page})=>{
  await page.goto('/');
  const body=await page.locator('body').innerText();
  expect(body).not.toMatch(/service_role|supabase_anon_key|bearer\\s+[a-z0-9._-]{20,}/i);
});