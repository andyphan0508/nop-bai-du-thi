import { useState } from "react";
import { MdFavorite, MdLockOutline, MdModeComment } from "react-icons/md";
import Sheet from "./Sheet";
import type { VoteEntry } from "../../../types";

type ConfirmSheetProps = {
  reactTarget: VoteEntry | null;
  commentTarget: VoteEntry | null;
  commentText: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: (honeypot: string) => void;
};

const ConfirmSheet = ({
  reactTarget,
  commentTarget,
  commentText,
  isSubmitting,
  errorMessage,
  onCancel,
  onConfirm,
}: ConfirmSheetProps) => {
  const [honeypot, setHoneypot] = useState("");
  const points = (reactTarget ? 2 : 0) + (commentTarget ? 1 : 0);

  return (
    <Sheet
      label="Xác nhận bình chọn"
      onClose={onCancel}
      locked={isSubmitting}
      footer={
        <>
          <button className="v-btn ghost" type="button" onClick={onCancel} disabled={isSubmitting}>
            Xem lại
          </button>
          <button className="v-btn primary" type="button" onClick={() => onConfirm(honeypot)} disabled={isSubmitting}>
            {isSubmitting ? <span className="v-spinner" aria-hidden /> : null}
            {isSubmitting ? "Đang gửi…" : `Gửi phiếu (${points}đ)`}
          </button>
        </>
      }
    >
      <h2 className="v-sheet-title">Xác nhận phiếu bình chọn</h2>
      <p className="v-muted">Phiếu chỉ gửi được 1 lần — gửi rồi không đổi được nữa.</p>

      <ul className="v-ballot">
        {reactTarget && (
          <li>
            <img src={reactTarget.thumb} alt="" />
            <div>
              <span className="v-chip react">
                <MdFavorite size={12} /> Thả tim +2
              </span>
              <b>{reactTarget.title}</b>
            </div>
          </li>
        )}
        {commentTarget && (
          <li>
            <img src={commentTarget.thumb} alt="" />
            <div>
              <span className="v-chip comment">
                <MdModeComment size={12} /> Bình luận +1
              </span>
              <b>{commentTarget.title}</b>
              <q>{commentText}</q>
            </div>
          </li>
        )}
      </ul>

      {!reactTarget || !commentTarget ? (
        <p className="v-hint">
          Bạn mới dùng 1 trong 2 lượt. Có thể gửi luôn, hoặc bấm “Xem lại” để{" "}
          {reactTarget ? "bình luận thêm 1 bài khác (+1đ)" : "thả tim thêm 1 bài khác (+2đ)"}.
        </p>
      ) : null}

      <p className="v-note">
        <MdLockOutline size={16} aria-hidden />
        Phiếu kín. Bình luận hiển thị công khai nhưng ẩn danh.
      </p>

      {/* Honeypot chống bot — ẩn bằng CSS, người dùng thật không thấy */}
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

      {errorMessage && (
        <div className="v-alert" role="alert">
          {errorMessage}
        </div>
      )}
    </Sheet>
  );
};

export default ConfirmSheet;
