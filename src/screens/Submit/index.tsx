import React, { useEffect, useState } from 'react';
import BackgroundDecor from './components/BackgroundDecor';
import SubmitHeader from './components/SubmitHeader';
import SubmitForm from './components/SubmitForm';
import SuccessCard from './components/SuccessCard';
import Confetti from './components/Confetti';
import EntryListPanel from './components/EntryListPanel';
import { submissionApi } from '../../api/submissionApi';
import { IS_CONFIGURED, MAX_UPLOAD_MB } from '../../config';
import type { ContestEntry, SubmitPayload } from '../../types';
import { readFileAsBase64 } from '../../utils/file';
import { formatMb } from '../../utils/format';

const SubmitScreen = () => {
  // 1. State declarations
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [selectedSrcFile, setSelectedSrcFile] = useState<File | null>(null);

  const [entryList, setEntryList] = useState<ContestEntry[]>([]);
  const [entryCount, setEntryCount] = useState<number>(0);
  const [isLoadingEntryList, setIsLoadingEntryList] = useState<boolean>(false);
  const [entryListError, setEntryListError] = useState<string | null>(null);
  const [freshEntryName, setFreshEntryName] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgressRatio, setUploadProgressRatio] = useState<number>(0);
  const [uploadProgressLabel, setUploadProgressLabel] = useState<string>('Đang tải lên…');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState<boolean>(false);
  const [submitOrderNumber, setSubmitOrderNumber] = useState<number | null>(null);

  // 2. Logic functions
  const validatePdfFile = (file: File): boolean => {
    if (!file) return false;
    if (!/\.pdf$/i.test(file.name)) return false;
    return true;
  };

  const validateSrcFile = (file: File): boolean => {
    if (!file) return false;
    if (!/\.(ai|psd|zip)$/i.test(file.name)) return false;
    return true;
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // SĐT Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (9–10 số sau đầu số)
  const PHONE_REGEX = /^(0|\+84)(\d[\s.-]?){8,10}$/;

  const validateSubmission = (formData: FormData, sourceLink: string): boolean => {
    const getField = (name: string) => String(formData.get(name) || '').trim();

    const requiredFields: Array<[string, string]> = [
      ['fullName', 'Họ và tên'],
      ['group', 'Nhóm / Ban ngành'],
      ['email', 'Email'],
      ['phone', 'Số điện thoại'],
      ['title', 'Tên tác phẩm'],
    ];
    for (const [name, label] of requiredFields) {
      if (!getField(name)) {
        setSubmitError(`Vui lòng nhập đầy đủ thông tin: thiếu "${label}".`);
        return false;
      }
    }
    if (getField('fullName').length < 2) {
      setSubmitError('Họ và tên quá ngắn, vui lòng nhập đầy đủ.');
      return false;
    }
    if (!EMAIL_REGEX.test(getField('email'))) {
      setSubmitError('Email không hợp lệ, vui lòng kiểm tra lại.');
      return false;
    }
    if (!PHONE_REGEX.test(getField('phone'))) {
      setSubmitError('Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678).');
      return false;
    }
    if (!selectedPdfFile) {
      setSubmitError('Vui lòng chọn bản PDF dự thi.');
      return false;
    }
    if (!selectedSrcFile && !sourceLink) {
      setSubmitError('Vui lòng tải file nguồn (.ai/.psd) hoặc dán link Google Drive.');
      return false;
    }
    if (sourceLink && !/^https?:\/\/\S+$/i.test(sourceLink)) {
      setSubmitError('Link file nguồn không hợp lệ — hãy dán link đầy đủ bắt đầu bằng https://');
      return false;
    }
    const files = [selectedPdfFile, selectedSrcFile].filter(Boolean) as File[];
    for (const file of files) {
      if (file.size > MAX_UPLOAD_MB * 1048576) {
        setSubmitError(
          `File "${file.name}" (${formatMb(file.size)}) vượt ${MAX_UPLOAD_MB}MB. Hãy tải file đó lên Google Drive và dán link.`,
        );
        return false;
      }
    }
    return true;
  };

  const buildSubmitPayload = async (formData: FormData, sourceLink: string): Promise<SubmitPayload> => {
    const files = [selectedPdfFile, selectedSrcFile].filter(Boolean) as File[];
    const encodedFiles = [];
    for (const file of files) {
      encodedFiles.push({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: await readFileAsBase64(file),
      });
    }
    return {
      fullName: String(formData.get('fullName') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      group: String(formData.get('group') || '').trim(),
      title: String(formData.get('title') || '').trim(),
      notes: String(formData.get('notes') || '').trim(),
      sourceLink,
      files: encodedFiles,
    };
  };

  const handleSelectPdfFile = (file: File | null) => {
    if (file && !validatePdfFile(file)) {
      setSubmitError('Bản dự thi phải là file .pdf.');
      return;
    }
    setSubmitError(null);
    setSelectedPdfFile(file);
  };

  const handleSelectSrcFile = (file: File | null) => {
    if (file && !validateSrcFile(file)) {
      setSubmitError('File nguồn phải là .ai, .psd hoặc .zip.');
      return;
    }
    setSubmitError(null);
    setSelectedSrcFile(file);
  };

  // 3. API call functions
  const fetchEntryList = async (newlySubmittedName?: string): Promise<boolean> => {
    if (!IS_CONFIGURED) return false;

    try {
      setIsLoadingEntryList(true);
      setEntryListError(null);
      const response = await submissionApi.getEntryList();
      if (!response.ok) throw new Error(response.error || 'Không tải được danh sách.');
      setEntryList(response.entries || []);
      setEntryCount(response.count || 0);
      if (newlySubmittedName) setFreshEntryName(newlySubmittedName);
      return true;
    } catch (error) {
      setEntryListError(error instanceof Error ? error.message : 'Không tải được danh sách.');
      return false;
    } finally {
      setIsLoadingEntryList(false);
    }
  };

  const submitEntry = async (formData: FormData): Promise<boolean> => {
    const sourceLink = String(formData.get('sourceLink') || '').trim();

    if (!IS_CONFIGURED) {
      setSubmitError('Trang chưa cấu hình ENDPOINT (Apps Script). Xem HUONG-DAN.md.');
      return false;
    }
    if (!validateSubmission(formData, sourceLink)) return false;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setUploadProgressRatio(0);
      setUploadProgressLabel('Đang chuẩn bị file…');

      const payload = await buildSubmitPayload(formData, sourceLink);
      setUploadProgressLabel('Đang tải lên…');

      const response = await submissionApi.postSubmission(payload, (ratio) => {
        setUploadProgressRatio(0.03 + ratio * 0.92);
        setUploadProgressLabel(ratio >= 1 ? 'Đang xử lý phía máy chủ…' : 'Đang tải lên…');
      });
      if (!response.ok) throw new Error(response.error || 'Gửi thất bại');

      setUploadProgressRatio(1);
      setSubmitOrderNumber(response.count ?? null);
      setIsSubmitSuccess(true);
      fetchEntryList(String(formData.get('fullName') || ''));
      return true;
    } catch (error) {
      setSubmitError('Lỗi: ' + (error instanceof Error ? error.message : String(error)));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Effects
  useEffect(() => {
    fetchEntryList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 5. Render (UI ghép từ components con)
  const styles = createStyles();

  return (
    <div style={styles.container}>
      <BackgroundDecor />
      {isSubmitSuccess && <Confetti />}

      <div className="wrap">
        <SubmitHeader subtitle="Điền thông tin và tải lên bài dự thi của bạn (.ai / .psd / .pdf)." />

        <div className="layout">
          <div className="card">
            {isSubmitSuccess ? (
              <SuccessCard orderNumber={submitOrderNumber} />
            ) : (
              <SubmitForm
                isConfigured={IS_CONFIGURED}
                maxUploadMb={MAX_UPLOAD_MB}
                isSubmitting={isSubmitting}
                uploadProgressRatio={uploadProgressRatio}
                uploadProgressLabel={uploadProgressLabel}
                submitError={submitError}
                selectedPdfFile={selectedPdfFile}
                selectedSrcFile={selectedSrcFile}
                onSelectPdfFile={handleSelectPdfFile}
                onSelectSrcFile={handleSelectSrcFile}
                onSubmit={submitEntry}
              />
            )}
          </div>

          <EntryListPanel
            entries={entryList}
            entryCount={entryCount}
            isLoading={isLoadingEntryList}
            error={entryListError}
            freshEntryName={freshEntryName}
            isConfigured={IS_CONFIGURED}
            onRefresh={fetchEntryList}
          />
        </div>

        <div className="foot">© {new Date().getFullYear()} Ban Thanh Niên · HTTL Chi Hội Sài Gòn</div>
      </div>
    </div>
  );
};

export default SubmitScreen;

const createStyles = () => {
  return {
    container: { minHeight: '100vh' } as React.CSSProperties,
  };
};
