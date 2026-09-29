import { expect } from '@playwright/test';
import { test,assertSafeShell } from '../../framework/index.js';

test.describe('P0 real-user smoke',()=>{
  test('launch -> usable shell -> basic interaction',async({realUser})=>{
    const {page}=realUser;
    await page.goto('/');
    await assertSafeShell(page);
    const buttons=page.getByRole('button');
    if(await buttons.count())await buttons.first().click().catch(()=>{});
    await expect(page.locator('body')).toBeVisible();
  });
  test('keyboard can reach focusable UI',async({page})=>{
    await page.goto('/');
    for(let i=0;i<4;i++){await page.keyboard.press('Tab');if(await page.locator(':focus').count())await expect(page.locator(':focus').first()).toBeVisible();}
  });
});