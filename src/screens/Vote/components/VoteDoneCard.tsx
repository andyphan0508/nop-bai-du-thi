import { MdBarChart, MdFavorite, MdModeComment, MdOutlineVisibility } from "react-icons/md";

type VoteDoneCardProps = {
  reactedTitle?: string | null;
  commentedTitle?: string | null;
  onBrowseAll?: () => void;
  onViewStats?: () => void;
};

const VoteDoneCard = ({
  reactedTitle,
  commentedTitle,
  onBrowseAll,
  onViewStats,
}: VoteDoneCardProps) => {
  return (
    <div className="success" style={{ padding: "36px 24px" }}>
      <svg className="checkmark" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="26" />
        <path d="M16 29.5 24.5 38 40 20" />
      </svg>

      <h2 style={{ margin: "14px 0 10px", color: "var(--md-primary)" }}>
        Đã ghi nhận bình chọn thành công!
      </h2>

      <p style={{ margin: "0 0 16px", color: "var(--md-on-surface-variant)" }}>
        Cảm ơn bạn đã đồng hành và dành những tình cảm, lời khích lệ quý báu cho các tác phẩm dự thi.
      </p>

      <div
        style={{
          background: "var(--md-surface-container-low)",
          borderRadius: "var(--md-shape-lg)",
          padding: "16px 18px",
          margin: "16px 0 20px",
          border: "1px solid rgba(215, 194, 184, 0.4)",
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "var(--md-primary)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: 10,
          }}
        >
          Biên nhận bình chọn
        </div>

        {reactedTitle && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              fontSize: "0.9rem",
            }}
          >
            <span className="vote-dock-badge react">
              <MdFavorite size={12} /> React (2đ)
            </span>
            <span>
              Tác phẩm: <b>{reactedTitle}</b>
            </span>
          </div>
        )}

        {commentedTitle && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
            <span className="vote-dock-badge comment">
              <MdModeComment size={12} /> Bình luận (1đ)
            </span>
            <span>
              Tác phẩm: <b>{commentedTitle}</b>
            </span>
          </div>
        )}
      </div>

      <p className="success-note" style={{ maxWidth: 440, margin: "0 auto 20px" }}>
        Mỗi người chỉ có 1 lượt React + 1 lượt bình luận và đã được ghi nhận vào hệ thống. Bạn có
        thể theo dõi thống kê bình chọn của các tác phẩm ngay dưới đây:
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {onViewStats && (
          <button
            className="btn"
            type="button"
            style={{
              width: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--md-primary)",
              color: "#fff",
            }}
            onClick={onViewStats}
          >
            <MdBarChart size={18} />
            Xem Thống Kê & Bảng Xếp Hạng
          </button>
        )}

        {onBrowseAll && (
          <button
            className="btn btn-tonal"
            type="button"
            style={{
              width: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
            onClick={onBrowseAll}
          >
            <MdOutlineVisibility size={18} />
            Xem lại tất cả bài dự thi
          </button>
        )}
      </div>
    </div>
  );
};

export default VoteDoneCard;
