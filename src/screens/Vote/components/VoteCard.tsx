import React, { useState } from "react";
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
import { COMMENT_MIN_WORDS, countWords } from "../../../utils/wordCount";

const ENTRY_TYPE_TEAM = "Làm nhóm";
const COMMENT_MAX_LEN = 500;
const COMMENTS_PREVIEW_COUNT = 3;

type VoteCardProps = {
  entry: VoteEntry;
  order: number;
  // Thứ tự thẻ trong lưới — chỉ dùng để hiệu ứng lộ diện so le (xem --card-index)
  cardIndex?: number;
  imgSrc: string;
  isReactSelected: boolean;
  isCommentSelected: boolean;
  isReactDisabled?: boolean;
  isCommentDisabled?: boolean;
  hideReactButton?: boolean;
  hideCommentButton?: boolean;
  commentText: string;
  comments: string[];
  // Các hàm này nhận vào entry/cardIndex thay vì "đóng gói" sẵn bên ngoài, để
  // chúng giữ nguyên danh tính qua các lần dựng lại — điều kiện bắt buộc để
  // React.memo bên dưới phát huy tác dụng.
  canDeselect?: boolean;
  onToggleReact: (entry: VoteEntry) => void;
  onToggleComment: (entry: VoteEntry) => void;
  onDeselect: (entry: VoteEntry) => void;
  onCommentTextChange: (text: string) => void;
  onZoom: (cardIndex: number) => void;
};

const VoteCard = ({
  entry,
  order,
  cardIndex = 0,
  imgSrc,
  isReactSelected,
  isCommentSelected,
  isReactDisabled = false,
  isCommentDisabled = false,
  hideReactButton = false,
  hideCommentButton = false,
  commentText,
  comments,
  canDeselect = false,
  onToggleReact,
  onToggleComment,
  onDeselect,
  onCommentTextChange,
  onZoom,
}: VoteCardProps) => {
  const isTeam = entry.entryType === ENTRY_TYPE_TEAM;
  const isSelected = isReactSelected || isCommentSelected;
  const [showAllComments, setShowAllComments] = useState<boolean>(false);
  // Ảnh từ Google Drive tải khá chậm — cho hiện dần khi xong thay vì nhảy đột
  // ngột vào khung trống. Dùng kèm ref vì ảnh đã nằm sẵn trong bộ nhớ đệm thì
  // sự kiện onLoad không bắn ra nữa, ảnh sẽ kẹt ở trạng thái trong suốt.
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  const displayedComments = showAllComments
    ? comments
    : comments.slice(0, COMMENTS_PREVIEW_COUNT);

  return (
    <div
      className={`vote-card${isSelected ? " selected" : ""}`}
      style={{ "--card-index": Math.min(cardIndex, 11) } as React.CSSProperties}
    >
      {/* Khung hiển thị tranh tỉ lệ chuẩn A3 (1:1.4142) */}
      <div className="vote-card-img" onClick={() => onZoom(cardIndex)} title="Bấm để xem phóng to khổ A3">
        <img
          src={imgSrc}
          alt={`Bài dự thi: ${entry.title}`}
          className={isImageLoaded ? "is-loaded" : ""}
          loading="lazy"
          decoding="async"
          ref={(node) => {
            if (node?.complete) setIsImageLoaded(true);
          }}
          onLoad={() => setIsImageLoaded(true)}
          onError={() => setIsImageLoaded(true)}
        />
        <span className="a3-badge">
          <MdDescription size={11} />
          Khổ A3
        </span>
        {isReactSelected && (
          <span className="vote-pick-flag react">
            <MdFavorite size={12} /> Bạn đã chọn thả tim
          </span>
        )}
        {isCommentSelected && (
          <span className="vote-pick-flag comment">
            <MdModeComment size={12} /> Bạn đang bình luận bài này
          </span>
        )}
        <button
          className="vote-zoom"
          type="button"
          title="Xem ảnh lớn chuẩn A3"
          onClick={(e) => {
            e.stopPropagation();
            onZoom(cardIndex);
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
        </div>
        {entry.description && (
          <p className="vote-card-desc" title={entry.description}>
            {entry.description}
          </p>
        )}

        <div
          className={`vote-card-actions${
            (!hideReactButton ? 1 : 0) + (!hideCommentButton ? 1 : 0) + (canDeselect ? 1 : 0) > 1
              ? " has-multiple"
              : ""
          }${canDeselect ? " has-deselect" : ""}`}
        >
          {!hideReactButton && (
            <button
              type="button"
              disabled={isReactDisabled}
              className={`vote-react-btn${isReactSelected ? " active" : ""}`}
              onClick={() => onToggleReact(entry)}
              title={
                isReactSelected
                  ? "Bài này đã được chọn React (+2đ)"
                  : isReactDisabled
                    ? "Đã chọn React ở bài khác hoặc bài này đã được vote"
                    : "Chọn React cho bài này (+2 điểm)"
              }
            >
              {isReactSelected ? (
                <MdFavorite size={18} className="vote-btn-icon" />
              ) : (
                <MdFavoriteBorder size={18} className="vote-btn-icon" />
              )}
              <span className="vote-btn-label">
                {isReactSelected ? "Đã React (2đ)" : "React (+2đ)"}
              </span>
            </button>
          )}

          {!hideCommentButton && (
            <button
              type="button"
              disabled={isCommentDisabled}
              className={`vote-comment-btn${isCommentSelected ? " active" : ""}`}
              onClick={() => onToggleComment(entry)}
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
              <MdModeComment size={17} className="vote-btn-icon" />
              <span className="vote-btn-label">
                {isCommentSelected ? "Đang viết (+1đ)" : "Bình luận (+1đ)"}
              </span>
            </button>
          )}

          {canDeselect && (
            <button
              type="button"
              className="vote-card-deselect-btn"
              onClick={() => onDeselect(entry)}
              title="Hủy lựa chọn bài này"
            >
              <MdClose size={16} className="vote-btn-icon" />
              <span className="vote-btn-label">Hủy</span>
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
              placeholder="Viết cảm nhận thật về tác phẩm này (tối thiểu 20 từ)…"
              onChange={(event) => onCommentTextChange(event.target.value)}
            />
            <div className={`vote-comment-counter${countWords(commentText) < COMMENT_MIN_WORDS ? " too-short" : " ok"}`}>
              {countWords(commentText)} / {COMMENT_MIN_WORDS} từ tối thiểu
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

// Gõ 1 ký tự vào ô bình luận làm màn hình cha dựng lại, kéo theo TOÀN BỘ thẻ
// trong lưới dựng lại theo — với vài chục bài thì mỗi phím gõ là một lần khựng.
// Bọc memo để thẻ chỉ dựng lại khi dữ liệu của chính nó đổi.
export default React.memo(VoteCard);
