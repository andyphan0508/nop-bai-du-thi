import { useState } from "react";
import {
  MdFavorite,
  MdFavoriteBorder,
  MdModeComment,
  MdZoomIn,
  MdExpandMore,
  MdExpandLess,
  MdDescription,
} from "react-icons/md";
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
  const [showAllComments, setShowAllComments] = useState<boolean>(false);

  const displayedComments = showAllComments
    ? comments
    : comments.slice(0, COMMENTS_PREVIEW_COUNT);

  return (
    <div className={`vote-card${isSelected ? " selected" : ""}`}>
      {/* Khung hiển thị tranh tỉ lệ chuẩn A3 (1:1.4142) */}
      <div className="vote-card-img" onClick={onZoom} title="Bấm để xem phóng to khổ A3">
        <div
          className="vote-card-img-blur"
          style={{ backgroundImage: `url("${imgSrc}")` }}
          aria-hidden="true"
        />
        <img
          src={imgSrc}
          alt={`Bài dự thi: ${entry.title}`}
          loading="lazy"
        />
        <span className="a3-badge">
          <MdDescription size={11} />
          Khổ A3
        </span>
        <button
          className="vote-zoom"
          type="button"
          title="Xem ảnh lớn chuẩn A3"
          onClick={(e) => {
            e.stopPropagation();
            onZoom();
          }}
        >
          <MdZoomIn size={20} />
        </button>
      </div>

      <div className="vote-card-info">
        <div className="vote-card-title" title={entry.title}>
          Bài {order} — {entry.title}
        </div>
        <div className="vote-card-sub">
          <span className={`type-pill ${isTeam ? "team" : "solo"}`}>
            {isTeam ? "Nhóm" : "Cá nhân"}
          </span>
          {entry.group && <span className="vote-card-group">{entry.group}</span>}
        </div>
        {entry.description && (
          <p className="vote-card-desc" title={entry.description}>
            {entry.description}
          </p>
        )}

        <div className="vote-card-actions">
          <button
            type="button"
            className={`vote-react-btn${isReactSelected ? " active" : ""}`}
            onClick={onToggleReact}
            title={isReactSelected ? "Bỏ chọn React" : "Chọn React cho bài này (+2 điểm)"}
          >
            {isReactSelected ? <MdFavorite size={18} /> : <MdFavoriteBorder size={18} />}
            {isReactSelected ? "Đã React (2đ)" : "React"}
          </button>
          <button
            type="button"
            className={`vote-comment-btn${isCommentSelected ? " active" : ""}`}
            onClick={onToggleComment}
            title={isCommentSelected ? "Đóng ô bình luận" : "Viết lời bình luận (+1 điểm)"}
          >
            <MdModeComment size={17} />
            {isCommentSelected ? "Đang viết" : "Bình luận"}
          </button>
        </div>

        {isCommentSelected && (
          <div className="vote-comment-box" onClick={(e) => e.stopPropagation()}>
            <textarea
              className="vote-comment-input"
              value={commentText}
              maxLength={COMMENT_MAX_LEN}
              autoFocus
              placeholder="Viết 1 lời khích lệ / nhận xét cho tác phẩm này…"
              onChange={(event) => onCommentTextChange(event.target.value)}
            />
            <div className="vote-comment-counter">
              {commentText.length} / {COMMENT_MAX_LEN}
            </div>
          </div>
        )}

        {comments.length > 0 && (
          <div className="vote-comments">
            {displayedComments.map((text, index) => (
              <div key={index} className="vote-comment-item">
                {text}
              </div>
            ))}
            {comments.length > COMMENTS_PREVIEW_COUNT && (
              <button
                type="button"
                className="vote-comments-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllComments((prev) => !prev);
                }}
              >
                {showAllComments ? (
                  <>
                    Thu gọn <MdExpandLess size={16} />
                  </>
                ) : (
                  <>
                    +{comments.length - COMMENTS_PREVIEW_COUNT} lời khích lệ khác{" "}
                    <MdExpandMore size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoteCard;
