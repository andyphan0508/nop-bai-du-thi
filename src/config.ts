// ====================== CẤU HÌNH ======================
// Dán URL Web App của Apps Script vào đây (kết thúc bằng /exec)
export const ENDPOINT = 'PASTE_APPS_SCRIPT_WEB_APP_URL';

// Bật ô "Mã dự thi" nếu Apps Script có đặt ACCESS_CODE
export const REQUIRE_CODE = false;

// Giới hạn dung lượng upload trực tiếp (phải khớp MAX_FILE_MB trong Code.gs)
export const MAX_UPLOAD_MB = 45;
// ======================================================

export const IS_CONFIGURED = Boolean(ENDPOINT) && !ENDPOINT.startsWith('PASTE_');
