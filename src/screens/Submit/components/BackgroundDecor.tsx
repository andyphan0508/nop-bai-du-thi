import React, { useState } from 'react';

const createStarStyles = (): React.CSSProperties[] => {
  return Array.from({ length: 26 }, () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 4}s`,
    animationDuration: `${3 + Math.random() * 4}s`,
  }));
};

const BackgroundDecor = () => {
  const [starStyles] = useState<React.CSSProperties[]>(createStarStyles);

  const styles = createStyles();

  return (
    <div className="bg-decor" style={styles.container} aria-hidden="true">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
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
