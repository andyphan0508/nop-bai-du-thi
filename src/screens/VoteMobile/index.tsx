import { useState } from "react";
import BackgroundDecor from "../Submit/components/BackgroundDecor";
import SubmitHeader from "../Submit/components/SubmitHeader";
import ToastStack from "../Submit/components/Toast";
import EngageModal from "../Vote/components/EngageModal";
import VoteDoneCard from "../Vote/components/VoteDoneCard";
import VoteStatsModal from "../Vote/components/VoteStatsModal";
import VoteSkeleton from "../Vote/components/VoteSkeleton";
import TurnHome from "./components/TurnHome";
import EntryPickerList from "./components/EntryPickerList";
import EntryActionDetail from "./components/EntryActionDetail";
import { submissionApi } from "../../api/submissionApi";
import { IS_CONFIGURED } from "../../config";
import { useVoteSession } from "../Vote/useVoteSession";
import { turnActionOf, turnEntryIdOf, type TurnAction, type TurnResult } from "./turnTypes";
import type { VoteEntry } from "../../types";

type ScreenState =
  | { view: "home" }
  | { view: "list"; turn: 1 | 2 }
  | { view: "detail"; turn: 1 | 2; entry: VoteEntry };

// Màn xem lại tác phẩm sau khi đã dùng hết lượt — giữ đúng hành vi "chỉ xem"
// giống bản desktop, chỉ khác cách trình bày (danh sách dọc thay vì lưới).
type BrowseState = { view: "list" } | { view: "detail"; entry: VoteEntry } | null;

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
  // Cùng một "ruột" với bản desktop (xem Vote/useVoteSession) — khác nhau chỉ
  // ở cách trình bày, nên trạng thái "đã bình chọn", cách gửi lại khi quá tải
  // và thông báo lỗi luôn giống hệt giữa 2 bản.
  const {
    entries,
    comments,
    isLoading,
    isSlowLoading,
    loadError,
    hasVoted,
    engagedRecord,
    isSubmitting: isSubmittingEngage,
    engageError,
    setEngageError,
    submit,
    toasts,
    dismissToast,
  } = useVoteSession();

  const [screen, setScreen] = useState<ScreenState>({ view: "home" });
  const [turn1, setTurn1] = useState<TurnResult>(null);
  const [turn2, setTurn2] = useState<TurnResult>(null);

  const [isEngageModalOpen, setIsEngageModalOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [browse, setBrowse] = useState<BrowseState>(null);

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

  const handleConfirmEngage = async (honeypot: string) => {
    const sent = await submit({
      reactEntry: reactTurn?.entry || null,
      commentEntry: commentTurn?.entry || null,
      commentText: commentTurn?.commentText || "",
      honeypot,
    });
    if (sent) setIsEngageModalOpen(false);
  };

  const renderBody = () => {
    if (isLoading) return <VoteSkeleton variant="list" isSlow={isSlowLoading} />;
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

        {IS_CONFIGURED && hasVoted && !browse && (
          <div className="card">
            <VoteDoneCard
              reactedTitle={engagedRecord?.reactedTitle}
              commentedTitle={engagedRecord?.commentedTitle}
              onViewStats={() => setIsStatsOpen(true)}
              onBrowseAll={entries.length > 0 ? () => setBrowse({ view: "list" }) : undefined}
            />
          </div>
        )}

        {IS_CONFIGURED && hasVoted && browse?.view === "list" && (
          <EntryPickerList
            title="Xem lại tác phẩm dự thi"
            entries={entries}
            excludeEntryId={null}
            imageUrlFor={submissionApi.voteImageUrl}
            onSelect={(entry) => setBrowse({ view: "detail", entry })}
            onBack={() => setBrowse(null)}
          />
        )}

        {IS_CONFIGURED && hasVoted && browse?.view === "detail" && (
          <EntryActionDetail
            entry={browse.entry}
            order={entries.findIndex((entry) => entry.id === browse.entry.id) + 1}
            imgSrc={submissionApi.voteImageUrl(browse.entry.imageFileId, 1200)}
            comments={comments[browse.entry.id] || []}
            availableActions={[]}
            readOnly
            onBack={() => setBrowse({ view: "list" })}
            onSkip={() => setBrowse({ view: "list" })}
            onConfirm={() => setBrowse({ view: "list" })}
          />
        )}

        {IS_CONFIGURED && !hasVoted && renderBody()}

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
