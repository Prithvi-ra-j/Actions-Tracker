import {test,expect} from '@playwright/test';

test.describe('Jarvis conversational entry',()=>{
  test('text input accepts natural language without requiring a command form',async({page})=>{
    await page.goto('/');
    const input=page.getByPlaceholder('Ask Jarvis');
    await expect(input).toBeVisible();
    await input.fill('Help me plan my week around my current goals');
    await expect(input).toHaveValue('Help me plan my week around my current goals');
  });
  test('slash command palette opens from the composer',async({page})=>{
    await page.goto('/');
    const input=page.getByPlaceholder('Ask Jarvis');
    await expect(input).toBeVisible();
    await input.fill('/');
    await expect(page.getByText('Commands')).toBeVisible();
  });
});