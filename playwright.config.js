import { defineConfig, devices } from '@playwright/test';
const baseURL=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4173';
export default defineConfig({
  testDir:'./tests/e2e', timeout:60000, expect:{timeout:10000},
  fullyParallel:!process.env.CI, forbidOnly:!!process.env.CI, retries:process.env.CI?1:0,
  reporter:[['list'],['html',{outputFolder:'playwright-report',open:'never'}],['json',{outputFile:'test-results/playwright.json'}]],
  use:{baseURL,actionTimeout:10000,navigationTimeout:30000,trace:'retain-on-failure',screenshot:'only-on-failure',video:'retain-on-failure',serviceWorkers:'allow'},
  webServer:process.env.PLAYWRIGHT_BASE_URL?undefined:{command:'npm run dev -- --host 127.0.0.1 --port 4173',url:baseURL,reuseExistingServer:!process.env.CI,timeout:120000},
  projects:[
    {name:'smoke',testMatch:/.*smoke\.spec\.js/,use:{...devices['Desktop Chrome']}},
    {name:'chromium',testMatch:/.*\.spec\.js/,use:{...devices['Desktop Chrome']}},
    {name:'mobile',testMatch:/.*\\.spec\\.js/,use:{...devices['Galaxy S9+']}},
    {name:'webkit',testMatch:/.*\\.spec\\.js/,use:{...devices['Desktop Safari']}}
  ]
});