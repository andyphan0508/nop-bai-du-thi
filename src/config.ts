// ====================== CẤU HÌNH ======================
// Dán URL Web App của Apps Script vào đây (kết thúc bằng /exec)
export const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzRljV3ngDtWnn5k_TQCXBE4IPzcAMsPqek7sXNaLPMgEWrHbzdbhfCXDvI0DAXkfbu/exec";
// Giới hạn dung lượng upload trực tiếp (phải khớp MAX_FILE_MB trong Code.gs)
export const MAX_UPLOAD_MB = 100;
// Ngày kết thúc nhận bài — sau ngày này form nộp bài sẽ đóng, thay bằng lời cảm ơn
export const CONTEST_END_DATE = "2026-08-29";

// --- Chống spam khi bình chọn (trang /binh-chon) ---
// Google Sign-In: bắt buộc đăng nhập Google thật trước khi gửi phiếu — chặn
// kiểu mở ẩn danh (incognito) rồi bịa SĐT khác để bình chọn nhiều lần.
// Tạo Client ID tại https://console.cloud.google.com/apis/credentials
// (APIs & Services → Credentials → Create Credentials → OAuth client ID →
// Web application → Authorized JavaScript origins: dán domain trang web).
export const GOOGLE_CLIENT_ID = "PASTE_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

// reCAPTCHA v3 (vô hình, chấm điểm hành vi giống người/bot) — thêm 1 lớp
// chặn spam nữa. Tạo Site Key tại https://www.google.com/recaptcha/admin
export const RECAPTCHA_SITE_KEY = "PASTE_RECAPTCHA_SITE_KEY";
// ======================================================

export const IS_CONFIGURED =
  Boolean(ENDPOINT) && !ENDPOINT.startsWith("PASTE_");

// Trang bình chọn chỉ bật đăng nhập Google + reCAPTCHA khi cả 2 đã được cấu
// hình — xem HUONG-DAN.md mục "Bình chọn" để biết cách tạo.
export const IS_VOTE_AUTH_CONFIGURED =
  Boolean(GOOGLE_CLIENT_ID) &&
  !GOOGLE_CLIENT_ID.startsWith("PASTE_") &&
  Boolean(RECAPTCHA_SITE_KEY) &&
  !RECAPTCHA_SITE_KEY.startsWith("PASTE_");
