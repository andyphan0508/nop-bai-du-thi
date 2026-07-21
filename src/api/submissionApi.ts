import { ENDPOINT } from '../config';
import type { EntryListResponse, SubmitPayload, SubmitResponse } from '../types';

const getEntryList = async (): Promise<EntryListResponse> => {
  const response = await fetch(`${ENDPOINT}?action=list`);
  return (await response.json()) as EntryListResponse;
};

// POST bằng XHR để có % tiến trình upload thật.
// Dùng Content-Type text/plain để tránh preflight CORS của Apps Script.
const postSubmission = (
  payload: SubmitPayload,
  onProgress: (ratio: number) => void,
): Promise<SubmitResponse> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', ENDPOINT);
    xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    xhr.addEventListener('load', () => {
      try {
        resolve(JSON.parse(xhr.responseText) as SubmitResponse);
      } catch {
        reject(new Error('Phản hồi máy chủ không hợp lệ.'));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Lỗi mạng, vui lòng thử lại.')));
    xhr.send(JSON.stringify(payload));
  });
};

export const submissionApi = { getEntryList, postSubmission };
