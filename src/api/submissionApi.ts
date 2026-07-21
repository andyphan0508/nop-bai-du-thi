import { ENDPOINT } from "../config";
import type {
  EntryListResponse,
  SubmitPayload,
  SubmitResponse,
} from "../types";

const getEntryList = async (): Promise<EntryListResponse> => {
  const response = await fetch(`${ENDPOINT}?action=list`);
  return (await response.json()) as EntryListResponse;
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

export const submissionApi = { getEntryList, postSubmission };
