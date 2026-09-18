import React from 'react';
import ReactDOM from 'react-dom/client';
import VoteScreen from './screens/Vote';
import './screens/Vote/vote.css';

// Trang nộp bài đã đóng — chỉ còn trang bình chọn. "/binh-chon/mobile" (link
// cũ đã chia sẻ) dùng chung giao diện vì trang nay đã thiết kế cho điện thoại.
// Mọi đường dẫn khác chuyển về /binh-chon (vercel.json xử lý trên production;
// đoạn này là lưới an toàn cho local dev).
const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

if (pathname !== '/binh-chon' && pathname !== '/binh-chon/mobile') {
  window.location.replace('/binh-chon');
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <VoteScreen />
    </React.StrictMode>,
  );
}
