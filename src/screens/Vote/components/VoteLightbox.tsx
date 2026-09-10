import { useEffect } from "react";
import {
  MdClose,
  MdChevronLeft,
  MdChevronRight,
  MdDescription,
} from "react-icons/md";
import type { VoteEntry } from "../../../types";

type VoteLightboxProps = {
  entry: VoteEntry;
  order: number;
  total: number;
  imgSrc: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

const VoteLightbox = ({
  entry,
  order,
  total,
  imgSrc,
  onClose,
  onPrev,
  onNext,
}: VoteLightboxProps) => {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && onPrev) onPrev();
      if (event.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);

  const isTeam = entry.entryType === "Làm nhóm";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="lightbox" onClick={(event) => event.stopPropagation()}>
        {/* Topbar: thông tin số bài và nút đóng */}
        <div className="lightbox-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="a3-badge" style={{ position: "static", background: "var(--md-primary)" }}>
              <MdDescription size={11} /> Khổ A3
            </span>
            <span>
              Bài {order} / {total}
            </span>
          </div>
          <button className="modal-close" type="button" title="Đóng (Esc)" onClick={onClose}>
            <MdClose size={20} />
          </button>
        </div>

        {/* Khung Canvas hiển thị A3 */}
        <div className="lightbox-a3-canvas">
          {onPrev && (
            <button
              className="lightbox-nav-btn lightbox-nav-prev"
              type="button"
              title="Bài trước (Mũi tên trái)"
              onClick={onPrev}
            >
              <MdChevronLeft size={28} />
            </button>
          )}

          <img
            className="lightbox-img"
            src={imgSrc}
            alt={`Bìa dự thi: ${entry.title}`}
          />

          {onNext && (
            <button
              className="lightbox-nav-btn lightbox-nav-next"
              type="button"
              title="Bài tiếp theo (Mũi tên phải)"
              onClick={onNext}
            >
              <MdChevronRight size={28} />
            </button>
          )}
        </div>

        {/* Metadata tác phẩm */}
        <div className="lightbox-meta">
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--md-on-surface)" }}>
              {entry.title}
            </div>
            <div className="vote-card-sub" style={{ marginTop: 4 }}>
              <span className={`type-pill ${isTeam ? "team" : "solo"}`}>
                {isTeam ? "Nhóm" : "Cá nhân"}
              </span>
            </div>
          </div>
          {entry.description && (
            <div style={{ maxWidth: "480px", fontSize: "0.84rem", color: "var(--md-on-surface-variant)" }}>
              {entry.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoteLightbox;
