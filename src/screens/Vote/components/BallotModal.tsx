import { useState } from "react";
import { MdClose, MdHowToVote, MdLock } from "react-icons/md";
import type { VoteEntry } from "../../../types";

type BallotModalProps = {
  entry: VoteEntry;
  isSubmitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: (voterName: string, voterPhone: string, honeypot: string) => void;
};

const BallotModal = ({ entry, isSubmitting, errorMessage, onCancel, onConfirm }: BallotModalProps) => {
  const [voterName, setVoterName] = useState("");
  const [voterPhone, setVoterPhone] = useState("");
  // Honeypot: field ẩn khỏi mắt người dùng thật (CSS), chỉ bot điền tự động mới thấy & điền
  const [honeypot, setHoneypot] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onConfirm(voterName.trim(), voterPhone.trim(), honeypot);
  };

  return (
    <div className="modal-overlay" onClick={isSubmitting ? undefined : onCancel}>
      <form className="modal ballot" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <button className="modal-close" type="button" title="Đóng" onClick={onCancel} disabled={isSubmitting}>
          <MdClose size={20} />
        </button>

        <h3>
          <MdHowToVote size={22} />
          Xác nhận phiếu bầu
        </h3>
        <p className="ballot-pick">
          Bạn chọn: <b>{entry.title}</b> — {entry.name}
        </p>

        <div className="field">
          <label htmlFor="voterName">
            Họ và tên <span className="req">*</span>
          </label>
          <input
            id="voterName"
            className="input"
            value={voterName}
            onChange={(event) => setVoterName(event.target.value)}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="voterPhone">
            Số điện thoại <span className="req">*</span>
          </label>
          <input
            id="voterPhone"
            className="input"
            value={voterPhone}
            onChange={(event) => setVoterPhone(event.target.value)}
            placeholder="09xxxxxxxx"
            autoComplete="tel"
            required
          />
        </div>

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
          Phiếu bầu được giữ kín — SĐT chỉ dùng để đảm bảo mỗi người chỉ bình chọn 1 lần,
          không ai xem được bạn đã chọn bài nào.
        </div>

        {errorMessage && <div className="msg err">{errorMessage}</div>}

        <button className="btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang gửi phiếu…" : "Gửi phiếu bầu"}
        </button>
      </form>
    </div>
  );
};

export default BallotModal;
