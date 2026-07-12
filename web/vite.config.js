import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base must match the GitHub repo name for gh-pages routing to work correctly
export default defineConfig({
  plugins: [react()],
  base: '/ayu-disha/',
})
