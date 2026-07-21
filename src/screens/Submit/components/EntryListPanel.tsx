import React, { useState } from 'react';
import { MdAutoAwesome, MdEmojiEvents, MdErrorOutline, MdRefresh } from 'react-icons/md';
import type { ContestEntry } from '../../../types';
import AnimatedCounter from './AnimatedCounter';
import EntryItem from './EntryItem';

type EntryListPanelProps = {
  entries: ContestEntry[];
  entryCount: number;
  isLoading: boolean;
  error: string | null;
  freshEntryName: string | null;
  isConfigured: boolean;
  onRefresh: () => Promise<boolean>;
};

const EntryListPanel = ({
  entries,
  entryCount,
  isLoading,
  error,
  freshEntryName,
  isConfigured,
  onRefresh,
}: EntryListPanelProps) => {
  const [isSpinning, setIsSpinning] = useState<boolean>(false);

  const handleRefreshClick = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    await onRefresh();
    setIsSpinning(false);
  };

  const styles = createStyles();

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>
          <MdEmojiEvents size={22} />
          Danh sách dự thi
        </h2>
        <button
          className={isSpinning ? 'refresh spin' : 'refresh'}
          type="button"
          title="Tải lại danh sách"
          onClick={handleRefreshClick}
        >
          <MdRefresh size={20} />
        </button>
      </div>

      <AnimatedCounter value={entryCount} />

      {isLoading && (
        <div style={styles.skeletonList}>
          {[0, 1, 2].map((skeletonIndex) => (
            <div key={skeletonIndex} className="skeleton">
              <div className="sk av" />
              <div style={styles.skeletonLines}>
                <div className="sk l1" />
                <div className="sk l2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isConfigured && (
        <div className="list-note">Danh sách sẽ hiển thị sau khi trang được cấu hình ENDPOINT.</div>
      )}

      {!isLoading && isConfigured && error && (
        <div className="list-note">
          <MdErrorOutline size={16} />
          {error} Bấm nút tải lại để thử lại.
        </div>
      )}

      {!isLoading && isConfigured && !error && entries.length === 0 && (
        <div className="list-empty">
          <span className="big">
            <MdAutoAwesome size={26} />
          </span>
          Chưa có bài nộp nào.
          <br />
          Hãy là người đầu tiên!
        </div>
      )}

      {!isLoading && isConfigured && !error && entries.length > 0 && (
        <ul className="entry-list">
          {entries.map((entry, index) => (
            <EntryItem
              key={`${entry.time}-${entry.name}-${index}`}
              entry={entry}
              index={index}
              isFresh={index === 0 && freshEntryName !== null && entry.name === freshEntryName}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default EntryListPanel;

const createStyles = () => {
  return {
    skeletonList: { display: 'block' } as React.CSSProperties,
    skeletonLines: { flex: 1 } as React.CSSProperties,
  };
};
