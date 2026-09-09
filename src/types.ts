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

export type VoteEntry = {
  // Mã định danh ổn định (= thời gian nộp) — dùng khi gửi phiếu bầu.
  // CỐ Ý không có "name"/"members" — server không trả tên thí sinh ở đây để
  // giữ bình chọn khách quan (xem apps-script/Code.gs handleVoteEntries).
  id: string;
  group: string;
  title: string;
  entryType: string;
  description: string;
  imageFileId: string;
};

export type VoteEntryListResponse = {
  ok: boolean;
  error?: string;
  count?: number;
  entries?: VoteEntry[];
};

// Mỗi người (tài khoản Google) có đúng 1 lượt React (2 điểm) + 1 lượt bình
// luận (1 điểm), dùng 1 lần duy nhất cho cả 2 lựa chọn cùng lúc — có thể bỏ
// trống 1 trong 2 (hoặc cả 2 id để trống nếu chỉ dùng 1 lượt). entryId để
// trống ('') nghĩa là không dùng lượt đó.
export type EngagePayload = {
  reactEntryId: string;
  commentEntryId: string;
  commentText: string;
  // Danh tính thật của người tương tác: JWT ID token từ Google Sign-In —
  // server xác minh chữ ký/aud rồi mới tính điểm (xem Code.gs
  // verifyGoogleIdToken). Đây là chốt chặn chính chống mở ẩn danh tương tác
  // nhiều lần, thay cho việc tự khai SĐT trước đây (dễ bịa số khác).
  googleIdToken: string;
  // Token reCAPTCHA v3 — thêm 1 lớp chấm điểm hành vi người/bot.
  recaptchaToken: string;
  // Chống spam bổ sung: field ẩn (honeypot) + số ms đã trôi qua kể từ khi tải
  // trang, đo hoàn toàn ở phía trình duyệt để tránh lệch đồng hồ với server.
  hp: string;
  elapsedMs: number;
};

export type EngageResponse = {
  ok: boolean;
  error?: string;
};

// Bình luận công khai theo từng bài dự thi (ẩn danh — không kèm tên người
// bình luận), dùng để hiển thị lời khích lệ ngay trên trang bình chọn.
export type EntryCommentsMap = Record<string, string[]>;

export type CommentsResponse = {
  ok: boolean;
  error?: string;
  comments?: EntryCommentsMap;
};

export type VoteResult = {
  id: string;
  name: string;
  group: string;
  title: string;
  points: number;
  reactCount: number;
  commentCount: number;
};

export type VoteResultsResponse = {
  ok: boolean;
  error?: string;
  totalPoints?: number;
  results?: VoteResult[];
};

export type VoteRankedEntry = {
  id: string;
  title: string;
  group: string;
  points: number;
  reactCount: number;
  commentCount: number;
  imageFileId?: string;
};

export type VoteStats = {
  totalEntries: number;
  totalVoters: number;
  totalReacts: number;
  totalComments: number;
  totalPoints: number;
  groupBreakdown: Record<string, { entries: number; points: number }>;
  rankedEntries: VoteRankedEntry[];
};

export type VoteStatsResponse = {
  ok: boolean;
  error?: string;
  stats?: VoteStats;
};
