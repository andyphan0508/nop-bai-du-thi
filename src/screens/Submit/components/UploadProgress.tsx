import React from 'react';

type UploadProgressProps = {
  progressRatio: number;
  label: string;
};

const UploadProgress = ({ progressRatio, label }: UploadProgressProps) => {
  const percent = Math.round(progressRatio * 100);

  const styles = createStyles(percent);

  return (
    <div className="progress-wrap">
      <div className="progress-info">
        <span>{label}</span>
        <b>{percent}%</b>
      </div>
      <div className="progress">
        <i style={styles.bar} />
      </div>
    </div>
  );
};

export default UploadProgress;

const createStyles = (percent: number) => {
  return {
    bar: { width: `${percent}%` } as React.CSSProperties,
  };
};
