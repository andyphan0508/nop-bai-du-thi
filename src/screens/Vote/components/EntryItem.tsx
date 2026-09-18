import { memo } from "react";
import { MdFavorite, MdFavoriteBorder, MdModeComment, MdOutlineModeComment } from "react-icons/md";
import type { VoteEntry } from "../../../types";

export type PickKind = "react" | "comment" | null;

type EntryItemProps = {
  entry: VoteEntry;
  pick: PickKind;
  commentCount: number;
  onOpen: (entry: VoteEntry) => void;
  onToggleReact: (entry: VoteEntry) => void;
  onComment: (entry: VoteEntry) => void;
};

const EntryItem = ({ entry, pick, commentCount, onOpen, onToggleReact, onComment }: EntryItemProps) => {
  const isTeam = entry.entryType === "Làm nhóm";

  return (
    <li className={`v-row${pick ? ` is-${pick}` : ""}`}>
      <button className="v-row-thumb" type="button" onClick={() => onOpen(entry)} aria-label={`Xem ${entry.title}`}>
        <img className="v-thumb" src={entry.thumb} alt="" loading="lazy" decoding="async" />
      </button>

      <div className="v-row-body">
        <button className="v-item-main" type="button" onClick={() => onOpen(entry)}>
          <span className="v-item-title">{entry.title}</span>
          <span className="v-item-meta">
            <span>{isTeam ? "Nhóm" : "Cá nhân"}</span>
            {commentCount > 0 && (
              <span>
                <MdModeComment size={13} aria-hidden /> {commentCount}
              </span>
            )}
          </span>
        </button>

        {/* Hai hành động luôn nằm ngay trên dòng — không phải mở bài mới bình chọn được */}
        <div className="v-row-actions">
          <button
            className={`v-act react${pick === "react" ? " on" : ""}`}
            type="button"
            disabled={pick === "comment"}
            aria-pressed={pick === "react"}
            onClick={() => onToggleReact(entry)}
          >
            {pick === "react" ? <MdFavorite size={18} /> : <MdFavoriteBorder size={18} />}
            {pick === "react" ? "Đã tim" : "Thả tim"}
          </button>
          <button
            className={`v-act comment${pick === "comment" ? " on" : ""}`}
            type="button"
            disabled={pick === "react"}
            onClick={() => onComment(entry)}
          >
            {pick === "comment" ? <MdModeComment size={17} /> : <MdOutlineModeComment size={17} />}
            {pick === "comment" ? "Đã viết" : "Bình luận"}
          </button>
        </div>
      </div>
    </li>
  );
};

// Gõ tìm kiếm / chọn bài làm màn hình cha dựng lại — memo để chỉ dòng có dữ
// liệu đổi mới dựng lại, không phải cả danh sách.
export default memo(EntryItem);
