import React from 'react';
import ReactDOM from 'react-dom/client';
import VoteScreen from './screens/Vote';
import VoteMobileScreen from './screens/VoteMobile';
import './styles/global.css';

// Trang nộp bài đã đóng — không render nữa. "/" (và mọi đường dẫn lạ) tự
// chuyển sang trang bình chọn. Redirect ở tầng server (vercel.json) đã xử lý
// hầu hết trường hợp trên production; đoạn này là lưới an toàn cho local dev
// (vite dev server không đọc vercel.json) và tránh nạp/tải bundle Submit
// screen không cần dùng nữa (giảm dung lượng JS tải về).
const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
const isVoteMobilePage = pathname === '/binh-chon/mobile';
const isVotePage = pathname === '/binh-chon';

if (!isVotePage && !isVoteMobilePage) {
  window.location.replace('/binh-chon');
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>{isVoteMobilePage ? <VoteMobileScreen /> : <VoteScreen />}</React.StrictMode>,
  );
}
