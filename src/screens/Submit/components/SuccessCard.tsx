import React from 'react';

type SuccessCardProps = {
  orderNumber: number | null;
};

const SuccessCard = ({ orderNumber }: SuccessCardProps) => {
  const handleReload = () => {
    location.reload();
  };

  const styles = createStyles();

  return (
    <div className="success">
      <svg className="checkmark" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="26" />
        <path d="M16 29.5 24.5 38 40 20" />
      </svg>
      <h2>Đã nhận bài dự thi!</h2>
      {orderNumber !== null && <div className="order">🎉 Bạn là bài dự thi thứ {orderNumber}!</div>}
      <p>Cảm ơn bạn đã tham gia. Ban tổ chức đã ghi nhận bài nộp.</p>
      <button className="btn" style={styles.reloadButton} onClick={handleReload}>
        Nộp bài khác
      </button>
    </div>
  );
};

export default SuccessCard;

const createStyles = () => {
  return {
    reloadButton: { maxWidth: 240, margin: '20px auto 0' } as React.CSSProperties,
  };
};
