import { useMemo, useState } from "react";
import { MdClose, MdFavorite, MdHowToVote, MdLock, MdModeComment } from "react-icons/md";
import { IS_VOTE_AUTH_CONFIGURED } from "../../../config";
import type { VoteEntry } from "../../../types";
import GoogleSignIn from "./GoogleSignIn";

type EngageModalProps = {
  reactTarget: VoteEntry | null;
  commentTarget: VoteEntry | null;
  commentText: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: (googleIdToken: string, honeypot: string) => void;
};

type GoogleProfile = { name: string; email: string };

// Chỉ để HIỂN THỊ tên/email cho người dùng thấy họ đang đăng nhập bằng tài
// khoản nào — KHÔNG dùng để xác thực (việc xác thực thật sự nằm ở server,
// server gọi Google để kiểm tra chữ ký token, xem Code.gs verifyGoogleIdToken).
const decodeJwtPayloadForDisplay = (token: string): Record<string, unknown> | null => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
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
  const [idToken, setIdToken] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const profile = useMemo<GoogleProfile | null>(() => {
    if (!idToken) return null;
    const payload = decodeJwtPayloadForDisplay(idToken);
    if (!payload) return null;
    return { name: String(payload.name || ""), email: String(payload.email || "") };
  }, [idToken]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!idToken) return;
    onConfirm(idToken, honeypot);
  };

  return (
    <div className="modal-overlay" onClick={isSubmitting ? undefined : onCancel}>
      <form className="modal ballot" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <button className="modal-close" type="button" title="Đóng" onClick={onCancel} disabled={isSubmitting}>
          <MdClose size={20} />
        </button>

        <h3>
          <MdHowToVote size={22} />
          Xác nhận tương tác
        </h3>

        <div className="ballot-pick">
          {reactTarget && (
            <div className="ballot-pick-row">
              <MdFavorite size={16} /> React cho <b>{reactTarget.title}</b>
            </div>
          )}
          {commentTarget && (
            <div className="ballot-pick-row">
              <MdModeComment size={16} /> Bình luận cho <b>{commentTarget.title}</b>: "{commentText}"
            </div>
          )}
        </div>

        {!IS_VOTE_AUTH_CONFIGURED && (
          <div className="msg err">
            Trang chưa cấu hình đăng nhập Google / reCAPTCHA — xem HUONG-DAN.md mục "Bình chọn".
          </div>
        )}

        {IS_VOTE_AUTH_CONFIGURED && !profile && (
          <>
            <p className="ballot-note-plain">
              Đăng nhập bằng Google để xác nhận đây là bạn — mỗi tài khoản Google chỉ có 1 lượt React + 1 lượt bình
              luận, dùng 1 lần duy nhất.
            </p>
            <GoogleSignIn onCredential={setIdToken} />
          </>
        )}

        {profile && (
          <div className="google-profile">
            Đã đăng nhập: <b>{profile.name}</b>
            <br />
            {profile.email}
          </div>
        )}

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
          Bình luận sẽ hiển thị công khai (ẩn danh, không kèm tên) — tài khoản Google chỉ dùng để đảm bảo mỗi người
          chỉ dùng đúng 1 lượt React + 1 lượt bình luận.
        </div>

        {errorMessage && <div className="msg err">{errorMessage}</div>}

        <button className="btn" type="submit" disabled={isSubmitting || !profile}>
          {isSubmitting ? "Đang gửi…" : "Xác nhận"}
        </button>
      </form>
    </div>
  );
};

export default EngageModal;
