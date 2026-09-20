import { useState, type FormEvent } from "react";
import { MdEmojiEvents, MdRefresh } from "react-icons/md";
import Sheet from "./Sheet";
import { submissionApi } from "../../../api/submissionApi";
import type { Top3Response, VoteEntry } from "../../../types";

const ADMIN_KEY_STORAGE = "nbdt-admin-key";

type Top3SheetProps = {
  entries: VoteEntry[];
  onClose: () => void;
};

// Kết quả cho quản trị viên: 3 bài điểm cao nhất, xếp theo tên (máy chủ đã
// bỏ thứ hạng + điểm) — công bố "top 3" mà không lộ ai hạng 1-2-3.
const Top3Sheet = ({ entries, onClose }: Top3SheetProps) => {
  const [adminKey, setAdminKey] = useState<string>(() => {
    try {
      return sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
    } catch {
      return "";
    }
  });
  const [result, setResult] = useState<NonNullable<Top3Response["entries"]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const load = async (event?: FormEvent) => {
    event?.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await submissionApi.getTop3(adminKey.trim());
      if (!response.ok) throw new Error(response.error || "Không tải được kết quả.");
      setResult(response.entries || []);
      try {
        sessionStorage.setItem(ADMIN_KEY_STORAGE, adminKey.trim());
      } catch {
        // Không nhớ được mã thì lần sau nhập lại
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Ảnh bản lớn: khung công bố chiếu lên máy chiếu, ảnh 640px sẽ bị vỡ
  const imageOf = (id: string) => entries.find((entry) => entry.id === id)?.image;

  return (
    <Sheet label="Top 3 bình chọn" onClose={onClose} wide={result !== null && result.length > 0}>
      <h2 className="v-sheet-title">
        <MdEmojiEvents size={22} aria-hidden style={{ verticalAlign: -4, color: "var(--brand)" }} /> Top 3 bình chọn
      </h2>
      <p className="v-muted">Các bài có tổng điểm cao nhất — không xếp theo thứ hạng.</p>

      {result === null ? (
        <form className="v-admin-form" onSubmit={load}>
          <input
            className="v-input"
            type="password"
            value={adminKey}
            placeholder="Mã quản trị"
            aria-label="Mã quản trị"
            autoComplete="current-password"
            onChange={(event) => setAdminKey(event.target.value)}
          />
          <button className="v-btn primary" type="submit" disabled={!adminKey.trim() || isLoading}>
            {isLoading && <span className="v-spinner" aria-hidden />}
            Xem kết quả
          </button>
        </form>
      ) : result.length === 0 ? (
        <p className="v-empty v-muted">Chưa có bài nào được bình chọn.</p>
      ) : (
        <ul className="v-top3">
          {result.map((item) => (
            <li key={item.id}>
              {imageOf(item.id) && <img src={imageOf(item.id)} alt="" />}
              <b>{item.title}</b>
              <span className="v-muted">{item.name}</span>
            </li>
          ))}
        </ul>
      )}

      {result && result.length > 3 && <p className="v-hint">Có bài đồng điểm ở vị trí thứ 3 nên danh sách nhiều hơn 3 bài.</p>}

      {/* Kết quả lấy thẳng từ Sheet lúc bấm — nút này để xem lại số mới nhất
          khi vẫn đang bình chọn, khỏi phải đóng rồi mở lại khung. */}
      {result !== null && (
        <button className="v-btn ghost v-top3-refresh" type="button" disabled={isLoading} onClick={() => load()}>
          {isLoading ? <span className="v-spinner dark" aria-hidden /> : <MdRefresh size={18} />}
          Làm mới kết quả
        </button>
      )}
      {error && (
        <div className="v-alert" role="alert">
          {error}
        </div>
      )}
    </Sheet>
  );
};

export default Top3Sheet;
