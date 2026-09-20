// ====================== CẤU HÌNH ======================
// Dán URL Web App của Apps Script vào đây (kết thúc bằng /exec)
export const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzRljV3ngDtWnn5k_TQCXBE4IPzcAMsPqek7sXNaLPMgEWrHbzdbhfCXDvI0DAXkfbu/exec";
// Giới hạn dung lượng upload trực tiếp (phải khớp MAX_FILE_MB trong Code.gs)
export const MAX_UPLOAD_MB = 100;
// Ngày kết thúc nhận bài — sau ngày này form nộp bài sẽ đóng, thay bằng lời cảm ơn
export const CONTEST_END_DATE = "2026-08-29";

// --- Chống spam khi bình chọn (trang /binh-chon) ---
// Không dùng đăng nhập tài khoản (đã bỏ Google Sign-In) — mỗi thiết bị được
// gán 1 mã ngẫu nhiên tự sinh, lưu localStorage (xem utils/deviceId.ts), gửi
// kèm mỗi lượt bình chọn để server chặn CÙNG 1 THIẾT BỊ dùng quá 1 lượt.
//
// reCAPTCHA v3 (vô hình, chấm điểm hành vi giống người/bot) vẫn giữ làm lớp
// chặn spam chính. Tạo Site Key tại https://www.google.com/recaptcha/admin
export const RECAPTCHA_SITE_KEY = "PASTE_RECAPTCHA_SITE_KEY";
// ======================================================

// Đã kết thúc bình chọn → trang chỉ còn lời cảm ơn, không cho gửi phiếu nữa.
// Mở lại đợt bình chọn mới: đổi thành false (và đổi VOTING_OPEN trong Code.gs).
export const VOTING_CLOSED = true;

export const IS_CONFIGURED =
  Boolean(ENDPOINT) && !ENDPOINT.startsWith("PASTE_");

// Có bật lớp chống bot reCAPTCHA hay không. CHƯA cấu hình thì trang vẫn bình
// chọn bình thường (bỏ qua bước lấy token, máy chủ cũng tự bỏ qua kiểm tra) —
// vẫn còn honeypot, chặn gửi quá nhanh và giới hạn 1 lượt/thiết bị. Dán đủ
// Site Key ở đây + Secret Key trong Code.gs để bật thêm lớp này.
export const IS_VOTE_AUTH_CONFIGURED =
  Boolean(RECAPTCHA_SITE_KEY) && !RECAPTCHA_SITE_KEY.startsWith("PASTE_");
