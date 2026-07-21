import React from 'react';
import FileDropBox from './FileDropBox';
import UploadProgress from './UploadProgress';
import { formatMb } from '../../../utils/format';

type SubmitFormProps = {
  isConfigured: boolean;
  requireCode: boolean;
  maxUploadMb: number;
  isSubmitting: boolean;
  uploadProgressRatio: number;
  uploadProgressLabel: string;
  submitError: string | null;
  selectedPdfFile: File | null;
  selectedSrcFile: File | null;
  onSelectPdfFile: (file: File | null) => void;
  onSelectSrcFile: (file: File | null) => void;
  onSubmit: (formData: FormData) => void;
};

const SubmitForm = ({
  isConfigured,
  requireCode,
  maxUploadMb,
  isSubmitting,
  uploadProgressRatio,
  uploadProgressLabel,
  submitError,
  selectedPdfFile,
  selectedSrcFile,
  onSelectPdfFile,
  onSelectSrcFile,
  onSubmit,
}: SubmitFormProps) => {
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  };

  const srcSubText =
    selectedSrcFile && selectedSrcFile.size > maxUploadMb * 1048576
      ? `${formatMb(selectedSrcFile.size)} — quá lớn, hãy dùng ô dán link bên dưới!`
      : `.ai, .psd, .zip — nếu file > ${maxUploadMb}MB hãy dùng ô link bên dưới`;

  const styles = createStyles();

  return (
    <form onSubmit={handleFormSubmit} style={styles.form}>
      {!isConfigured && (
        <div className="banner">
          ⚙️ Trang chưa được cấu hình: hãy dán URL Apps Script vào biến <b>ENDPOINT</b> trong{' '}
          <b>src/config.ts</b> (xem HUONG-DAN.md).
        </div>
      )}

      {submitError && <div className="msg err">{submitError}</div>}

      <div className="two">
        <div className="field">
          <label>
            Họ và tên <span className="req">*</span>
          </label>
          <input className="input" name="fullName" required />
        </div>
        <div className="field">
          <label>Nhóm / Chi hội</label>
          <input className="input" name="group" placeholder="VD: Ban Thanh Niên" />
        </div>
      </div>

      <div className="two">
        <div className="field">
          <label>
            Email <span className="req">*</span>
          </label>
          <input className="input" type="email" name="email" required />
        </div>
        <div className="field">
          <label>
            Số điện thoại <span className="req">*</span>
          </label>
          <input className="input" name="phone" required inputMode="tel" />
        </div>
      </div>

      <div className="two">
        <div className="field">
          <label>
            Tên tác phẩm <span className="req">*</span>
          </label>
          <input className="input" name="title" required />
        </div>
        <div className="field">
          <label>Thể loại / Hạng mục</label>
          <input className="input" name="category" placeholder="VD: Thiết kế bìa" />
        </div>
      </div>

      <div className="field">
        <label>Mô tả ý tưởng / Ghi chú</label>
        <textarea
          className="textarea"
          name="notes"
          placeholder="Vài dòng giới thiệu ý tưởng thiết kế (không bắt buộc)"
        />
      </div>

      {requireCode && (
        <div className="field">
          <label>
            Mã dự thi <span className="req">*</span>
          </label>
          <input className="input" name="accessCode" required placeholder="Mã do Ban tổ chức cung cấp" />
        </div>
      )}

      <div className="field">
        <label>
          Bản PDF dự thi <span className="req">*</span>
        </label>
        <FileDropBox
          inputId="pdfInput"
          icon="📄"
          emptyText="Chọn / kéo thả file PDF vào đây"
          subText="Chỉ nhận .pdf"
          accept="application/pdf,.pdf"
          file={selectedPdfFile}
          onSelectFile={onSelectPdfFile}
        />
      </div>

      <div className="field">
        <label>File thiết kế nguồn (.ai / .psd)</label>
        <FileDropBox
          inputId="srcInput"
          icon="🎨"
          emptyText="Chọn / kéo thả file nguồn vào đây"
          subText={srcSubText}
          accept=".ai,.psd,.zip,image/vnd.adobe.photoshop,application/postscript,application/illustrator"
          file={selectedSrcFile}
          onSelectFile={onSelectSrcFile}
        />
        <div className="divider">hoặc</div>
        <input
          className="input"
          name="sourceLink"
          placeholder="Dán link Google Drive của file nguồn (cho file nặng)"
        />
        <div className="hint">
          Nếu file .ai/.psd quá nặng: tải lên Google Drive của bạn, đặt chia sẻ "Bất kỳ ai có link", rồi dán
          link vào đây.
        </div>
      </div>

      <button className="btn" type="submit" disabled={isSubmitting}>
        🚀 Gửi bài dự thi
      </button>

      {isSubmitting && <UploadProgress progressRatio={uploadProgressRatio} label={uploadProgressLabel} />}
    </form>
  );
};

export default SubmitForm;

const createStyles = () => {
  return {
    form: { margin: 0 } as React.CSSProperties,
  };
};
