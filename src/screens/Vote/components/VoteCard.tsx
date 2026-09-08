import { MdCheckCircle, MdZoomIn } from "react-icons/md";
import type { VoteEntry } from "../../../types";

const ENTRY_TYPE_TEAM = "Làm nhóm";

type VoteCardProps = {
  entry: VoteEntry;
  imgSrc: string;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onZoom: () => void;
};

const VoteCard = ({ entry, imgSrc, isSelected, disabled, onSelect, onZoom }: VoteCardProps) => {
  const isTeam = entry.entryType === ENTRY_TYPE_TEAM;

  return (
    <div
      className={`vote-card${isSelected ? " selected" : ""}${disabled ? " disabled" : ""}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={isSelected}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="vote-card-img">
        <img src={imgSrc} alt={`Bìa dự thi: ${entry.title}`} loading="lazy" />
        <button
          className="vote-zoom"
          type="button"
          title="Xem ảnh lớn"
          onClick={(event) => {
            event.stopPropagation();
            onZoom();
          }}
        >
          <MdZoomIn size={18} />
        </button>
        {isSelected && (
          <span className="vote-check">
            <MdCheckCircle size={20} />
          </span>
        )}
      </div>

      <div className="vote-card-info">
        <div className="vote-card-title">{entry.title}</div>
        <div className="vote-card-sub">
          <span className={`type-pill ${isTeam ? "team" : "solo"}`}>{isTeam ? "Nhóm" : "Cá nhân"}</span>
          {entry.group && <span className="vote-card-group">{entry.group}</span>}
        </div>
      </div>
    </div>
  );
};

export default VoteCard;
