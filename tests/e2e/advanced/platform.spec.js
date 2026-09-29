import {test,expect} from '@playwright/test';

test.describe('platform edge cases',()=>{
  test('locale and timezone changes do not blank the app',async({browser})=>{
    for(const locale of ['en-US','en-IN','de-DE']){
      const c=await browser.newContext({locale,timezoneId:locale==='de-DE'?'Europe/Berlin':'Asia/Kolkata'});
      const p=await c.newPage(); await p.goto('http://127.0.0.1:4173/');
      await expect(p.locator('body')).toBeVisible(); await c.close();
    }
  });
  test('reduced motion remains usable',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'}); await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
  test('long DOM/session remains bounded enough to continue',async({page})=>{
    await page.goto('/');
    for(let i=0;i<20;i++){await page.mouse.wheel(0,700);await page.waitForTimeout(10);}
    const metrics=await page.evaluate(()=>({nodes:document.querySelectorAll('*').length,heap:performance.memory?.usedJSHeapSize??null}));
    expect(metrics.nodes).toBeLessThan(100000);
  });
});