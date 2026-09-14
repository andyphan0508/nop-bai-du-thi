import { MdCloudQueue } from "react-icons/md";

type VoteSkeletonProps = {
  // "grid" = lưới thẻ bản desktop, "list" = danh sách dọc bản mobile
  variant: "grid" | "list";
  // Máy chủ Apps Script "ngủ" khi rảnh, lượt gọi đánh thức mất tới ~17 giây.
  // Chờ quá lâu mà màn hình im lặng thì người dùng tưởng hỏng và tải lại trang
  // (càng làm chậm thêm) — nên nói thẳng cho họ biết chuyện gì đang xảy ra.
  isSlow?: boolean;
};

const GRID_COUNT = 6;
const LIST_COUNT = 5;

const VoteSkeleton = ({ variant, isSlow = false }: VoteSkeletonProps) => {
  const count = variant === "grid" ? GRID_COUNT : LIST_COUNT;

  return (
    <div aria-busy="true" aria-live="polite">
      <p className="vote-skeleton-note">
        {isSlow ? (
          <>
            <MdCloudQueue size={16} />
            Máy chủ đang khởi động, chờ thêm chút nhé — lần sau sẽ nhanh hơn nhiều.
          </>
        ) : (
          "Đang tải tác phẩm dự thi…"
        )}
      </p>

      <div className={variant === "grid" ? "vote-grid" : "vote-skeleton-list"}>
        {Array.from({ length: count }, (_, index) =>
          variant === "grid" ? (
            <div className="vote-skeleton-card" key={index}>
              <div className="sk vote-skeleton-img" />
              <div className="vote-skeleton-body">
                <div className="sk l1" />
                <div className="sk l2" />
              </div>
            </div>
          ) : (
            <div className="vote-skeleton-row" key={index}>
              <div className="sk vote-skeleton-thumb" />
              <div style={{ flex: 1 }}>
                <div className="sk l1" />
                <div className="sk l2" />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
};

export default VoteSkeleton;
