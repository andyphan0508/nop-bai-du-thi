type VoteDoneCardProps = {
  reactedTitle?: string | null;
  commentedTitle?: string | null;
};

const VoteDoneCard = ({ reactedTitle, commentedTitle }: VoteDoneCardProps) => {
  return (
    <div className="success">
      <svg className="checkmark" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="26" />
        <path d="M16 29.5 24.5 38 40 20" />
      </svg>

      <h2>Đã ghi nhận tương tác!</h2>

      {reactedTitle && (
        <div className="order">
          Bạn đã React cho <b>{reactedTitle}</b>
        </div>
      )}
      {commentedTitle && (
        <div className="order">
          Bạn đã bình luận cho <b>{commentedTitle}</b>
        </div>
      )}

      <p>Cảm ơn bạn đã dành thời gian ủng hộ các bài dự thi.</p>
      <p className="success-note">
        Mỗi người chỉ có 1 lượt React + 1 lượt bình luận, đã dùng hết. Kết quả sẽ được Ban tổ chức công bố sau khi
        kết thúc bình chọn.
      </p>
    </div>
  );
};

export default VoteDoneCard;
