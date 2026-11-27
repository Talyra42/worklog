import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  // Supabase adds ~150 kB gzip to the main bundle; keep the build log quiet.
  build: { chunkSizeWarningLimit: 600 },
})
