import React, { useEffect, useRef, useState } from 'react';

type AnimatedCounterProps = {
  value: number;
};

const AnimatedCounter = ({ value }: AnimatedCounterProps) => {
  const [displayedValue, setDisplayedValue] = useState<number>(0);
  const previousValueRef = useRef<number>(0);

  useEffect(() => {
    const from = previousValueRef.current;
    previousValueRef.current = value;
    const start = performance.now();
    const duration = 900;
    let frameId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedValue(Math.round(from + (value - from) * eased));
      if (t < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  const styles = createStyles();

  return (
    <div className="counter-box">
      <div className="counter" style={styles.counter}>
        {displayedValue}
      </div>
      <div className="counter-label">bạn đã nộp bài</div>
    </div>
  );
};

export default AnimatedCounter;

const createStyles = () => {
  return {
    counter: { minWidth: 44 } as React.CSSProperties,
  };
};
