import { MdArrowBack, MdChevronRight } from "react-icons/md";
import type { VoteEntry } from "../../../types";

const ENTRY_TYPE_TEAM = "Làm nhóm";

type EntryPickerListProps = {
  title: string;
  entries: VoteEntry[];
  excludeEntryId: string | null;
  imageUrlFor: (fileId: string) => string;
  onSelect: (entry: VoteEntry) => void;
  onBack: () => void;
};

const EntryPickerList = ({ title, entries, excludeEntryId, imageUrlFor, onSelect, onBack }: EntryPickerListProps) => {
  const visibleEntries = entries.filter((entry) => entry.id !== excludeEntryId);

  return (
    <div className="card mobile-list">
      <div className="mobile-topbar">
        <button className="mobile-back" type="button" onClick={onBack}>
          <MdArrowBack size={20} />
        </button>
        <span>{title}</span>
      </div>

      {excludeEntryId && (
        <p className="ballot-note-plain">Đã chọn 1 bài ở lượt kia — bài đó không hiện lại ở đây, hãy chọn bài khác.</p>
      )}

      <ul className="mobile-entry-list">
        {visibleEntries.map((entry) => {
          const isTeam = entry.entryType === ENTRY_TYPE_TEAM;
          return (
            <li key={entry.id}>
              <button className="mobile-entry-row" type="button" onClick={() => onSelect(entry)}>
                <img src={imageUrlFor(entry.imageFileId)} alt="" loading="lazy" />
                <span className="mobile-entry-row-info">
                  <span className="mobile-entry-row-title">{entry.title}</span>
                  <span className="vote-card-sub">
                    <span className={`type-pill ${isTeam ? "team" : "solo"}`}>{isTeam ? "Nhóm" : "Cá nhân"}</span>
                    {entry.group && <span className="vote-card-group">{entry.group}</span>}
                  </span>
                </span>
                <MdChevronRight size={22} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default EntryPickerList;
