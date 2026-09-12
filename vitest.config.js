import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration — separate from vite.config.js so it doesn't pollute
 * the browser build with test-only settings.
 *
 * Environment: 'node' — the stats engine, quest derivation, and all helpers
 * are pure JS functions with no DOM/IndexedDB dependency.
 * Tests that require DOM (none planned yet) can opt in per-file with:
 *   // @vitest-environment jsdom
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/helpers/**', 'src/database/questBoardRepository.js'],
      reporter: ['text', 'lcov'],
    },
    // Ensure imports of src/ files work without bundling React/DOM
    // Pure helpers have no JSX so this is fine.
  },
});
