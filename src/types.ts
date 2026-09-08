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
  // Mã định danh ổn định (= thời gian nộp) — dùng khi gửi phiếu bầu
  id: string;
  name: string;
  group: string;
  title: string;
  entryType: string;
  members: string[];
  imageFileId: string;
};

export type VoteEntryListResponse = {
  ok: boolean;
  error?: string;
  count?: number;
  entries?: VoteEntry[];
};

export type VotePayload = {
  entryId: string;
  voterName: string;
  voterPhone: string;
  // Chống spam: field ẩn (honeypot) + số ms đã trôi qua kể từ khi tải trang.
  // Đo hoàn toàn ở phía trình duyệt (không gửi mốc thời gian thô) để tránh lệch
  // đồng hồ giữa máy người dùng và server làm từ chối oan người bình chọn thật.
  hp: string;
  elapsedMs: number;
};

export type VoteResponse = {
  ok: boolean;
  error?: string;
};

export type VoteResult = {
  id: string;
  name: string;
  group: string;
  title: string;
  votes: number;
};

export type VoteResultsResponse = {
  ok: boolean;
  error?: string;
  totalVotes?: number;
  results?: VoteResult[];
};
