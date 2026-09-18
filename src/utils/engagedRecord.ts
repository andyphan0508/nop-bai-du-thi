// Mỗi thiết bị chỉ dùng được 1 lượt (1 React + 1 bình luận) — dấu vết phía
// trình duyệt, DÙNG CHUNG giữa /binh-chon (desktop) và /binh-chon/mobile để 1
// máy không "lách" bằng cách đổi qua lại 2 trang. Chặn thật sự vẫn nằm ở
// server (mỗi mã thiết bị chỉ ghi được 1 lượt, xem apps-script/Code.gs).
const ENGAGED_STORAGE_KEY = "nbdt-da-tuong-tac";

export type EngagedRecord = {
  reactedTitle: string | null;
  commentedTitle: string | null;
  at: string;
};

export const readEngagedRecord = (): EngagedRecord | null => {
  try {
    return JSON.parse(localStorage.getItem(ENGAGED_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

// Máy chủ báo thiết bị CHƯA bình chọn (VD quản trị viên vừa xoá dữ liệu để làm
// lại) → bỏ dấu "đã bình chọn" cũ trong máy, nếu không người dùng kẹt ở màn cảm ơn.
export const clearEngagedRecord = (): void => {
  try {
    localStorage.removeItem(ENGAGED_STORAGE_KEY);
  } catch {
    // Không xoá được thì thôi — lần sau máy chủ vẫn là nguồn quyết định
  }
};

export const writeEngagedRecord = (record: EngagedRecord): void => {
  try {
    localStorage.setItem(ENGAGED_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Trình duyệt chặn lưu trữ (Safari riêng tư, hết dung lượng…) — KHÔNG được
    // để lỗi này ném ra ngoài, vì lúc đó phiếu đã gửi thành công rồi mà người
    // dùng lại nhận thông báo lỗi. Máy chủ vẫn nhớ thiết bị này đã bình chọn.
  }
};
