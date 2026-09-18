import { Fragment, useState } from "react";
import { MdFavorite, MdFavoriteBorder, MdModeComment, MdOpenInFull } from "react-icons/md";
import Sheet from "./Sheet";
import type { PickKind } from "./EntryItem";
import { COMMENT_MIN_WORDS, countWords } from "../../../utils/wordCount";
import type { VoteEntry } from "../../../types";

const COMMENT_MAX_LEN = 500;

type EntrySheetProps = {
  entry: VoteEntry;
  comments: string[];
  pick: PickKind;
  // Nội dung bình luận đã lưu cho bài này (null = chưa bình luận bài này)
  savedComment: string | null;
  hasReactElsewhere: boolean;
  hasCommentElsewhere: boolean;
  readOnly: boolean;
  onToggleReact: (entry: VoteEntry) => void;
  onSaveComment: (entry: VoteEntry, text: string) => void;
  onRemoveComment: () => void;
  onClose: () => void;
};

const EntrySheet = ({
  entry,
  comments,
  pick,
  savedComment,
  hasReactElsewhere,
  hasCommentElsewhere,
  readOnly,
  onToggleReact,
  onSaveComment,
  onRemoveComment,
  onClose,
}: EntrySheetProps) => {
  const [isWriting, setIsWriting] = useState<boolean>(savedComment !== null);
  const [draft, setDraft] = useState<string>(savedComment ?? "");
  const words = countWords(draft);
  const isTeam = entry.entryType === "Làm nhóm";

  let footer = null;
  // key khác nhau → React dựng nút mới thay vì tái dùng nút cũ (tránh chớp màu chuyển tiếp)
  if (!readOnly && isWriting) {
    footer = (
      <Fragment key="compose">
        <button
          className="v-btn ghost"
          type="button"
          onClick={savedComment !== null ? onRemoveComment : () => setIsWriting(false)}
        >
          {savedComment !== null ? "Bỏ bình luận" : "Huỷ"}
        </button>
        <button
          className="v-btn primary"
          type="button"
          disabled={words < COMMENT_MIN_WORDS}
          onClick={() => onSaveComment(entry, draft.trim())}
        >
          Lưu bình luận
        </button>
      </Fragment>
    );
  } else if (!readOnly) {
    footer = (
      <Fragment key="actions">
        <button
          className={`v-btn react${pick === "react" ? " on" : ""}`}
          type="button"
          disabled={pick === "comment"}
          aria-pressed={pick === "react"}
          onClick={() => onToggleReact(entry)}
        >
          {pick === "react" ? <MdFavorite size={20} /> : <MdFavoriteBorder size={20} />}
          {pick === "react" ? "Bỏ tim" : hasReactElsewhere ? "Chuyển tim sang đây" : "Thả tim +2"}
        </button>
        <button className="v-btn comment" type="button" disabled={pick === "react"} onClick={() => setIsWriting(true)}>
          <MdModeComment size={19} />
          {hasCommentElsewhere ? "Bình luận bài này" : "Bình luận +1"}
        </button>
      </Fragment>
    );
  }

  return (
    <Sheet label={entry.title} onClose={onClose} footer={footer}>
      {/* Mở ảnh ở tab mới → dùng thao tác phóng to sẵn có của trình duyệt */}
      <a className="v-sheet-img" href={entry.image} target="_blank" rel="noopener noreferrer">
        {/* Hiện ngay ảnh nhỏ đã có sẵn trong bộ nhớ đệm, ảnh lớn phủ lên khi tải xong */}
        <img src={entry.image} alt={`Bìa dự thi: ${entry.title}`} style={{ backgroundImage: `url(${entry.thumb})` }} />
        <span className="v-zoom-hint">
          <MdOpenInFull size={14} /> Phóng to
        </span>
      </a>

      <h2 className="v-sheet-title">{entry.title}</h2>
      <div className="v-item-meta">
        <span>{isTeam ? "Nhóm" : "Cá nhân"}</span>
        <span>Khổ A3 ngang</span>
      </div>

      {!readOnly && isWriting && (
        <div className="v-compose">
          {hasCommentElsewhere && savedComment === null && (
            <p className="v-compose-note">Lưu bình luận ở đây sẽ thay cho bình luận bạn đã viết ở bài khác.</p>
          )}
          <textarea
            className="v-textarea"
            value={draft}
            maxLength={COMMENT_MAX_LEN}
            autoFocus
            rows={4}
            placeholder={`Cảm nhận thật của bạn về tác phẩm này (tối thiểu ${COMMENT_MIN_WORDS} từ)…`}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className={`v-counter${words >= COMMENT_MIN_WORDS ? " ok" : ""}`}>
            {words}/{COMMENT_MIN_WORDS} từ
          </div>
        </div>
      )}

      {entry.description && <p className="v-sheet-desc">{entry.description}</p>}

      {comments.length > 0 && (
        <section className="v-comments">
          <h3>Cảm nhận ({comments.length})</h3>
          <ul>
            {comments.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </section>
      )}
    </Sheet>
  );
};

export default EntrySheet;
