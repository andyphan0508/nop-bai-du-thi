import { useEffect, useState } from "react";
import { MdCheckCircle, MdDeleteOutline, MdDescription, MdZoomIn } from "react-icons/md";
import { formatMb } from "../../../utils/format";

type A3PreviewBoxProps = {
  file: File;
  onClear: () => void;
};

type ImageMeta = {
  width: number;
  height: number;
  isLandscape: boolean;
};

const A3PreviewBox = ({ file, onClear }: A3PreviewBoxProps) => {
  const [objectUrl, setObjectUrl] = useState<string>("");
  const [meta, setMeta] = useState<ImageMeta | null>(null);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    const img = new Image();
    img.onload = () => {
      setMeta({
        width: img.naturalWidth,
        height: img.naturalHeight,
        isLandscape: img.naturalWidth > img.naturalHeight,
      });
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const isLandscape = meta?.isLandscape ?? false;

  return (
    <>
      <div className="a3-preview-box">
        {/* Bản vẽ tờ giấy A3 thu nhỏ */}
        <div
          className={`a3-preview-sheet${isLandscape ? " landscape" : ""}`}
          onClick={() => setIsZoomed(true)}
          style={{ cursor: "pointer" }}
          title="Bấm để xem phóng to ảnh vừa chọn"
        >
          {objectUrl && <img src={objectUrl} alt="Preview bài dự thi" />}
        </div>

        {/* Thông tin kỹ thuật & chuẩn A3 */}
        <div className="a3-preview-meta">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="a3-preview-tag">
              <MdDescription size={13} />
              Khổ A3 Ngang (420 × 297mm)
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "var(--md-success)",
                fontSize: "0.76rem",
                fontWeight: 700,
              }}
            >
              <MdCheckCircle size={14} /> Sẵn sàng nộp
            </span>
          </div>

          <div className="a3-preview-title">{file.name}</div>

          <div className="a3-preview-specs">
            {meta ? (
              <>
                Độ phân giải: <b>{meta.width} × {meta.height} px</b> · Dung lượng: <b>{formatMb(file.size)}</b>
                <br />
                <span style={{ opacity: 0.85 }}>
                  Tỉ lệ: <b>{(meta.width / meta.height).toFixed(3)} : 1</b> (Chuẩn A3 Ngang ISO 216: 1.414 : 1)
                </span>
                {!isLandscape && (
                  <div style={{ marginTop: 4, color: "#d97706", fontWeight: 600, fontSize: "0.76rem" }}>
                    ⚠️ Lưu ý: Tác phẩm bìa trải rộng nên thiết kế theo Khổ A3 Ngang (420 × 297mm).
                  </div>
                )}
              </>
            ) : (
              <span>Đang kiểm tra độ phân giải ảnh…</span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
            <button
              type="button"
              className="a3-preview-remove"
              style={{ color: "var(--md-primary)", display: "inline-flex", alignItems: "center", gap: 4 }}
              onClick={() => setIsZoomed(true)}
            >
              <MdZoomIn size={16} /> Xem phóng to
            </button>
            <button type="button" className="a3-preview-remove" onClick={onClear}>
              <MdDeleteOutline size={16} /> Đổi file khác
            </button>
          </div>
        </div>
      </div>

      {/* Modal phóng to nhanh ảnh đã chọn */}
      {isZoomed && objectUrl && (
        <div className="modal-overlay" onClick={() => setIsZoomed(false)}>
          <div className="lightbox" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-topbar">
              <span className="a3-badge" style={{ position: "static", background: "var(--md-primary)" }}>
                <MdDescription size={11} /> Khổ A3 Preview
              </span>
              <button className="modal-close" type="button" title="Đóng" onClick={() => setIsZoomed(false)}>
                ✕
              </button>
            </div>
            <div className="lightbox-a3-canvas">
              <img className="lightbox-img" src={objectUrl} alt="Xem trước bài dự thi" />
            </div>
            <div className="lightbox-caption" style={{ marginTop: 10 }}>
              <b>{file.name}</b> — {meta ? `${meta.width} × ${meta.height} px` : ""}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default A3PreviewBox;
