import { useState } from "react";
import { MdClose, MdFavorite, MdHowToVote, MdLock, MdModeComment } from "react-icons/md";
import type { VoteEntry } from "../../../types";
import { submissionApi } from "../../../api/submissionApi";

type EngageModalProps = {
  reactTarget: VoteEntry | null;
  commentTarget: VoteEntry | null;
  commentText: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: (honeypot: string) => void;
};

const EngageModal = ({
  reactTarget,
  commentTarget,
  commentText,
  isSubmitting,
  errorMessage,
  onCancel,
  onConfirm,
}: EngageModalProps) => {
  const [honeypot, setHoneypot] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onConfirm(honeypot);
  };

  return (
    <div className="modal-overlay" onClick={isSubmitting ? undefined : onCancel}>
      <form className="modal ballot" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <button className="modal-close" type="button" title="Đóng" onClick={onCancel} disabled={isSubmitting}>
          <MdClose size={20} />
        </button>

        <h3>
          <MdHowToVote size={22} />
          Phiếu bình chọn tác phẩm
        </h3>

        <div className="ballot-pick">
          {reactTarget && (
            <div className="ballot-pick-row">
              <img
                src={submissionApi.voteImageUrl(reactTarget.imageFileId, 200)}
                alt=""
                style={{
                  width: 52,
                  aspectRatio: "1.4142 / 1",
                  objectFit: "cover",
                  borderRadius: 6,
                  flex: "none",
                  border: "1px solid var(--md-outline-variant)",
                  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.1)",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span className="vote-dock-badge react">
                    <MdFavorite size={11} /> +2 điểm
                  </span>
                  <span style={{ fontSize: "0.76rem", color: "var(--md-on-surface-variant)" }}>Lượt React</span>
                </div>
                <b style={{ fontSize: "0.92rem", color: "var(--md-on-surface)" }}>{reactTarget.title}</b>
              </div>
            </div>
          )}

          {commentTarget && (
            <div className="ballot-pick-row">
              <img
                src={submissionApi.voteImageUrl(commentTarget.imageFileId, 200)}
                alt=""
                style={{
                  width: 52,
                  aspectRatio: "1.4142 / 1",
                  objectFit: "cover",
                  borderRadius: 6,
                  flex: "none",
                  border: "1px solid var(--md-outline-variant)",
                  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.1)",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span className="vote-dock-badge comment">
                    <MdModeComment size={11} /> +1 điểm
                  </span>
                  <span style={{ fontSize: "0.76rem", color: "var(--md-on-surface-variant)" }}>Lượt Bình luận</span>
                </div>
                <b style={{ fontSize: "0.92rem", color: "var(--md-on-surface)" }}>{commentTarget.title}</b>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--md-on-surface-variant)",
                    fontStyle: "italic",
                    marginTop: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  "{commentText}"
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="ballot-note-plain">
          Không cần đăng nhập — mỗi thiết bị chỉ có 1 lượt React + 1 lượt bình luận, dùng 1 lần duy nhất. Sau khi xác
          nhận, thiết bị này sẽ không bình chọn thêm được nữa.
        </p>

        {/* Honeypot chống bot — ẩn khỏi người dùng thật bằng CSS, không dùng display:none
            để tránh vài trình đọc màn hình/bot bỏ qua thuộc tính này */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>

        <div className="ballot-note">
          <MdLock size={14} />
          Bình luận sẽ hiển thị công khai (ẩn danh). Mỗi thiết bị chỉ dùng đúng 1 lượt React + 1 lượt bình luận.
        </div>

        {errorMessage && <div className="msg err">{errorMessage}</div>}

        <button className="btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang gửi…" : "Xác nhận"}
        </button>
      </form>
    </div>
  );
};

export default EngageModal;
