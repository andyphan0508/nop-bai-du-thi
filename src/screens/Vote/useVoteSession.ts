import { useCallback, useEffect, useRef, useState } from "react";
import { submissionApi } from "../../api/submissionApi";
import { IS_CONFIGURED } from "../../config";
import { getDeviceId } from "../../utils/deviceId";
import { getRecaptchaToken } from "../../utils/recaptcha";
import { readEngagedRecord, writeEngagedRecord, type EngagedRecord } from "../../utils/engagedRecord";
import { COMMENT_MIN_WORDS, countWords } from "../../utils/wordCount";
import type { ToastItem } from "../Submit/components/Toast";
import type { EntryCommentsMap, VoteEntry } from "../../types";

type SubmitArgs = {
  reactEntry: VoteEntry | null;
  commentEntry: VoteEntry | null;
  commentText: string;
  honeypot: string;
};

/**
 * Toàn bộ phần "ruột" của việc bình chọn — tải dữ liệu, biết thiết bị đã dùng
 * lượt chưa, gửi phiếu, báo lỗi — DÙNG CHUNG cho cả bản desktop (/binh-chon)
 * và bản mobile (/binh-chon/mobile). Trước đây 2 màn hình chép lại cùng một
 * đoạn logic nên rất dễ lệch nhau mỗi lần sửa (VD sửa cách xử lý lỗi ở 1 bên
 * mà quên bên kia); gộp về 1 chỗ để 2 giao diện luôn hành xử giống hệt nhau.
 */
export const useVoteSession = () => {
  const [entries, setEntries] = useState<VoteEntry[]>([]);
  const [comments, setComments] = useState<EntryCommentsMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Đã bình chọn hay chưa: ưu tiên bản ghi trong máy (có kèm tên tác phẩm đã
  // chọn để hiện biên nhận), nhưng máy chủ mới là nguồn quyết định.
  const [engagedRecord, setEngagedRecord] = useState<EngagedRecord | null>(readEngagedRecord);
  const [hasVoted, setHasVoted] = useState<boolean>(() => Boolean(readEngagedRecord()));

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [engageError, setEngageError] = useState<string | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef<number>(0);
  const pageLoadedAtRef = useRef<number>(Date.now());

  const showToast = useCallback((message: string, type: ToastItem["type"] = "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const reload = useCallback(async () => {
    if (!IS_CONFIGURED) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      // Hỏi máy chủ "thiết bị này vote chưa" SONG SONG với việc tải dữ liệu —
      // không nối tiếp, để trang không chậm thêm một vòng gọi mạng.
      const [entriesResponse, commentsResponse, votedOnServer] = await Promise.all([
        submissionApi.getVoteEntries(),
        submissionApi.getComments(),
        submissionApi.getVoteStatus(getDeviceId()),
      ]);
      if (!entriesResponse.ok) throw new Error(entriesResponse.error || "Không tải được danh sách bài dự thi.");
      setEntries(entriesResponse.entries || []);
      setComments(commentsResponse.ok ? commentsResponse.comments || {} : {});
      if (votedOnServer) markVoted(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Ghi nhận "đã bình chọn" ở cả 3 nơi: state, localStorage và cờ hasVoted.
  // record = null nghĩa là biết đã vote nhưng không biết đã chọn bài nào (VD
  // máy chủ báo đã vote còn máy này đã xoá dữ liệu trang) — vẫn khoá bình chọn,
  // chỉ là biên nhận không hiện tên tác phẩm.
  const markVoted = (record: EngagedRecord | null) => {
    setHasVoted(true);
    if (!record) return;
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
        markVoted({
          reactedTitle: reactEntry?.title || null,
          commentedTitle: commentEntry?.title || null,
          at: new Date().toISOString(),
        });
        showToast("Đã ghi nhận bình chọn — cảm ơn bạn đã tham gia!", "success");
        return true;
      }

      // Máy chủ báo thiết bị đã dùng lượt: nghĩa là phiếu ĐÃ được ghi (thường
      // do lần gửi trước thành công nhưng mạng rớt nên máy này không nhận được
      // phản hồi). Chuyển thẳng sang màn "đã bình chọn" thay vì bắt người dùng
      // bấm gửi lại mãi không được.
      if (response.code === "ALREADY_VOTED") {
        markVoted({
          reactedTitle: reactEntry?.title || null,
          commentedTitle: commentEntry?.title || null,
          at: new Date().toISOString(),
        });
        showToast("Thiết bị này đã bình chọn trước đó — phiếu của bạn đã được ghi nhận.", "info");
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
    comments,
    isLoading,
    loadError,
    reload,
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
