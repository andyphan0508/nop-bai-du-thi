import { ENDPOINT } from "../config";
import type {
  CommentsResponse,
  EngagePayload,
  EngageResponse,
  EntryListResponse,
  SubmitPayload,
  SubmitResponse,
  VoteEntryListResponse,
  VoteResultsResponse,
} from "../types";

const getEntryList = async (): Promise<EntryListResponse> => {
  const response = await fetch(`${ENDPOINT}?action=list`);
  return (await response.json()) as EntryListResponse;
};

const getVoteEntries = async (): Promise<VoteEntryListResponse> => {
  const response = await fetch(`${ENDPOINT}?action=voteEntries`);
  return (await response.json()) as VoteEntryListResponse;
};

// URL ảnh bìa 1 bài dự thi — dùng thẳng link thumbnail công khai của Google
// Drive (Apps Script Web App không hỗ trợ trả blob ảnh trực tiếp từ doGet).
// Ảnh chỉ hiển thị được nếu file đã bật chia sẻ "Anyone with link" — bài nộp
// mới tự bật khi nộp (xem Code.gs doPost); bài nộp cũ cần chạy 1 lần
// ?action=fixImageSharing&key=ADMIN_KEY (xem HUONG-DAN.md).
const voteImageUrl = (fileId: string, width = 800): string => {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
};

const submitEngagement = async (payload: EngagePayload): Promise<EngageResponse> => {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "engage", ...payload }),
  });
  return (await response.json()) as EngageResponse;
};

// Bình luận công khai của TẤT CẢ bài dự thi, gộp theo entryId — tải 1 lần
// cho cả trang thay vì gọi riêng từng bài.
const getComments = async (): Promise<CommentsResponse> => {
  const response = await fetch(`${ENDPOINT}?action=comments`);
  return (await response.json()) as CommentsResponse;
};

const getVoteResults = async (adminKey: string): Promise<VoteResultsResponse> => {
  const response = await fetch(
    `${ENDPOINT}?action=voteResults&key=${encodeURIComponent(adminKey)}`,
  );
  return (await response.json()) as VoteResultsResponse;
};

// POST bằng XHR, Content-Type text/plain để giữ dạng "simple request".
// LƯU Ý: không được gắn listener vào xhr.upload — chỉ cần có listener ở đó
// là trình duyệt bắt buộc gửi preflight OPTIONS, mà Apps Script không trả lời
// OPTIONS nên request sẽ chết vì CORS. Vì vậy % tiến trình được mô phỏng
// theo dung lượng payload thay vì đo thật.
const ASSUMED_UPLOAD_BYTES_PER_SEC = 1.5 * 1024 * 1024;

const postSubmission = (
  payload: SubmitPayload,
  onProgress: (ratio: number) => void,
): Promise<SubmitResponse> => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const expectedMs = Math.max(
      800,
      (body.length / ASSUMED_UPLOAD_BYTES_PER_SEC) * 1000,
    );
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      onProgress(Math.min(elapsed / expectedMs, 0.95));
    }, 200);
    const finish = () => window.clearInterval(timer);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", ENDPOINT);
    xhr.setRequestHeader("Content-Type", "text/plain;charset=utf-8");
    xhr.addEventListener("load", () => {
      finish();
      onProgress(1);
      try {
        resolve(JSON.parse(xhr.responseText) as SubmitResponse);
      } catch {
        reject(new Error("Phản hồi máy chủ không hợp lệ."));
      }
    });
    xhr.addEventListener("error", () => {
      finish();
      reject(new Error("Lỗi mạng, vui lòng thử lại."));
    });
    xhr.send(body);
  });
};

// Xoá 1 bài (chỉ quản trị viên): server đối chiếu tên trên dòng trước khi xoá,
// dòng bị xoá được chuyển sang sheet "Đã xoá" chứ không mất hẳn.
const deleteEntry = async (
  row: number,
  name: string,
  adminKey: string,
): Promise<SubmitResponse> => {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "delete", row, name, adminKey }),
  });
  return (await response.json()) as SubmitResponse;
};

export const submissionApi = {
  getEntryList,
  postSubmission,
  deleteEntry,
  getVoteEntries,
  voteImageUrl,
  submitEngagement,
  getComments,
  getVoteResults,
};
