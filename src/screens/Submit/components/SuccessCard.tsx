import { MdCelebration, MdLockOpen } from "react-icons/md";

type SuccessCardProps = {
  // "fresh": vừa nộp xong trong phiên này; "blocked": máy này đã nộp trước đó
  variant: "fresh" | "blocked";
  orderNumber: number | null;
  name?: string | null;
  // Chỉ quản trị viên (?admin=1) thấy nút mở lại quyền nộp trên máy này
  canReset?: boolean;
  onReset?: () => void;
};

const SuccessCard = ({
  variant,
  orderNumber,
  name,
  canReset,
  onReset,
}: SuccessCardProps) => {
  return (
    <div className="success">
      <svg className="checkmark" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="26" />
        <path d="M16 29.5 24.5 38 40 20" />
      </svg>

      <h2>
        {variant === "fresh" ? "Đã nhận bài dự thi!" : "Bạn đã nộp bài rồi"}
      </h2>

      {orderNumber !== null && (
        <div className="order">
          <MdCelebration size={18} />
          {name ? `${name} — ` : ""}bài dự thi thứ {orderNumber}!
        </div>
      )}

      <p>
        {variant === "fresh"
          ? "Cảm ơn bạn đã tham gia. Ban tổ chức đã ghi nhận bài nộp."
          : "Mỗi người / mỗi máy chỉ được nộp 1 bài dự thi."}
      </p>
      <p className="success-note">
        Nếu cần chỉnh sửa hoặc nộp lại, vui lòng liên hệ Ban tổ chức.
      </p>

      {canReset && onReset && (
        <button className="btn btn-tonal" type="button" onClick={onReset}>
          <MdLockOpen size={18} />
          Cho phép nộp lại trên máy này
        </button>
      )}
    </div>
  );
};

export default SuccessCard;
