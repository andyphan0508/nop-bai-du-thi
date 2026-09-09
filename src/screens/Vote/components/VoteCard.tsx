import { MdFavorite, MdFavoriteBorder, MdModeComment, MdZoomIn } from "react-icons/md";
import type { VoteEntry } from "../../../types";

const ENTRY_TYPE_TEAM = "Làm nhóm";
const COMMENT_MAX_LEN = 500;
const COMMENTS_PREVIEW_COUNT = 3;

type VoteCardProps = {
  entry: VoteEntry;
  order: number;
  imgSrc: string;
  isReactSelected: boolean;
  isCommentSelected: boolean;
  commentText: string;
  comments: string[];
  onToggleReact: () => void;
  onToggleComment: () => void;
  onCommentTextChange: (text: string) => void;
  onZoom: () => void;
};

const VoteCard = ({
  entry,
  order,
  imgSrc,
  isReactSelected,
  isCommentSelected,
  commentText,
  comments,
  onToggleReact,
  onToggleComment,
  onCommentTextChange,
  onZoom,
}: VoteCardProps) => {
  const isTeam = entry.entryType === ENTRY_TYPE_TEAM;
  const isSelected = isReactSelected || isCommentSelected;

  return (
    <div className={`vote-card${isSelected ? " selected" : ""}`}>
      <div className="vote-card-img">
        <img src={imgSrc} alt={`Bìa dự thi: ${entry.title}`} loading="lazy" />
        <button className="vote-zoom" type="button" title="Xem ảnh lớn" onClick={onZoom}>
          <MdZoomIn size={18} />
        </button>
      </div>

      <div className="vote-card-info">
        <div className="vote-card-title">
          Bài {order} — {entry.title}
        </div>
        <div className="vote-card-sub">
          <span className={`type-pill ${isTeam ? "team" : "solo"}`}>{isTeam ? "Nhóm" : "Cá nhân"}</span>
          {entry.group && <span className="vote-card-group">{entry.group}</span>}
        </div>
        {entry.description && <p className="vote-card-desc">{entry.description}</p>}

        <div className="vote-card-actions">
          <button
            type="button"
            className={`vote-react-btn${isReactSelected ? " active" : ""}`}
            onClick={onToggleReact}
          >
            {isReactSelected ? <MdFavorite size={18} /> : <MdFavoriteBorder size={18} />}
            {isReactSelected ? "Đã chọn" : "React"}
          </button>
          <button
            type="button"
            className={`vote-comment-btn${isCommentSelected ? " active" : ""}`}
            onClick={onToggleComment}
          >
            <MdModeComment size={17} />
            {isCommentSelected ? "Đang viết…" : "Bình luận"}
          </button>
        </div>

        {isCommentSelected && (
          <textarea
            className="vote-comment-input"
            value={commentText}
            maxLength={COMMENT_MAX_LEN}
            placeholder="Viết 1 lời khích lệ cho bài dự thi này…"
            onChange={(event) => onCommentTextChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
        )}

        {comments.length > 0 && (
          <div className="vote-comments">
            {comments.slice(0, COMMENTS_PREVIEW_COUNT).map((text, index) => (
              <div key={index} className="vote-comment-item">
                {text}
              </div>
            ))}
            {comments.length > COMMENTS_PREVIEW_COUNT && (
              <div className="vote-comments-more">+{comments.length - COMMENTS_PREVIEW_COUNT} lời khích lệ khác</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoteCard;
