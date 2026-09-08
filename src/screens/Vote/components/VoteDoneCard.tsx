type VoteDoneCardProps = {
  pickedTitle?: string | null;
};

const VoteDoneCard = ({ pickedTitle }: VoteDoneCardProps) => {
  return (
    <div className="success">
      <svg className="checkmark" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="26" />
        <path d="M16 29.5 24.5 38 40 20" />
      </svg>

      <h2>Đã ghi nhận phiếu bầu!</h2>

      {pickedTitle && (
        <div className="order">
          Bạn đã bình chọn cho <b>{pickedTitle}</b>
        </div>
      )}

      <p>Cảm ơn bạn đã dành thời gian bình chọn cho bài dự thi yêu thích.</p>
      <p className="success-note">
        Mỗi người chỉ được bình chọn 1 lần. Kết quả sẽ được Ban tổ chức công bố sau khi kết thúc bình chọn.
      </p>
    </div>
  );
};

export default VoteDoneCard;
