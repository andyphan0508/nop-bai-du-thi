import { MdCheckCircle, MdClose, MdErrorOutline } from 'react-icons/md';

export type ToastItem = {
  id: number;
  message: string;
  type: 'error' | 'success';
};

type ToastStackProps = {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
};

const ToastStack = ({ toasts, onDismiss }: ToastStackProps) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.type === 'error' ? <MdErrorOutline size={18} /> : <MdCheckCircle size={18} />}
          <span>{toast.message}</span>
          <button
            className="toast-x"
            type="button"
            title="Đóng thông báo"
            onClick={() => onDismiss(toast.id)}
          >
            <MdClose size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastStack;
