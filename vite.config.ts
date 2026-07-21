import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' để build chạy được ở mọi đường dẫn (Netlify Drop, subfolder...)
export default defineConfig({
  plugins: [react()],
  base: './',
});
