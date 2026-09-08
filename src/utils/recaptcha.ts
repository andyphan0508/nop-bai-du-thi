import { RECAPTCHA_SITE_KEY } from "../config";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

const loadRecaptchaScript = (): Promise<void> => {
  if (window.grecaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được reCAPTCHA."));
    document.head.appendChild(script);
  });
  return scriptPromise;
};

// Lấy 1 token reCAPTCHA v3 (vô hình, không cần người dùng thao tác) gắn với
// 1 hành động cụ thể (VD "vote") — server sẽ gửi token này lên Google để lấy
// điểm tin cậy trước khi tính là 1 phiếu hợp lệ.
export const getRecaptchaToken = async (action: string): Promise<string> => {
  await loadRecaptchaScript();
  return new Promise((resolve, reject) => {
    if (!window.grecaptcha) {
      reject(new Error("reCAPTCHA chưa sẵn sàng, vui lòng thử lại."));
      return;
    }
    window.grecaptcha.ready(() => {
      window
        .grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action })
        .then(resolve)
        .catch(() => reject(new Error("Không xác minh được reCAPTCHA.")));
    });
  });
};
