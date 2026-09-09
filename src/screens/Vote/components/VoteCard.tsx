import { useState } from "react";
import {
  MdFavorite,
  MdFavoriteBorder,
  MdModeComment,
  MdZoomIn,
  MdExpandMore,
  MdExpandLess,
  MdDescription,
  MdClose,
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
  isReactDisabled?: boolean;
  isCommentDisabled?: boolean;
  hideReactButton?: boolean;
  hideCommentButton?: boolean;
  commentText: string;
  comments: string[];
  onToggleReact: () => void;
  onToggleComment: () => void;
  onDeselect?: () => void;
  onCommentTextChange: (text: string) => void;
  onZoom: () => void;
};

const VoteCard = ({
  entry,
  order,
  imgSrc,
  isReactSelected,
  isCommentSelected,
  isReactDisabled = false,
  isCommentDisabled = false,
  hideReactButton = false,
  hideCommentButton = false,
  commentText,
  comments,
  onToggleReact,
  onToggleComment,
  onDeselect,
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
          {!hideReactButton && (
            <button
              type="button"
              disabled={isReactDisabled}
              className={`vote-react-btn${isReactSelected ? " active" : ""}`}
              onClick={onToggleReact}
              title={
                isReactSelected
                  ? "Bài này đã được chọn React (+2đ)"
                  : isReactDisabled
                    ? "Đã chọn React ở bài khác hoặc bài này đã được vote"
                    : "Chọn React cho bài này (+2 điểm)"
              }
            >
              {isReactSelected ? <MdFavorite size={18} /> : <MdFavoriteBorder size={18} />}
              {isReactSelected ? "Đã React (2đ)" : "React (+2đ)"}
            </button>
          )}

          {!hideCommentButton && (
            <button
              type="button"
              disabled={isCommentDisabled}
              className={`vote-comment-btn${isCommentSelected ? " active" : ""}`}
              onClick={onToggleComment}
              title={
                isCommentSelected
                  ? "Đang viết bình luận cho bài này"
                  : isCommentDisabled
                    ? isReactSelected
                      ? "Bài này đã nhận React, không thể bình luận thêm"
                      : "Đã chọn bình luận ở bài khác hoặc bài này đã được vote"
                    : "Viết lời bình luận cho bài này (+1 điểm)"
              }
            >
              <MdModeComment size={17} />
              {isCommentSelected ? "Đang viết (+1đ)" : "Bình luận (+1đ)"}
            </button>
          )}

          {onDeselect && (
            <button
              type="button"
              className="vote-card-deselect-btn"
              onClick={onDeselect}
              title="Hủy lựa chọn bài này"
            >
              <MdClose size={15} />
              <span>Hủy</span>
            </button>
          )}
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
