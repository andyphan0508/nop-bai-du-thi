import { ENDPOINT } from "../config";
import type {
  EngagePayload,
  EngageResponse,
  EntryListResponse,
  SubmitPayload,
  SubmitResponse,
  VotePageResponse,
} from "../types";

const getEntryList = async (): Promise<EntryListResponse> => {
  const response = await fetch(`${ENDPOINT}?action=list&_t=${Date.now()}`, {
    cache: "no-store",
  });
  return (await response.json()) as EntryListResponse;
};

// Phần động của trang bình chọn trong 1 lượt gọi: thứ tự bài (không kèm điểm),
// bình luận, và thiết bị này đã bình chọn chưa. Danh sách bài là snapshot tĩnh
// nên lượt gọi này chạy nền, không chặn trang hiển thị.
const getVotePage = async (deviceId: string): Promise<VotePageResponse> => {
  const response = await fetch(
    `${ENDPOINT}?action=votePage&deviceId=${encodeURIComponent(deviceId)}&_t=${Date.now()}`,
    { cache: "no-store" },
  );
  return (await response.json()) as VotePageResponse;
};

// Gọi rỗng vào endpoint để Apps Script không "ngủ". Google tắt máy chủ khi
// script rảnh một lúc, và lần gọi kế tiếp phải khởi động lại — đo thực tế mất
// 15-18 giây, trong khi lần gọi lúc máy còn thức chỉ ~1,7 giây. Người dùng
// thường ngắm tranh vài phút rồi mới bấm gửi, nên nếu không ping thì đúng lượt
// bấm "Xác nhận" lại là lượt phải chờ khởi động.
const keepServerAwake = (): void => {
  fetch(`${ENDPOINT}?_ping=${Date.now()}`, { cache: "no-store" }).catch(() => {
    // Ping hỏng thì thôi, không phải chức năng người dùng thấy
  });
};

// Số lần gửi lại khi máy chủ báo quá tải — thử lại có giãn cách + lệch ngẫu
// nhiên để 60-70 người không cùng lúc dội ngược lại máy chủ.
const ENGAGE_MAX_ATTEMPTS = 3;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const submitEngagement = async (payload: EngagePayload): Promise<EngageResponse> => {
  let lastError = "Gửi tương tác thất bại.";

  for (let attempt = 1; attempt <= ENGAGE_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "engage", ...payload }),
      });
      const data = (await response.json()) as EngageResponse;
      // Chỉ gửi lại khi máy chủ báo bận; lỗi nội dung (thiếu từ, trùng bài…)
      // gửi lại bao nhiêu lần cũng vậy nên trả về ngay.
      if (data.ok || data.code !== "BUSY") return data;
      lastError = data.error || lastError;
    } catch {
      lastError = "Lỗi mạng, vui lòng thử lại.";
    }
    if (attempt < ENGAGE_MAX_ATTEMPTS) await delay(attempt * 900 + Math.random() * 600);
  }

  return { ok: false, code: "BUSY", error: lastError };
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
  getVotePage,
  submitEngagement,
  keepServerAwake,
};
