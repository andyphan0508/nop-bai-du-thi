export type ContestEntry = {
  time: string;
  name: string;
  group: string;
  title: string;
  entryType: string;
  members: string[];
  // Số dòng thật trong Sheet — chỉ dùng cho chức năng xoá của quản trị viên
  row?: number;
};

export type SubmitFilePayload = {
  name: string;
  mimeType: string;
  data: string;
};

export type SubmitPayload = {
  fullName: string;
  email: string;
  phone: string;
  group: string;
  title: string;
  entryType: string;
  members: string[];
  notes: string;
  sourceLink: string;
  files: SubmitFilePayload[];
};

export type EntryListResponse = {
  ok: boolean;
  error?: string;
  count?: number;
  entries?: ContestEntry[];
};

export type SubmitResponse = {
  ok: boolean;
  error?: string;
  count?: number;
  folderUrl?: string;
  files?: string[];
};

// Bài dự thi — lấy từ snapshot tĩnh src/data/entries.json (npm run snapshot).
export type VoteEntry = {
  // Mã định danh ổn định (= thời gian nộp) — dùng khi gửi phiếu bầu.
  // CỐ Ý không có tên thí sinh/nhóm — giữ bình chọn khách quan.
  id: string;
  title: string;
  entryType: string;
  description: string;
  // Ảnh bìa tự host: thumb ~640px cho danh sách, image ~1600px cho khung chi tiết
  thumb: string;
  image: string;
};

// Bình luận công khai theo từng bài dự thi (ẩn danh), gộp theo entryId.
export type EntryCommentsMap = Record<string, string[]>;

// Phần động của trang bình chọn (?action=votePage). order = mã bài có điểm,
// cao → thấp; máy chủ KHÔNG trả số điểm.
export type VotePageResponse = {
  ok: boolean;
  error?: string;
  order?: string[];
  comments?: EntryCommentsMap;
  voted?: boolean;
};

// Mỗi thiết bị có đúng 1 lượt React (2 điểm) + 1 lượt bình luận (1 điểm),
// dùng 1 lần duy nhất cho cả 2 lựa chọn cùng lúc — có thể bỏ trống 1 trong 2.
// entryId để trống ('') nghĩa là không dùng lượt đó.
export type EngagePayload = {
  reactEntryId: string;
  commentEntryId: string;
  commentText: string;
  // Mã thiết bị do trình duyệt tự sinh (xem utils/deviceId.ts) — server băm +
  // đối chiếu để chặn CÙNG 1 THIẾT BỊ dùng quá 1 lượt.
  deviceId: string;
  recaptchaToken: string;
  // Chống spam: field ẩn (honeypot) + số ms kể từ khi tải trang (đo ở trình duyệt).
  hp: string;
  elapsedMs: number;
};

export type EngageResponse = {
  ok: boolean;
  error?: string;
  //  ALREADY_VOTED — thiết bị đã dùng lượt (chuyển thẳng sang màn "đã bình chọn")
  //  BUSY          — quá tải tạm thời, gửi lại được (tự thử lại)
  code?: "ALREADY_VOTED" | "BUSY";
};
