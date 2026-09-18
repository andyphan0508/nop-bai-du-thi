import { useCallback, useMemo, useState } from "react";
import {
  MdCheckCircle,
  MdClose,
  MdFavorite,
  MdHowToVote,
  MdModeComment,
  MdSearch,
} from "react-icons/md";
import ToastStack from "../Submit/components/Toast";
import EntryItem, { type PickKind } from "./components/EntryItem";
import EntrySheet from "./components/EntrySheet";
import ConfirmSheet from "./components/ConfirmSheet";
import { IS_CONFIGURED } from "../../config";
import { useVoteSession } from "./useVoteSession";
import type { VoteEntry } from "../../types";

const FEATURED_COUNT = 3;
// Ít bài thì ô tìm kiếm chỉ chiếm chỗ
const SEARCH_MIN_ENTRIES = 8;
const NO_COMMENTS: string[] = [];

type CommentPick = { entry: VoteEntry; text: string };

const VoteScreen = () => {
  const [reactPick, setReactPick] = useState<VoteEntry | null>(null);
  const [commentPick, setCommentPick] = useState<CommentPick | null>(null);
  const [openEntry, setOpenEntry] = useState<VoteEntry | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");

  const hasPick = Boolean(reactPick || commentPick);

  const {
    entries,
    comments,
    hasVoted,
    engagedRecord,
    isSubmitting,
    engageError,
    setEngageError,
    submit,
    toasts,
    dismissToast,
  } = useVoteSession(hasPick);

  const readOnly = hasVoted;

  const toggleReact = useCallback((entry: VoteEntry) => {
    setReactPick((prev) => (prev?.id === entry.id ? null : entry));
  }, []);

  const closeSheet = useCallback(() => setOpenEntry(null), []);

  // Máy chủ đã xếp bài điểm cao → thấp: 3 bài đầu là nhóm nổi bật, còn lại là
  // danh sách gọn. Không hiện số điểm hay số hạng ở bất cứ đâu.
  const { featured, others } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return {
        featured: [],
        others: entries.filter(
          (entry) => entry.title.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q),
        ),
      };
    }
    return { featured: entries.slice(0, FEATURED_COUNT), others: entries.slice(FEATURED_COUNT) };
  }, [entries, query]);

  const pickOf = (entry: VoteEntry): PickKind =>
    reactPick?.id === entry.id ? "react" : commentPick?.entry.id === entry.id ? "comment" : null;

  const renderItem = (entry: VoteEntry, isFeatured: boolean) => (
    <EntryItem
      key={entry.id}
      entry={entry}
      featured={isFeatured}
      pick={pickOf(entry)}
      commentCount={(comments[entry.id] || NO_COMMENTS).length}
      readOnly={readOnly}
      onOpen={setOpenEntry}
      onToggleReact={toggleReact}
    />
  );

  const handleConfirm = async (honeypot: string) => {
    const sent = await submit({
      reactEntry: reactPick,
      commentEntry: commentPick?.entry || null,
      commentText: commentPick?.text || "",
      honeypot,
    });
    if (sent) {
      setIsConfirmOpen(false);
      setReactPick(null);
      setCommentPick(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const points = (reactPick ? 2 : 0) + (commentPick ? 1 : 0);
  const showDock = hasPick && !hasVoted;

  return (
    <div className={`v-page${showDock ? " has-dock" : ""}`}>
      <header className="v-header">
        <img className="v-logo" src="/logo.jpg" alt="" width={44} height={44} />
        <div>
          <div className="v-kicker">Ban Thanh Niên · HTTL Sài Gòn</div>
          <h1 className="v-title">Bình chọn bìa dự thi</h1>
        </div>
      </header>

      <main className="v-main">
        {!IS_CONFIGURED && (
          <div className="v-alert">Trang chưa cấu hình ENDPOINT (Apps Script). Xem HUONG-DAN.md.</div>
        )}

        {hasVoted ? (
          <section className="v-done" aria-live="polite">
            <MdCheckCircle size={28} className="v-done-icon" aria-hidden />
            <div>
              <h2>Cảm ơn bạn đã bình chọn!</h2>
              {engagedRecord?.reactedTitle || engagedRecord?.commentedTitle ? (
                <ul>
                  {engagedRecord.reactedTitle && (
                    <li>
                      <MdFavorite size={14} aria-hidden /> {engagedRecord.reactedTitle}
                    </li>
                  )}
                  {engagedRecord.commentedTitle && (
                    <li>
                      <MdModeComment size={14} aria-hidden /> {engagedRecord.commentedTitle}
                    </li>
                  )}
                </ul>
              ) : (
                <p>Thiết bị này đã dùng lượt bình chọn. Bạn vẫn có thể xem lại các tác phẩm.</p>
              )}
            </div>
          </section>
        ) : (
          <section className="v-rules" aria-label="Thể lệ">
            <span className="v-chip react">
              <MdFavorite size={13} aria-hidden /> Thả tim 1 bài +2đ
            </span>
            <span className="v-chip comment">
              <MdModeComment size={13} aria-hidden /> Bình luận 1 bài khác +1đ
            </span>
            <span className="v-rules-sub">Mỗi thiết bị gửi 1 lần · bình luận tối thiểu 20 từ</span>
          </section>
        )}

        {entries.length === 0 && <p className="v-muted v-empty">Chưa có bài dự thi nào (chạy npm run snapshot).</p>}

        {entries.length > 0 && (
          <>
            {entries.length >= SEARCH_MIN_ENTRIES && (
              <label className="v-search">
                <MdSearch size={20} aria-hidden />
                <input
                  type="search"
                  value={query}
                  placeholder="Tìm tên tác phẩm…"
                  aria-label="Tìm tác phẩm"
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button type="button" aria-label="Xoá tìm kiếm" onClick={() => setQuery("")}>
                    <MdClose size={18} />
                  </button>
                )}
              </label>
            )}

            {featured.length > 0 && (
              <section aria-labelledby="v-featured-title">
                <h2 className="v-section-title" id="v-featured-title">
                  Nổi bật
                </h2>
                <ul className="v-feat-list">{featured.map((entry) => renderItem(entry, true))}</ul>
              </section>
            )}

            {others.length > 0 && (
              <section aria-labelledby="v-all-title">
                <h2 className="v-section-title" id="v-all-title">
                  {query ? `Kết quả (${others.length})` : "Các tác phẩm khác"}
                </h2>
                <ul className="v-list">{others.map((entry) => renderItem(entry, false))}</ul>
              </section>
            )}

            {query && others.length === 0 && <p className="v-muted v-empty">Không tìm thấy tác phẩm phù hợp.</p>}
          </>
        )}

        <footer className="v-foot">© {new Date().getFullYear()} Ban Thanh Niên · HTTL Chi Hội Sài Gòn</footer>
      </main>

      {showDock && (
        <div className="v-dock">
          <div className="v-dock-inner">
            <div className="v-dock-picks">
              <button
                type="button"
                className={`v-dock-pick react${reactPick ? "" : " empty"}`}
                onClick={() => reactPick && setOpenEntry(reactPick)}
                disabled={!reactPick}
              >
                <MdFavorite size={15} aria-hidden />
                <span>{reactPick ? reactPick.title : "Chưa thả tim"}</span>
              </button>
              <button
                type="button"
                className={`v-dock-pick comment${commentPick ? "" : " empty"}`}
                onClick={() => commentPick && setOpenEntry(commentPick.entry)}
                disabled={!commentPick}
              >
                <MdModeComment size={15} aria-hidden />
                <span>{commentPick ? commentPick.entry.title : "Chưa bình luận"}</span>
              </button>
            </div>
            <button className="v-btn primary v-dock-send" type="button" onClick={() => setIsConfirmOpen(true)}>
              <MdHowToVote size={20} aria-hidden />
              Gửi {points}đ
            </button>
          </div>
        </div>
      )}

      {openEntry && (
        <EntrySheet
          key={openEntry.id}
          entry={openEntry}
          comments={comments[openEntry.id] || NO_COMMENTS}
          pick={pickOf(openEntry)}
          savedComment={commentPick?.entry.id === openEntry.id ? commentPick.text : null}
          hasReactElsewhere={Boolean(reactPick && reactPick.id !== openEntry.id)}
          hasCommentElsewhere={Boolean(commentPick && commentPick.entry.id !== openEntry.id)}
          readOnly={readOnly}
          onToggleReact={(entry) => {
            toggleReact(entry);
            closeSheet();
          }}
          onSaveComment={(entry, text) => {
            setCommentPick({ entry, text });
            closeSheet();
          }}
          onRemoveComment={() => {
            setCommentPick(null);
            closeSheet();
          }}
          onClose={closeSheet}
        />
      )}

      {isConfirmOpen && hasPick && (
        <ConfirmSheet
          reactTarget={reactPick}
          commentTarget={commentPick?.entry || null}
          commentText={commentPick?.text || ""}
          isSubmitting={isSubmitting}
          errorMessage={engageError}
          onCancel={() => {
            if (isSubmitting) return;
            setIsConfirmOpen(false);
            setEngageError(null);
          }}
          onConfirm={handleConfirm}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default VoteScreen;
