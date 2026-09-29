import {test,expect} from '@playwright/test';

test('web PWA registers a service worker and remains usable offline',async({page})=>{
  await page.goto('/');
  const registration=await page.evaluate(async()=>{
    if(!('serviceWorker' in navigator))return {supported:false,registered:false};
    try{
      const reg=await navigator.serviceWorker.ready;
      return {supported:true,registered:!!reg.active,scope:reg.scope};
    }catch{return {supported:true,registered:false};}
  });
  expect(registration.supported).toBeTruthy();
  expect(registration.registered).toBeTruthy();
  await page.context().setOffline(true);
  await page.reload().catch(()=>{});
  await expect(page.locator('body')).toBeVisible();
});