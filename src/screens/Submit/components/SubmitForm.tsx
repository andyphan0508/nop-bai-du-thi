import React, { useState } from 'react';
import {
  MdBrush,
  MdCheck,
  MdErrorOutline,
  MdGroups,
  MdInfoOutline,
  MdPerson,
  MdPictureAsPdf,
  MdSend,
  MdSettingsSuggest,
} from 'react-icons/md';
import FileDropBox from './FileDropBox';
import UploadProgress from './UploadProgress';
import { formatMb } from '../../../utils/format';

const GROUP_OPTIONS = ['Áp-ra-ham', 'Ti-mô-thê', 'Phao-lô', 'Đa-vít', 'Nhóm ban ngành'];

export const ENTRY_TYPE_SOLO = 'Cá nhân';
export const ENTRY_TYPE_TEAM = 'Làm nhóm';
const TEAM_MEMBER_COUNT = 3;

type SubmitFormProps = {
  isConfigured: boolean;
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
  const [entryType, setEntryType] = useState<string>(ENTRY_TYPE_SOLO);

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
    <form onSubmit={handleFormSubmit} noValidate style={styles.form}>
      {!isConfigured && (
        <div className="banner">
          <MdSettingsSuggest size={18} />
          <span>
            Trang chưa được cấu hình: hãy dán URL Apps Script vào biến <b>ENDPOINT</b> trong{' '}
            <b>src/config.ts</b> (xem HUONG-DAN.md).
          </span>
        </div>
      )}

      {submitError && (
        <div className="msg err">
          <MdErrorOutline size={18} />
          <span>{submitError}</span>
        </div>
      )}

      <div className="two">
        <div className="field">
          <label>
            Họ và tên <span className="req">*</span>
          </label>
          <input className="input" name="fullName" required />
        </div>
        <div className="field">
          <label>
            Nhóm / Ban ngành <span className="req">*</span>
          </label>
          <select className="input select" name="group" required defaultValue="">
            <option value="" disabled>
              — Chọn nhóm / ban ngành —
            </option>
            {GROUP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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

      <div className="field">
        <label>
          Tên tác phẩm <span className="req">*</span>
        </label>
        <input className="input" name="title" required />
      </div>

      <div className="field">
        <label>
          Hình thức dự thi <span className="req">*</span>
        </label>
        <div className="segmented">
          <label className={entryType === ENTRY_TYPE_SOLO ? 'segment active' : 'segment'}>
            <input
              type="radio"
              name="entryType"
              value={ENTRY_TYPE_SOLO}
              checked={entryType === ENTRY_TYPE_SOLO}
              onChange={() => setEntryType(ENTRY_TYPE_SOLO)}
            />
            <span className="segment-icon">
              {entryType === ENTRY_TYPE_SOLO ? <MdCheck size={18} /> : <MdPerson size={18} />}
            </span>
            <span>Cá nhân</span>
          </label>
          <label className={entryType === ENTRY_TYPE_TEAM ? 'segment active' : 'segment'}>
            <input
              type="radio"
              name="entryType"
              value={ENTRY_TYPE_TEAM}
              checked={entryType === ENTRY_TYPE_TEAM}
              onChange={() => setEntryType(ENTRY_TYPE_TEAM)}
            />
            <span className="segment-icon">
              {entryType === ENTRY_TYPE_TEAM ? <MdCheck size={18} /> : <MdGroups size={18} />}
            </span>
            <span>Làm nhóm</span>
          </label>
        </div>
      </div>

      {entryType === ENTRY_TYPE_TEAM && (
        <div className="field member-fields">
          <label>
            Danh sách thành viên nhóm ({TEAM_MEMBER_COUNT} bạn) <span className="req">*</span>
          </label>
          <div className="member-card">
            {Array.from({ length: TEAM_MEMBER_COUNT }, (_, index) => (
              <div className="member-row" key={index}>
                <span className="member-num">{index + 1}</span>
                <input
                  className="input member-input"
                  name={`member${index + 1}`}
                  required
                  placeholder={`Họ tên thành viên ${index + 1}`}
                />
              </div>
            ))}
            <div className="hint member-hint">
              <MdInfoOutline size={14} />
              Ghi đầy đủ họ tên của cả {TEAM_MEMBER_COUNT} bạn trong nhóm.
            </div>
          </div>
        </div>
      )}

      <div className="field">
        <label>
          Mô tả ý tưởng / Ghi chú <span className="req">*</span>
        </label>
        <textarea
          className="textarea"
          name="notes"
          required
          placeholder="Vài dòng giới thiệu ý tưởng thiết kế của bạn"
        />
      </div>

      <div className="field">
        <label>
          Bản PDF dự thi <span className="req">*</span>
        </label>
        <FileDropBox
          inputId="pdfInput"
          icon={<MdPictureAsPdf size={24} />}
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
          icon={<MdBrush size={24} />}
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
          <MdInfoOutline size={14} />
          Nếu file .ai/.psd quá nặng: tải lên Google Drive của bạn, đặt chia sẻ "Bất kỳ ai có link", rồi dán
          link vào đây.
        </div>
      </div>

      <button className="btn" type="submit" disabled={isSubmitting}>
        <MdSend size={19} />
        Gửi bài dự thi
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
