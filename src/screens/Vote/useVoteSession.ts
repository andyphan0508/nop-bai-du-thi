import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { submissionApi } from "../../api/submissionApi";
import { IS_CONFIGURED } from "../../config";
import { getDeviceId } from "../../utils/deviceId";
import { getRecaptchaToken } from "../../utils/recaptcha";
import {
  readEngagedRecord,
  writeEngagedRecord,
  type EngagedRecord,
} from "../../utils/engagedRecord";
import { COMMENT_MIN_WORDS, countWords } from "../../utils/wordCount";
import type { ToastItem } from "../Submit/components/Toast";
import type { EntryCommentsMap, VoteEntry } from "../../types";
import snapshotEntries from "../../data/entries.json";

// Chỉ ping giữ máy chủ thức khi người dùng ĐANG chọn bài (sắp bấm gửi). Trước
// đây mọi người mở trang đều ping mỗi 2 phút — 70 người là 35 lượt chạy rỗng
// mỗi phút tranh suất chạy đồng thời với lượt gửi thật.
const KEEP_AWAKE_INTERVAL_MS = 120000;

// Bài dự thi + ảnh là snapshot tĩnh (npm run snapshot) đóng thẳng vào bundle
// → trang có bài NGAY khi JS chạy, không chờ Apps Script. Máy chủ chỉ còn trả
// phần động (thứ tự theo điểm, bình luận, đã vote chưa), tải ở nền.
const SNAPSHOT = snapshotEntries as VoteEntry[];

// Nhớ phần động của lần trước để mở lại trang là thấy đúng thứ tự ngay.
const LIVE_CACHE_KEY = "nbdt-vote-live";

type LiveData = { order: string[]; comments: EntryCommentsMap };

const readLiveCache = (): LiveData => {
  try {
    const cached = JSON.parse(localStorage.getItem(LIVE_CACHE_KEY) || "null");
    if (cached?.order && cached?.comments) return cached;
  } catch {
    // Không đọc được bộ nhớ trang → dùng thứ tự nộp bài
  }
  return { order: [], comments: {} };
};

type SubmitArgs = {
  reactEntry: VoteEntry | null;
  commentEntry: VoteEntry | null;
  commentText: string;
  honeypot: string;
};

export const useVoteSession = (hasPendingPick: boolean) => {
  const [live, setLive] = useState<LiveData>(readLiveCache);

  // Máy chủ mới là nguồn quyết định "đã bình chọn"; bản ghi trong máy chỉ để
  // hiện ngay + nhớ tên tác phẩm đã chọn cho biên nhận.
  const [engagedRecord, setEngagedRecord] = useState<EngagedRecord | null>(readEngagedRecord);
  const [hasVoted, setHasVoted] = useState<boolean>(() => Boolean(engagedRecord));

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [engageError, setEngageError] = useState<string | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef<number>(0);
  const pageLoadedAtRef = useRef<number>(Date.now());
  // Lượt gọi votePage lúc mở trang đã đánh thức máy chủ — chưa cần ping ngay.
  const lastPingAtRef = useRef<number>(Date.now());

  const showToast = useCallback((message: string, type: ToastItem["type"] = "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    if (!IS_CONFIGURED) return;
    submissionApi
      .getVotePage(getDeviceId())
      .then((response) => {
        if (!response.ok) return;
        const fresh: LiveData = { order: response.order || [], comments: response.comments || {} };
        setLive(fresh);
        try {
          localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify(fresh));
        } catch {
          // Hết dung lượng / chế độ riêng tư — lần sau chỉ không nhớ thứ tự
        }
        if (response.voted) setHasVoted(true);
      })
      .catch(() => {
        // Máy chủ chậm/lỗi: trang vẫn đủ bài để xem và chọn; bước gửi sẽ tự báo lỗi nếu còn hỏng
      });
  }, []);

  // Bài có điểm lên đầu theo thứ tự máy chủ; bài chưa có điểm giữ thứ tự nộp.
  const entries = useMemo(() => {
    const rank = new Map(live.order.map((id, index) => [id, index]));
    return [...SNAPSHOT].sort((a, b) => (rank.get(a.id) ?? rank.size) - (rank.get(b.id) ?? rank.size));
  }, [live.order]);

  useEffect(() => {
    if (!IS_CONFIGURED || hasVoted || !hasPendingPick) return;
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastPingAtRef.current < KEEP_AWAKE_INTERVAL_MS) return;
      lastPingAtRef.current = Date.now();
      submissionApi.keepServerAwake();
    };
    ping();
    const timer = window.setInterval(ping, KEEP_AWAKE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hasVoted, hasPendingPick]);

  const markVoted = (record: EngagedRecord) => {
    setHasVoted(true);
    writeEngagedRecord(record);
    setEngagedRecord(record);
  };

  const submit = async ({ reactEntry, commentEntry, commentText, honeypot }: SubmitArgs): Promise<boolean> => {
    if (!reactEntry && !commentEntry) return false;

    const trimmedComment = commentEntry ? commentText.trim() : "";
    if (commentEntry && countWords(trimmedComment) < COMMENT_MIN_WORDS) {
      setEngageError(
        `Bình luận cần tối thiểu ${COMMENT_MIN_WORDS} từ (đang có ${countWords(trimmedComment)} từ).`,
      );
      return false;
    }

    setIsSubmitting(true);
    setEngageError(null);
    const record: EngagedRecord = {
      reactedTitle: reactEntry?.title || null,
      commentedTitle: commentEntry?.title || null,
      at: new Date().toISOString(),
    };
    try {
      const response = await submissionApi.submitEngagement({
        reactEntryId: reactEntry?.id || "",
        commentEntryId: commentEntry?.id || "",
        commentText: trimmedComment,
        deviceId: getDeviceId(),
        recaptchaToken: await getRecaptchaToken("engage"),
        hp: honeypot,
        elapsedMs: Date.now() - pageLoadedAtRef.current,
      });

      if (response.ok) {
        markVoted(record);
        // Máy chủ cache bình luận ~30 giây — tự thêm vào để người vừa viết
        // thấy ngay, không phải tải lại trang (và không bắt máy chủ tính lại).
        if (commentEntry) {
          setLive((prev) => ({
            ...prev,
            comments: {
              ...prev.comments,
              [commentEntry.id]: [...(prev.comments[commentEntry.id] || []), trimmedComment],
            },
          }));
        }
        showToast("Đã ghi nhận bình chọn — cảm ơn bạn đã tham gia!", "success");
        return true;
      }

      // Thiết bị đã dùng lượt: phiếu ĐÃ được ghi (thường do lần gửi trước thành
      // công nhưng mạng rớt) — chuyển thẳng sang "đã bình chọn".
      if (response.code === "ALREADY_VOTED") {
        markVoted(record);
        showToast("Bạn đã bình chọn rồi — phiếu của bạn đã được ghi nhận.", "info");
        return true;
      }

      throw new Error(response.error || "Gửi tương tác thất bại.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEngageError(message);
      showToast(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    entries,
    comments: live.comments,
    hasVoted,
    engagedRecord,
    isSubmitting,
    engageError,
    setEngageError,
    submit,
    toasts,
    showToast,
    dismissToast,
  };
};
