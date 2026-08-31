// ====================== CẤU HÌNH ======================
// Dán URL Web App của Apps Script vào đây (kết thúc bằng /exec)
export const ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzRljV3ngDtWnn5k_TQCXBE4IPzcAMsPqek7sXNaLPMgEWrHbzdbhfCXDvI0DAXkfbu/exec";
// Giới hạn dung lượng upload trực tiếp (phải khớp MAX_FILE_MB trong Code.gs)
export const MAX_UPLOAD_MB = 100;
// Ngày kết thúc nhận bài — sau ngày này form nộp bài sẽ đóng, thay bằng lời cảm ơn
export const CONTEST_END_DATE = "2026-08-29";
// ======================================================

export const IS_CONFIGURED =
  Boolean(ENDPOINT) && !ENDPOINT.startsWith("PASTE_");
