import { test as base, expect } from '@playwright/test';
import { createTestLab } from '../testlab/playwrightLab.js';

export const test = base.extend({
  testLabScenario: [null, { option: true }],
  testLab: async ({ page, testLabScenario }, use, testInfo) => {
    if (!testLabScenario) {
      throw new Error('This test requested testLab but did not declare testLabScenario.');
    }

    const lab = createTestLab({ page, testInfo, scenario: testLabScenario });
    await lab.start();
    try {
      await use(lab);
    } finally {
      await lab.finish();
    }
  },
});

export { expect };
