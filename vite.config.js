import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { APP_VERSION } from './src/version.js';

export default defineConfig({
  plugins: [react()],
  define: {
    // Keep every UI surface on the same source of truth as the runtime
    // update checker. Do not derive the displayed version from package.json.
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  build: {
    outDir: 'dist',
  },
});