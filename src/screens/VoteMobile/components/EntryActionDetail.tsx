import { useState } from "react";
import { MdArrowBack, MdFavorite, MdFavoriteBorder, MdModeComment } from "react-icons/md";
import type { VoteEntry } from "../../../types";

const ENTRY_TYPE_TEAM = "Làm nhóm";
const COMMENT_MAX_LEN = 500;
export type TurnAction = "react" | "comment";

type EntryActionDetailProps = {
  entry: VoteEntry;
  imgSrc: string;
  comments: string[];
  availableActions: TurnAction[];
  onBack: () => void;
  onSkip: () => void;
  onConfirm: (action: TurnAction, commentText: string) => void;
};

const EntryActionDetail = ({
  entry,
  imgSrc,
  comments,
  availableActions,
  onBack,
  onSkip,
  onConfirm,
}: EntryActionDetailProps) => {
  const [selectedAction, setSelectedAction] = useState<TurnAction | null>(null);
  const [commentText, setCommentText] = useState<string>("");

  const isTeam = entry.entryType === ENTRY_TYPE_TEAM;
  const canReact = availableActions.includes("react");
  const canComment = availableActions.includes("comment");
  const canConfirm = selectedAction === "react" || (selectedAction === "comment" && commentText.trim().length > 0);

  return (
    <div className="card mobile-detail">
      <div className="mobile-topbar">
        <button className="mobile-back" type="button" onClick={onBack}>
          <MdArrowBack size={20} />
        </button>
        <span>Chọn tương tác</span>
      </div>

      <img className="mobile-detail-img" src={imgSrc} alt={`Bìa dự thi: ${entry.title}`} />

      <div className="vote-card-title" style={{ fontSize: "1.1rem", marginTop: 14 }}>
        {entry.title}
      </div>
      <div className="vote-card-sub" style={{ marginBottom: 10 }}>
        <span className={`type-pill ${isTeam ? "team" : "solo"}`}>{isTeam ? "Nhóm" : "Cá nhân"}</span>
        {entry.group && <span className="vote-card-group">{entry.group}</span>}
      </div>

      {entry.description && <p className="mobile-detail-desc">{entry.description}</p>}

      {comments.length > 0 && (
        <div className="vote-comments">
          {comments.map((text, index) => (
            <div key={index} className="vote-comment-item">
              {text}
            </div>
          ))}
        </div>
      )}

      <div className="vote-card-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className={`vote-react-btn${selectedAction === "react" ? " active" : ""}`}
          disabled={!canReact}
          title={!canReact ? "Đã dùng ở lượt kia" : undefined}
          onClick={() => setSelectedAction("react")}
        >
          {selectedAction === "react" ? <MdFavorite size={18} /> : <MdFavoriteBorder size={18} />}
          {canReact ? "React" : "Đã dùng"}
        </button>
        <button
          type="button"
          className={`vote-comment-btn${selectedAction === "comment" ? " active" : ""}`}
          disabled={!canComment}
          title={!canComment ? "Đã dùng ở lượt kia" : undefined}
          onClick={() => setSelectedAction("comment")}
        >
          <MdModeComment size={17} />
          {canComment ? "Bình luận" : "Đã dùng"}
        </button>
      </div>

      {selectedAction === "comment" && (
        <textarea
          className="vote-comment-input"
          value={commentText}
          maxLength={COMMENT_MAX_LEN}
          placeholder="Viết 1 lời khích lệ cho bài dự thi này…"
          onChange={(event) => setCommentText(event.target.value)}
        />
      )}

      <div className="mobile-detail-actions">
        <button className="btn btn-tonal" type="button" onClick={onSkip} style={{ margin: 0 }}>
          Bỏ qua lượt này
        </button>
        <button
          className="btn"
          type="button"
          disabled={!canConfirm}
          onClick={() => selectedAction && onConfirm(selectedAction, commentText.trim())}
        >
          Xác nhận lượt này
        </button>
      </div>
    </div>
  );
};

export default EntryActionDetail;
