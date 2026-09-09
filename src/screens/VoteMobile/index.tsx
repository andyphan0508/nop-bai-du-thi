import { useEffect, useRef, useState } from "react";
import BackgroundDecor from "../Submit/components/BackgroundDecor";
import SubmitHeader from "../Submit/components/SubmitHeader";
import ToastStack, { type ToastItem } from "../Submit/components/Toast";
import EngageModal from "../Vote/components/EngageModal";
import VoteDoneCard from "../Vote/components/VoteDoneCard";
import VoteStatsModal from "../Vote/components/VoteStatsModal";
import TurnHome from "./components/TurnHome";
import EntryPickerList from "./components/EntryPickerList";
import EntryActionDetail from "./components/EntryActionDetail";
import { submissionApi } from "../../api/submissionApi";
import { IS_CONFIGURED } from "../../config";
import { getRecaptchaToken } from "../../utils/recaptcha";
import { readEngagedRecord, writeEngagedRecord, type EngagedRecord } from "../../utils/engagedRecord";
import { turnActionOf, turnEntryIdOf, type TurnAction, type TurnResult } from "./turnTypes";
import type { EntryCommentsMap, VoteEntry } from "../../types";

type ScreenState =
  | { view: "home" }
  | { view: "list"; turn: 1 | 2 }
  | { view: "detail"; turn: 1 | 2; entry: VoteEntry };

const findTurnWithAction = (
  turn1: TurnResult,
  turn2: TurnResult,
  action: TurnAction,
): { entry: VoteEntry; commentText: string } | null => {
  for (const turn of [turn1, turn2]) {
    if (turn && turn !== "skipped" && turn.action === action) return turn;
  }
  return null;
};

const VoteMobileScreen = () => {
  const [entries, setEntries] = useState<VoteEntry[]>([]);
  const [comments, setComments] = useState<EntryCommentsMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [screen, setScreen] = useState<ScreenState>({ view: "home" });
  const [turn1, setTurn1] = useState<TurnResult>(null);
  const [turn2, setTurn2] = useState<TurnResult>(null);

  const [isEngageModalOpen, setIsEngageModalOpen] = useState<boolean>(false);
  const [isSubmittingEngage, setIsSubmittingEngage] = useState<boolean>(false);
  const [engageError, setEngageError] = useState<string | null>(null);

  const [engagedRecord, setEngagedRecord] = useState<EngagedRecord | null>(readEngagedRecord);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

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
  }, []);

  // Lượt còn lại (không phải turnNumber) quyết định: bài nào bị loại khỏi danh
  // sách, và hành động nào không còn được chọn nữa (đã dùng ở lượt kia).
  const otherTurnOf = (turnNumber: 1 | 2): TurnResult => (turnNumber === 1 ? turn2 : turn1);

  const setTurn = (turnNumber: 1 | 2, value: TurnResult) => {
    if (turnNumber === 1) setTurn1(value);
    else setTurn2(value);
  };

  // Sau khi xong 1 lượt: nếu vừa làm Lượt 1 và Lượt 2 chưa làm → tự chuyển
  // sang chọn bài cho Lượt 2; các trường hợp còn lại → về màn hình tổng.
  const advanceAfterTurn = (turnNumber: 1 | 2, otherTurn: TurnResult) => {
    if (turnNumber === 1 && otherTurn === null) {
      setScreen({ view: "list", turn: 2 });
    } else {
      setScreen({ view: "home" });
    }
  };

  const handleStartTurn = (turnNumber: 1 | 2) => setScreen({ view: "list", turn: turnNumber });

  const handleSelectEntry = (turnNumber: 1 | 2, entry: VoteEntry) => setScreen({ view: "detail", turn: turnNumber, entry });

  const handleConfirmTurn = (turnNumber: 1 | 2, entry: VoteEntry, action: TurnAction, commentText: string) => {
    const otherTurn = otherTurnOf(turnNumber);
    setTurn(turnNumber, { entry, action, commentText });
    advanceAfterTurn(turnNumber, otherTurn);
  };

  const handleSkipTurn = (turnNumber: 1 | 2) => {
    const otherTurn = otherTurnOf(turnNumber);
    setTurn(turnNumber, "skipped");
    advanceAfterTurn(turnNumber, otherTurn);
  };

  const reactTurn = findTurnWithAction(turn1, turn2, "react");
  const commentTurn = findTurnWithAction(turn1, turn2, "comment");

  const handleConfirmEngage = async (googleIdToken: string, honeypot: string) => {
    setIsSubmittingEngage(true);
    setEngageError(null);
    try {
      const recaptchaToken = await getRecaptchaToken("engage");
      const response = await submissionApi.submitEngagement({
        reactEntryId: reactTurn?.entry.id || "",
        commentEntryId: commentTurn?.entry.id || "",
        commentText: commentTurn?.commentText || "",
        googleIdToken,
        recaptchaToken,
        hp: honeypot,
        elapsedMs: Date.now() - pageLoadedAtRef.current,
      });
      if (!response.ok) throw new Error(response.error || "Gửi tương tác thất bại.");

      const record: EngagedRecord = {
        reactedTitle: reactTurn?.entry.title || null,
        commentedTitle: commentTurn?.entry.title || null,
        at: new Date().toISOString(),
      };
      writeEngagedRecord(record);
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

  const renderBody = () => {
    if (isLoading) return <div className="list-note">Đang tải danh sách bài dự thi…</div>;
    if (loadError)
      return (
        <div className="card">
          <div className="msg err">{loadError}</div>
        </div>
      );
    if (entries.length === 0)
      return (
        <div className="card">
          <div className="list-empty">Chưa có bài dự thi nào để tương tác.</div>
        </div>
      );

    if (screen.view === "list") {
      const otherTurn = otherTurnOf(screen.turn);
      return (
        <EntryPickerList
          title={`Lượt ${screen.turn} — Chọn 1 bài dự thi`}
          entries={entries}
          excludeEntryId={turnEntryIdOf(otherTurn)}
          imageUrlFor={submissionApi.voteImageUrl}
          onSelect={(entry) => handleSelectEntry(screen.turn, entry)}
          onBack={() => setScreen({ view: "home" })}
        />
      );
    }

    if (screen.view === "detail") {
      const otherTurn = otherTurnOf(screen.turn);
      const excludedAction = turnActionOf(otherTurn);
      const availableActions: TurnAction[] = (["react", "comment"] as TurnAction[]).filter(
        (action) => action !== excludedAction,
      );
      return (
        <EntryActionDetail
          entry={screen.entry}
          order={entries.findIndex((entry) => entry.id === screen.entry.id) + 1}
          imgSrc={submissionApi.voteImageUrl(screen.entry.imageFileId, 1200)}
          comments={comments[screen.entry.id] || []}
          availableActions={availableActions}
          onBack={() => setScreen({ view: "home" })}
          onSkip={() => handleSkipTurn(screen.turn)}
          onConfirm={(action, commentText) => handleConfirmTurn(screen.turn, screen.entry, action, commentText)}
        />
      );
    }

    return <TurnHome turn1={turn1} turn2={turn2} onStartTurn={handleStartTurn} onSubmit={() => setIsEngageModalOpen(true)} />;
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <BackgroundDecor />

      <div className="wrap wrap-mobile">
        <SubmitHeader
          title="React & bình luận bài dự thi"
          subtitle="Lượt 1: React hoặc bình luận cho 1 bài. Lượt 2: hành động còn lại cho 1 bài khác."
          nav={
            <a className="nav-link" href="/binh-chon">
              ← Về giao diện thường
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
            <VoteDoneCard
              reactedTitle={engagedRecord.reactedTitle}
              commentedTitle={engagedRecord.commentedTitle}
              onViewStats={() => setIsStatsOpen(true)}
            />
          </div>
        )}

        {IS_CONFIGURED && !engagedRecord && renderBody()}

        <div className="foot">© {new Date().getFullYear()} Ban Thanh Niên · HTTL Chi Hội Sài Gòn</div>
      </div>

      {isEngageModalOpen && (
        <EngageModal
          reactTarget={reactTurn?.entry || null}
          commentTarget={commentTurn?.entry || null}
          commentText={commentTurn?.commentText || ""}
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

      <VoteStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        entries={entries}
        comments={comments}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default VoteMobileScreen;
