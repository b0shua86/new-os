import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 5173 is Vite's default; PromptOS uses 5180 to avoid common conflicts.
    // Vite still auto-falls-back to the next free port if 5180 is taken.
    port: 5180,
    host: true,
  },
});
