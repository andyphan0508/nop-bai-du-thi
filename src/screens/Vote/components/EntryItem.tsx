import { memo } from "react";
import { MdFavorite, MdFavoriteBorder, MdModeComment } from "react-icons/md";
import type { VoteEntry } from "../../../types";

export type PickKind = "react" | "comment" | null;

type EntryItemProps = {
  entry: VoteEntry;
  // "featured" = thẻ lớn trong nhóm 3 bài nổi bật, còn lại là dòng gọn
  featured?: boolean;
  pick: PickKind;
  commentCount: number;
  readOnly: boolean;
  onOpen: (entry: VoteEntry) => void;
  onToggleReact: (entry: VoteEntry) => void;
};

const EntryItem = ({ entry, featured = false, pick, commentCount, readOnly, onOpen, onToggleReact }: EntryItemProps) => {
  const isTeam = entry.entryType === "Làm nhóm";

  return (
    <li className={`${featured ? "v-feat" : "v-row"}${pick ? ` is-${pick}` : ""}`}>
      <button className="v-item-main" type="button" onClick={() => onOpen(entry)}>
        <img
          className="v-thumb"
          src={entry.thumb}
          alt=""
          loading={featured ? "eager" : "lazy"}
          decoding="async"
        />
        <span className="v-item-text">
          <span className="v-item-title">{entry.title}</span>
          <span className="v-item-meta">
            <span>{isTeam ? "Nhóm" : "Cá nhân"}</span>
            {commentCount > 0 && (
              <span>
                <MdModeComment size={13} aria-hidden /> {commentCount}
              </span>
            )}
            {pick === "comment" && <span className="v-chip comment">Bạn bình luận</span>}
          </span>
        </span>
      </button>

      {!readOnly && (
        <button
          className={`v-heart${pick === "react" ? " on" : ""}`}
          type="button"
          disabled={pick === "comment"}
          aria-pressed={pick === "react"}
          aria-label={pick === "react" ? `Bỏ thả tim: ${entry.title}` : `Thả tim (+2đ): ${entry.title}`}
          onClick={() => onToggleReact(entry)}
        >
          {pick === "react" ? <MdFavorite size={24} /> : <MdFavoriteBorder size={24} />}
        </button>
      )}
    </li>
  );
};

// Gõ tìm kiếm / chọn bài làm màn hình cha dựng lại — memo để chỉ dòng có dữ
// liệu đổi mới dựng lại, không phải cả danh sách.
export default memo(EntryItem);
