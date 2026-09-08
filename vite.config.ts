import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base '/' (tuyệt đối): bắt buộc phải tuyệt đối vì trang có nhiều route con
// (/binh-chon, /binh-chon/mobile...) — dùng './' (tương đối) sẽ tính sai
// đường dẫn asset tuỳ theo route đang đứng sâu bao nhiêu cấp, gây lỗi
// "MIME type text/html" khi tải index.tsx ở các route nhiều cấp như
// /binh-chon/mobile. Chỉ cần domain gốc (Vercel/Netlify) là được, không
// dùng để deploy vào 1 subfolder.
export default defineConfig({
  plugins: [react()],
  base: '/',
});
