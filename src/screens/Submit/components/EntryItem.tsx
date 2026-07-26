import React from 'react';
import { MdDeleteOutline, MdGroups, MdPerson } from 'react-icons/md';
import type { ContestEntry } from '../../../types';
import { avatarColor, initialsOf } from '../../../utils/avatar';
import { ENTRY_TYPE_TEAM } from './SubmitForm';

type EntryItemProps = {
  entry: ContestEntry;
  index: number;
  isFresh: boolean;
  onDelete?: (entry: ContestEntry) => Promise<void>;
};

const EntryItem = ({ entry, index, isFresh, onDelete }: EntryItemProps) => {
  const subText = [entry.title, entry.group].filter(Boolean).join(' · ');
  const isTeam = entry.entryType === ENTRY_TYPE_TEAM;
  const members = entry.members || [];

  const styles = createStyles(entry.name, index);

  return (
    <li className={isFresh ? 'entry fresh' : 'entry'} style={styles.item}>
      <div className="avatar" style={styles.avatar}>
        {initialsOf(entry.name || '?')}
      </div>
      <div className="entry-info">
        <div className="entry-name-row">
          <span className="entry-name">{entry.name || 'Ẩn danh'}</span>
          <span className={isTeam ? 'type-pill team' : 'type-pill solo'}>
            {isTeam ? <MdGroups size={12} /> : <MdPerson size={12} />}
            {isTeam ? 'Nhóm' : 'Cá nhân'}
          </span>
        </div>
        <div className="entry-sub">{subText}</div>
        {isTeam && members.length > 0 && (
          <div className="entry-members">
            {members.map((member, memberIndex) => (
              <span className="member-chip" key={memberIndex}>
                {member}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="entry-time">{entry.time}</div>
      {isFresh && <span className="badge-new">MỚI</span>}
      {onDelete && (
        <button
          className="entry-del"
          type="button"
          title={`Xoá bài của ${entry.name || 'bài này'}`}
          onClick={() => onDelete(entry)}
        >
          <MdDeleteOutline size={17} />
        </button>
      )}
    </li>
  );
};

export default EntryItem;

const createStyles = (name: string, index: number) => {
  return {
    item: { animationDelay: `${Math.min(index * 0.06, 0.6)}s` } as React.CSSProperties,
    avatar: { background: avatarColor(name || '?') } as React.CSSProperties,
  };
};
