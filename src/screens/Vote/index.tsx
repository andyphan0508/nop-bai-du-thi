import { useEffect, useRef, useState } from "react";
import BackgroundDecor from "../Submit/components/BackgroundDecor";
import SubmitHeader from "../Submit/components/SubmitHeader";
import ToastStack, { type ToastItem } from "../Submit/components/Toast";
import VoteCard from "./components/VoteCard";
import VoteLightbox from "./components/VoteLightbox";
import EngageModal from "./components/EngageModal";
import VoteDoneCard from "./components/VoteDoneCard";
import AdminResultsPanel from "./components/AdminResultsPanel";
import { submissionApi } from "../../api/submissionApi";
import { IS_CONFIGURED } from "../../config";
import { getRecaptchaToken } from "../../utils/recaptcha";
import type { EntryCommentsMap, VoteEntry } from "../../types";

// Mỗi tài khoản Google chỉ dùng được 1 lượt (1 React + 1 bình luận) — dấu vết
// phía trình duyệt. Chặn thật sự nằm ở server: mỗi tài khoản Google đăng nhập
// chỉ được ghi 1 lượt duy nhất, xem apps-script/Code.gs → handleEngage/
// verifyGoogleIdToken. Mở ẩn danh chỉ xoá được dấu vết này, KHÔNG giúp dùng
// thêm lượt vì vẫn phải đăng nhập lại bằng 1 tài khoản Google thật.
const ENGAGED_STORAGE_KEY = "nbdt-da-tuong-tac";

type EngagedRecord = {
  reactedTitle: string | null;
  commentedTitle: string | null;
  at: string;
};

const readEngagedRecord = (): EngagedRecord | null => {
  try {
    return JSON.parse(localStorage.getItem(ENGAGED_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

const VoteScreen = () => {
  const [entries, setEntries] = useState<VoteEntry[]>([]);
  const [comments, setComments] = useState<EntryCommentsMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reactTarget, setReactTarget] = useState<VoteEntry | null>(null);
  const [commentTarget, setCommentTarget] = useState<VoteEntry | null>(null);
  const [commentText, setCommentText] = useState<string>("");

  const [zoomEntry, setZoomEntry] = useState<VoteEntry | null>(null);
  const [isEngageModalOpen, setIsEngageModalOpen] = useState<boolean>(false);
  const [isSubmittingEngage, setIsSubmittingEngage] = useState<boolean>(false);
  const [engageError, setEngageError] = useState<string | null>(null);

  const [engagedRecord, setEngagedRecord] = useState<EngagedRecord | null>(readEngagedRecord);

  const [isAdmin] = useState<boolean>(() => new URLSearchParams(window.location.search).has("admin"));

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef<number>(0);
  const pageLoadedAtRef = useRef<number>(Date.now());

  const showToast = (message: string, type: ToastItem["type"] = "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4500);
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  useEffect(() => {
    if (engagedRecord) return; // đã dùng hết lượt — không cần tải danh sách nữa
    if (!IS_CONFIGURED) {
      setIsLoading(false);
      return;
    }
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [entriesResponse, commentsResponse] = await Promise.all([
          submissionApi.getVoteEntries(),
          submissionApi.getComments(),
        ]);
        if (!entriesResponse.ok) throw new Error(entriesResponse.error || "Không tải được danh sách bài dự thi.");
        setEntries(entriesResponse.entries || []);
        setComments(commentsResponse.ok ? commentsResponse.comments || {} : {});
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagedRecord]);

  const handleToggleReact = (entry: VoteEntry) => {
    setReactTarget((prev) => (prev?.id === entry.id ? null : entry));
  };

  const handleToggleComment = (entry: VoteEntry) => {
    setCommentTarget((prev) => (prev?.id === entry.id ? null : entry));
    setCommentText("");
  };

  const handleConfirmEngage = async (googleIdToken: string, honeypot: string) => {
    if (!reactTarget && !commentTarget) return;
    if (commentTarget && !commentText.trim()) {
      setEngageError("Vui lòng nhập nội dung bình luận.");
      return;
    }
    setIsSubmittingEngage(true);
    setEngageError(null);
    try {
      const recaptchaToken = await getRecaptchaToken("engage");
      const response = await submissionApi.submitEngagement({
        reactEntryId: reactTarget?.id || "",
        commentEntryId: commentTarget?.id || "",
        commentText: commentTarget ? commentText.trim() : "",
        googleIdToken,
        recaptchaToken,
        hp: honeypot,
        elapsedMs: Date.now() - pageLoadedAtRef.current,
      });
      if (!response.ok) throw new Error(response.error || "Gửi tương tác thất bại.");

      const record: EngagedRecord = {
        reactedTitle: reactTarget?.title || null,
        commentedTitle: commentTarget?.title || null,
        at: new Date().toISOString(),
      };
      localStorage.setItem(ENGAGED_STORAGE_KEY, JSON.stringify(record));
      setEngagedRecord(record);
      setIsEngageModalOpen(false);
      showToast("Đã ghi nhận tương tác — cảm ơn bạn!", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEngageError(message);
      showToast(message);
    } finally {
      setIsSubmittingEngage(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <BackgroundDecor />

      <div className="wrap">
        <SubmitHeader
          title="React & bình luận bài dự thi"
          subtitle="Mỗi người có 1 lượt React (2 điểm) + 1 lượt bình luận (1 điểm) — dùng 1 lần duy nhất cho bài bạn thích."
          nav={
            <a className="nav-link" href="/">
              ← Về trang nộp bài
            </a>
          }
        />

        {!IS_CONFIGURED && (
          <div className="card">
            <div className="banner">Trang chưa cấu hình ENDPOINT (Apps Script). Xem HUONG-DAN.md.</div>
          </div>
        )}

        {IS_CONFIGURED && engagedRecord && (
          <div className="card">
            <VoteDoneCard reactedTitle={engagedRecord.reactedTitle} commentedTitle={engagedRecord.commentedTitle} />
          </div>
        )}

        {IS_CONFIGURED && !engagedRecord && (
          <>
            {isLoading && <div className="list-note">Đang tải danh sách bài dự thi…</div>}

            {!isLoading && loadError && (
              <div className="card">
                <div className="msg err">{loadError}</div>
              </div>
            )}

            {!isLoading && !loadError && entries.length === 0 && (
              <div className="card">
                <div className="list-empty">Chưa có bài dự thi nào để tương tác.</div>
              </div>
            )}

            {!isLoading && !loadError && entries.length > 0 && (
              <div className="vote-grid">
                {entries.map((entry) => (
                  <VoteCard
                    key={entry.id}
                    entry={entry}
                    imgSrc={submissionApi.voteImageUrl(entry.imageFileId)}
                    isReactSelected={reactTarget?.id === entry.id}
                    isCommentSelected={commentTarget?.id === entry.id}
                    commentText={commentTarget?.id === entry.id ? commentText : ""}
                    comments={comments[entry.id] || []}
                    onToggleReact={() => handleToggleReact(entry)}
                    onToggleComment={() => handleToggleComment(entry)}
                    onCommentTextChange={setCommentText}
                    onZoom={() => setZoomEntry(entry)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {isAdmin && (
          <div style={{ marginTop: 24 }}>
            <AdminResultsPanel />
          </div>
        )}

        <div className="foot">© {new Date().getFullYear()} Ban Thanh Niên · HTTL Chi Hội Sài Gòn</div>
      </div>

      {(reactTarget || commentTarget) && !engagedRecord && (
        <div className="vote-actionbar">
          <div className="vote-actionbar-inner">
            <div className="vote-actionbar-summary">
              {reactTarget && (
                <span>
                  React: <b>{reactTarget.title}</b>
                </span>
              )}
              {commentTarget && (
                <span>
                  Bình luận: <b>{commentTarget.title}</b>
                </span>
              )}
            </div>
            <button className="btn" type="button" style={{ width: "auto" }} onClick={() => setIsEngageModalOpen(true)}>
              Xác nhận
            </button>
          </div>
        </div>
      )}

      {zoomEntry && (
        <VoteLightbox
          entry={zoomEntry}
          imgSrc={submissionApi.voteImageUrl(zoomEntry.imageFileId, 1600)}
          onClose={() => setZoomEntry(null)}
        />
      )}

      {isEngageModalOpen && (reactTarget || commentTarget) && (
        <EngageModal
          reactTarget={reactTarget}
          commentTarget={commentTarget}
          commentText={commentText}
          isSubmitting={isSubmittingEngage}
          errorMessage={engageError}
          onCancel={() => {
            if (isSubmittingEngage) return;
            setIsEngageModalOpen(false);
            setEngageError(null);
          }}
          onConfirm={handleConfirmEngage}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default VoteScreen;
