import { test,expect } from '@playwright/test';

async function simulate(page,days){
  for(let d=1;d<=days;d++){
    await page.goto('/');
    if(d%3===0)await page.mouse.wheel(0,900);
    if(d%7===0)await page.reload();
    if(d%14===0)await page.keyboard.press('Tab');
    await page.waitForTimeout(8);
  }
}
for(const days of [30,60,90]){
  test(days+'-day compressed longitudinal simulation',async({page})=>{
    await simulate(page,days);
    await expect(page.locator('body')).toBeVisible();
  });
}