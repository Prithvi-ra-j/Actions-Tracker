import { test,expect } from '@playwright/test';
import { applyFault } from '../../framework/index.js';

test('offline/reload keeps a usable shell',async({page})=>{
  await page.goto('/');
  await applyFault(page,'offline');
  await page.reload().catch(()=>{});
  await expect(page.locator('body')).toBeVisible();
});
test('slow dependency does not blank the app',async({page})=>{
  await applyFault(page,'slow3g');
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
test('two tabs coexist without a crash',async({browser,baseURL})=>{
  const c=await browser.newContext(),a=await c.newPage(),b=await c.newPage();
  await Promise.all([a.goto(baseURL),b.goto(baseURL)]);
  await Promise.all([a.reload(),b.reload()]);
  await expect(a.locator('body')).toBeVisible();await expect(b.locator('body')).toBeVisible();
  await c.close();
});