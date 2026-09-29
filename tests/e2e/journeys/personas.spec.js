import { expect } from '@playwright/test';
import { test,PERSONAS,snapshot } from '../../framework/index.js';

for(const [name,persona] of Object.entries(PERSONAS)){
  test(name+' persona survives a realistic session',async({page},info)=>{
    info.annotations.push({type:'persona',description:JSON.stringify(persona)});
    await page.goto('/');
    for(let i=0;i<Math.max(2,Math.round(5*(1+persona.exploration)));i++){
      if(i%2===0)await page.mouse.wheel(0,600);
      if(i%3===0)await page.keyboard.press('Tab');
      if(i%4===0)await page.reload();
      await page.waitForTimeout(50);
    }
    await expect(page.locator('body')).toBeVisible();
    await snapshot(page);
  });
}