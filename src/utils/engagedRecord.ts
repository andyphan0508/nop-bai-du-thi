// Mỗi tài khoản Google chỉ dùng được 1 lượt (1 React + 1 bình luận) — dấu vết
// phía trình duyệt, DÙNG CHUNG giữa /binh-chon (desktop) và /binh-chon/mobile
// để 1 máy không "lách" bằng cách đổi qua lại 2 trang. Chặn thật sự vẫn nằm ở
// server (mỗi tài khoản Google chỉ ghi được 1 lượt, xem apps-script/Code.gs).
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

export const writeEngagedRecord = (record: EngagedRecord): void => {
  localStorage.setItem(ENGAGED_STORAGE_KEY, JSON.stringify(record));
};
