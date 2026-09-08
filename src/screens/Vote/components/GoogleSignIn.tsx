import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "../../../config";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

const loadGisScript = (): Promise<void> => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được Google Sign-In."));
    document.head.appendChild(script);
  });
  return scriptPromise;
};

type GoogleSignInProps = {
  onCredential: (idToken: string) => void;
};

// Nút "Đăng nhập bằng Google" — dùng để xác thực danh tính thật trước khi
// bình chọn (chặn mở ẩn danh + bịa thông tin để bình chọn nhiều lần).
// Server (Code.gs) xác minh lại token này trước khi tính là 1 phiếu hợp lệ.
const GoogleSignIn = ({ onCredential }: GoogleSignInProps) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGisScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
          locale: "vi",
        });
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) return <div className="msg err">{loadError}</div>;
  return <div ref={buttonRef} className="google-signin-btn" />;
};

export default GoogleSignIn;
