import { useCallback, useMemo, useState } from "react";
import {
  MdCheckCircle,
  MdClose,
  MdEmojiEvents,
  MdFavorite,
  MdHowToVote,
  MdModeComment,
  MdSearch,
  MdContentCopy,
} from "react-icons/md";
import ToastStack from "../Submit/components/Toast";
import EntryItem, { type PickKind } from "./components/EntryItem";
import EntrySheet from "./components/EntrySheet";
import ConfirmSheet from "./components/ConfirmSheet";
import Top3Sheet from "./components/Top3Sheet";
import { IS_CONFIGURED } from "../../config";
import { useVoteSession } from "./useVoteSession";
import { getDeviceId } from "../../utils/deviceId";
import type { VoteEntry } from "../../types";

// Ít bài thì ô tìm kiếm chỉ chiếm chỗ
const SEARCH_MIN_ENTRIES = 8;
const NO_COMMENTS: string[] = [];
// Nút "Top 3" chỉ hiện với link quản trị (/binh-chon?admin) — máy chủ vẫn đòi
// ADMIN_KEY nên người thường có mở link này cũng không xem được kết quả.
const IS_ADMIN = new URLSearchParams(window.location.search).has("admin");

type CommentPick = { entry: VoteEntry; text: string };

const VoteScreen = () => {
  const [reactPick, setReactPick] = useState<VoteEntry | null>(null);
  const [commentPick, setCommentPick] = useState<CommentPick | null>(null);
  // writing = mở thẳng ô bình luận (bấm "Bình luận" trên dòng)
  const [sheet, setSheet] = useState<{ entry: VoteEntry; writing: boolean } | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [isTop3Open, setIsTop3Open] = useState<boolean>(false);

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
    showToast,
    dismissToast,
  } = useVoteSession(hasPick);

  // Bấm gửi sớm (mới dùng 1 trong 2 lượt) thì cần ban tổ chức mở lại lượt —
  // mã máy hiện ngay ở màn cảm ơn để gửi cho ban tổ chức, khỏi phải mở F12.
  const copyDeviceId = async () => {
    const id = getDeviceId();
    try {
      await navigator.clipboard.writeText(id);
      showToast("Đã sao chép mã máy — gửi cho ban tổ chức để mở lại lượt.", "success");
    } catch {
      window.prompt("Sao chép mã máy này rồi gửi cho ban tổ chức:", id);
    }
  };

  const toggleReact = useCallback((entry: VoteEntry) => {
    setReactPick((prev) => (prev?.id === entry.id ? null : entry));
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);
  const openEntry = useCallback((entry: VoteEntry) => setSheet({ entry, writing: false }), []);
  const openComment = useCallback((entry: VoteEntry) => setSheet({ entry, writing: true }), []);

  // Không hiện số điểm hay số hạng ở bất cứ đâu.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (entry) => entry.title.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const pickOf = (entry: VoteEntry): PickKind =>
    reactPick?.id === entry.id ? "react" : commentPick?.entry.id === entry.id ? "comment" : null;

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
        {IS_ADMIN && (
          <button
            className="v-header-btn"
            type="button"
            aria-label="Xem Top 3"
            title="Xem Top 3"
            onClick={() => setIsTop3Open(true)}
          >
            <MdEmojiEvents size={22} aria-hidden />
          </button>
        )}
      </header>

      <main className="v-main">
        {!IS_CONFIGURED && (
          <div className="v-alert">Trang chưa cấu hình ENDPOINT (Apps Script). Xem HUONG-DAN.md.</div>
        )}

        {hasVoted ? (
          <section className="v-voted" aria-live="polite">
            <MdCheckCircle size={56} className="v-voted-icon" aria-hidden />
            <h2>Bạn đã bình chọn!</h2>
            <p>Cảm ơn bạn đã dành tình cảm và lời khích lệ cho các tác phẩm dự thi.</p>
            {(engagedRecord?.reactedTitle || engagedRecord?.commentedTitle) && (
              <ul>
                {engagedRecord.reactedTitle && (
                  <li className="react">
                    <MdFavorite size={18} aria-hidden /> {engagedRecord.reactedTitle}
                  </li>
                )}
                {engagedRecord.commentedTitle && (
                  <li className="comment">
                    <MdModeComment size={18} aria-hidden /> {engagedRecord.commentedTitle}
                  </li>
                )}
              </ul>
            )}

            <div className="v-device">
              <span>Bấm gửi nhầm khi chưa dùng hết lượt?</span>
              <button className="v-btn ghost small" type="button" onClick={copyDeviceId}>
                <MdContentCopy size={16} /> Chép mã máy gửi ban tổ chức
              </button>
              <code>{getDeviceId()}</code>
            </div>
          </section>
        ) : (
          <>
            <section className="v-rules" aria-label="Thể lệ">
              <span className="v-chip react">
                <MdFavorite size={13} aria-hidden /> Thả tim 1 bài +2đ
              </span>
              <span className="v-chip comment">
                <MdModeComment size={13} aria-hidden /> Bình luận 1 bài khác +1đ
              </span>
              <span className="v-rules-sub">Chỉ gửi được 1 lần · bình luận tối thiểu 20 từ</span>
            </section>

            {entries.length === 0 && <p className="v-muted v-empty">Chưa có bài dự thi nào.</p>}

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

            <ul className="v-list">
              {visible.map((entry) => (
                <EntryItem
                  key={entry.id}
                  entry={entry}
                  pick={pickOf(entry)}
                  commentCount={(comments[entry.id] || NO_COMMENTS).length}
                  onOpen={openEntry}
                  onToggleReact={toggleReact}
                  onComment={openComment}
                />
              ))}
            </ul>

            {query && visible.length === 0 && <p className="v-muted v-empty">Không tìm thấy tác phẩm phù hợp.</p>}
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
                onClick={() => reactPick && openEntry(reactPick)}
                disabled={!reactPick}
              >
                <MdFavorite size={15} aria-hidden />
                <span>{reactPick ? reactPick.title : "Chưa thả tim"}</span>
              </button>
              <button
                type="button"
                className={`v-dock-pick comment${commentPick ? "" : " empty"}`}
                onClick={() => commentPick && openComment(commentPick.entry)}
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

      {sheet && !hasVoted && (
        <EntrySheet
          key={`${sheet.entry.id}-${sheet.writing}`}
          entry={sheet.entry}
          comments={comments[sheet.entry.id] || NO_COMMENTS}
          pick={pickOf(sheet.entry)}
          savedComment={commentPick?.entry.id === sheet.entry.id ? commentPick.text : null}
          hasReactElsewhere={Boolean(reactPick && reactPick.id !== sheet.entry.id)}
          hasCommentElsewhere={Boolean(commentPick && commentPick.entry.id !== sheet.entry.id)}
          startWriting={sheet.writing}
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

      {isTop3Open && <Top3Sheet entries={entries} onClose={() => setIsTop3Open(false)} />}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default VoteScreen;
