import { useEffect, type ReactNode } from "react";
import { MdClose } from "react-icons/md";

type SheetProps = {
  label: string;
  onClose: () => void;
  // Khung rộng để công bố kết quả trên máy chiếu (xem Top3Sheet)
  wide?: boolean;
  // Đang gửi thì không cho đóng ngang (bấm nền / Esc)
  locked?: boolean;
  footer?: ReactNode;
  children: ReactNode;
};

// Khung trượt từ đáy lên (điện thoại) / hộp giữa màn hình (máy tính). Nội dung
// cuộn bên trong, nút hành động luôn dính đáy — không phải cuộn tìm nút nữa.
const Sheet = ({ label, onClose, locked = false, wide = false, footer, children }: SheetProps) => {
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !locked) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [locked, onClose]);

  return (
    <div className="v-overlay" onClick={locked ? undefined : onClose}>
      <div
        className={`v-sheet${wide ? " v-sheet-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="v-sheet-close" type="button" aria-label="Đóng" onClick={onClose} disabled={locked}>
          <MdClose size={22} />
        </button>
        <div className="v-sheet-body">{children}</div>
        {footer && <div className="v-sheet-foot">{footer}</div>}
      </div>
    </div>
  );
};

export default Sheet;
