// Mã định danh thiết bị/trình duyệt — thay cho tài khoản Google đã bỏ. Sinh 1
// lần rồi lưu vĩnh viễn trong localStorage, gửi kèm mỗi lượt bình chọn để
// server (Code.gs handleEngage) băm + đối chiếu, chặn CÙNG 1 THIẾT BỊ dùng
// quá 1 lượt React + bình luận.
// LƯU Ý: đây KHÔNG phải danh tính xác thực — chỉ chặn ở mức thiết bị, xoá dữ
// liệu trình duyệt hoặc dùng máy/trình duyệt khác vẫn tạo được ID mới (đánh
// đổi chấp nhận được khi bỏ yêu cầu đăng nhập).
const DEVICE_ID_KEY = "nbdt-device-id";

const randomId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export const getDeviceId = (): string => {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return randomId();
  }
};
