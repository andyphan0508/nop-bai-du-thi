// Số từ tối thiểu của 1 bình luận — chặn kiểu spam "hay quá", "đẹp", yêu cầu
// viết cảm nhận thật. PHẢI khớp COMMENT_MIN_WORDS trong apps-script/Code.gs
// (đây chỉ là kiểm tra phía trình duyệt để phản hồi ngay; chốt chặn thật nằm
// ở server).
export const COMMENT_MIN_WORDS = 20;

export const countWords = (text: string): number => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
};
