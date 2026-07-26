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
