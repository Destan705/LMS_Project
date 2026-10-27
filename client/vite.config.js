import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, the React app runs on port 3000 and the API on port 3001.
// The proxy forwards every /api request to the API, so the browser thinks both
// come from the same address. That keeps the login cookie working and avoids CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
