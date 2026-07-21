import React from 'react';
import type { ContestEntry } from '../../../types';
import { avatarColor, initialsOf } from '../../../utils/avatar';

type EntryItemProps = {
  entry: ContestEntry;
  index: number;
  isFresh: boolean;
};

const EntryItem = ({ entry, index, isFresh }: EntryItemProps) => {
  const subText = [entry.title, entry.group].filter(Boolean).join(' · ');

  const styles = createStyles(entry.name, index);

  return (
    <li className={isFresh ? 'entry fresh' : 'entry'} style={styles.item}>
      <div className="avatar" style={styles.avatar}>
        {initialsOf(entry.name || '?')}
      </div>
      <div className="entry-info">
        <div className="entry-name">{entry.name || 'Ẩn danh'}</div>
        <div className="entry-sub">{subText}</div>
      </div>
      <div className="entry-time">{entry.time}</div>
      {isFresh && <span className="badge-new">MỚI</span>}
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
