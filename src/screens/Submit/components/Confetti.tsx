import React, { useEffect, useState } from 'react';

const CONFETTI_COLORS = ['#e2662c', '#edb14e', '#6b4b30', '#2e7d5b', '#ffffff', '#f5d9a8'];

const createParticleStyles = (): React.CSSProperties[] => {
  return Array.from({ length: 90 }, () => {
    const size = 5 + Math.random() * 7;
    return {
      width: size,
      height: size * (0.4 + Math.random() * 0.8),
      left: `${Math.random() * 100}vw`,
      background: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      animationDuration: `${2 + Math.random() * 2.2}s`,
      animationDelay: `${Math.random() * 0.6}s`,
    };
  });
};

const Confetti = () => {
  const [particleStyles] = useState<React.CSSProperties[]>(createParticleStyles);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 5500);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const styles = createStyles();

  return (
    <div style={styles.container} aria-hidden="true">
      {particleStyles.map((particleStyle, index) => (
        <div key={index} className="confetti" style={particleStyle} />
      ))}
    </div>
  );
};

export default Confetti;

const createStyles = () => {
  return {
    container: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 } as React.CSSProperties,
  };
};
