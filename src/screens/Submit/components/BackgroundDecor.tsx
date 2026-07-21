import React, { useState } from 'react';

const NOTE_GLYPHS = ['♪', '♫', '♬', '♩'];

const createStarStyles = (): React.CSSProperties[] => {
  return Array.from({ length: 26 }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 4}s`,
    animationDuration: `${3 + Math.random() * 4}s`,
  }));
};

type NoteStyle = React.CSSProperties & { '--sway'?: string };

const createNoteStyles = (): { glyph: string; style: NoteStyle }[] => {
  return Array.from({ length: 16 }, (_, index) => ({
    glyph: NOTE_GLYPHS[index % NOTE_GLYPHS.length],
    style: {
      left: `${Math.random() * 100}%`,
      fontSize: `${14 + Math.random() * 18}px`,
      opacity: 0.14 + Math.random() * 0.14,
      animationDelay: `${Math.random() * 14}s`,
      animationDuration: `${12 + Math.random() * 10}s`,
      '--sway': `${Math.round(Math.random() * 60 - 30)}px`,
    },
  }));
};

const BackgroundDecor = () => {
  const [starStyles] = useState<React.CSSProperties[]>(createStarStyles);
  const [noteStyles] = useState(createNoteStyles);

  const styles = createStyles();

  return (
    <div className="bg-decor" style={styles.container} aria-hidden="true">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />

      <svg className="motif church-motif" viewBox="0 0 100 100" focusable="false">
        <path d="M18 92 V44 L50 18 L82 44 V92 Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="41" y="62" width="18" height="30" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <rect x="26" y="52" width="10" height="12" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="64" y="52" width="10" height="12" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="18" x2="50" y2="4" stroke="currentColor" strokeWidth="2.4" />
        <line x1="44" y1="9" x2="56" y2="9" stroke="currentColor" strokeWidth="2.4" />
      </svg>

      <svg className="motif cross-motif" viewBox="0 0 100 100" focusable="false">
        <line x1="50" y1="6" x2="50" y2="94" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        <line x1="22" y1="30" x2="78" y2="30" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      </svg>

      {noteStyles.map(({ glyph, style }, index) => (
        <span key={index} className="note" style={style}>
          {glyph}
        </span>
      ))}

      {starStyles.map((starStyle, index) => (
        <div key={index} className="star" style={starStyle} />
      ))}
    </div>
  );
};

export default BackgroundDecor;

const createStyles = () => {
  return {
    container: { zIndex: 0 } as React.CSSProperties,
  };
};
