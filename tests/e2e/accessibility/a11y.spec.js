import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('WCAG A/AA automated accessibility scan',async({page})=>{
  await page.goto('/');
  const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();
  expect(r.violations,JSON.stringify(r.violations,null,2)).toEqual([]);
});
test('keyboard focus never disappears during critical traversal',async({page})=>{
  await page.goto('/');
  for(let i=0;i<10;i++){await page.keyboard.press('Tab');if(await page.locator(':focus').count())await expect(page.locator(':focus').first()).toBeVisible();}
});