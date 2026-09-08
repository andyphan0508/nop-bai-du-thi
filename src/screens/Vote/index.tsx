import { useEffect, useRef, useState } from "react";
import BackgroundDecor from "../Submit/components/BackgroundDecor";
import SubmitHeader from "../Submit/components/SubmitHeader";
import ToastStack, { type ToastItem } from "../Submit/components/Toast";
import VoteCard from "./components/VoteCard";
import VoteLightbox from "./components/VoteLightbox";
import BallotModal from "./components/BallotModal";
import VoteDoneCard from "./components/VoteDoneCard";
import AdminResultsPanel from "./components/AdminResultsPanel";
import { submissionApi } from "../../api/submissionApi";
import { IS_CONFIGURED } from "../../config";
import { getRecaptchaToken } from "../../utils/recaptcha";
import type { VoteEntry } from "../../types";

// Mỗi máy chỉ bình chọn 1 lần — dấu vết phía trình duyệt (chặn thật sự nằm ở
// server: mỗi tài khoản Google đăng nhập chỉ được ghi 1 phiếu, xem
// apps-script/Code.gs → handleVote/verifyGoogleIdToken. Mở ẩn danh chỉ xoá
// được dấu vết này, KHÔNG giúp bình chọn thêm lần nữa vì vẫn phải đăng nhập
// lại bằng 1 tài khoản Google thật.)
const VOTED_STORAGE_KEY = "nbdt-da-binh-chon";

type VotedRecord = { title: string; at: string };

const readVotedRecord = (): VotedRecord | null => {
  try {
    return JSON.parse(localStorage.getItem(VOTED_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

const VoteScreen = () => {
  const [entries, setEntries] = useState<VoteEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedEntry, setSelectedEntry] = useState<VoteEntry | null>(null);
  const [zoomEntry, setZoomEntry] = useState<VoteEntry | null>(null);
  const [isBallotOpen, setIsBallotOpen] = useState<boolean>(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState<boolean>(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const [votedRecord, setVotedRecord] = useState<VotedRecord | null>(readVotedRecord);

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
    if (votedRecord) return; // đã bình chọn — không cần tải danh sách nữa
    if (!IS_CONFIGURED) {
      setIsLoading(false);
      return;
    }
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await submissionApi.getVoteEntries();
        if (!response.ok) throw new Error(response.error || "Không tải được danh sách bài dự thi.");
        setEntries(response.entries || []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votedRecord]);

  const handleConfirmVote = async (googleIdToken: string, honeypot: string) => {
    if (!selectedEntry) return;
    setIsSubmittingVote(true);
    setVoteError(null);
    try {
      const recaptchaToken = await getRecaptchaToken("vote");
      const response = await submissionApi.submitVote({
        entryId: selectedEntry.id,
        googleIdToken,
        recaptchaToken,
        hp: honeypot,
        elapsedMs: Date.now() - pageLoadedAtRef.current,
      });
      if (!response.ok) throw new Error(response.error || "Gửi phiếu bầu thất bại.");

      const record: VotedRecord = { title: selectedEntry.title, at: new Date().toISOString() };
      localStorage.setItem(VOTED_STORAGE_KEY, JSON.stringify(record));
      setVotedRecord(record);
      setIsBallotOpen(false);
      showToast("Đã ghi nhận phiếu bầu — cảm ơn bạn!", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setVoteError(message);
      showToast(message);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <BackgroundDecor />

      <div className="wrap">
        <SubmitHeader
          title="Bình chọn bài dự thi yêu thích"
          subtitle="Chọn 1 bài dự thi bạn thích nhất. Phiếu bầu kín — mỗi người chỉ được bình chọn 1 lần."
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

        {IS_CONFIGURED && votedRecord && (
          <div className="card">
            <VoteDoneCard pickedTitle={votedRecord.title} />
          </div>
        )}

        {IS_CONFIGURED && !votedRecord && (
          <>
            {isLoading && <div className="list-note">Đang tải danh sách bài dự thi…</div>}

            {!isLoading && loadError && (
              <div className="card">
                <div className="msg err">{loadError}</div>
              </div>
            )}

            {!isLoading && !loadError && entries.length === 0 && (
              <div className="card">
                <div className="list-empty">Chưa có bài dự thi nào để bình chọn.</div>
              </div>
            )}

            {!isLoading && !loadError && entries.length > 0 && (
              <div className="vote-grid">
                {entries.map((entry) => (
                  <VoteCard
                    key={entry.id}
                    entry={entry}
                    imgSrc={submissionApi.voteImageUrl(entry.imageFileId)}
                    isSelected={selectedEntry?.id === entry.id}
                    disabled={false}
                    onSelect={() => setSelectedEntry(entry)}
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

      {selectedEntry && !votedRecord && (
        <div className="vote-actionbar">
          <div className="vote-actionbar-inner">
            <span>
              Đã chọn: <b>{selectedEntry.title}</b> — {selectedEntry.name}
            </span>
            <button className="btn" type="button" style={{ width: "auto" }} onClick={() => setIsBallotOpen(true)}>
              Gửi phiếu bầu
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

      {isBallotOpen && selectedEntry && (
        <BallotModal
          entry={selectedEntry}
          isSubmitting={isSubmittingVote}
          errorMessage={voteError}
          onCancel={() => {
            if (isSubmittingVote) return;
            setIsBallotOpen(false);
            setVoteError(null);
          }}
          onConfirm={handleConfirmVote}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default VoteScreen;
