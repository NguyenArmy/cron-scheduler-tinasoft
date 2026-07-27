import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export interface ToastData {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toast: ToastData | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  const Icon =
    toast.type === 'success'
      ? CheckCircle
      : toast.type === 'info'
        ? Info
        : AlertCircle;

  return (
    <div className={`toast-notification ${toast.type}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{toast.message}</span>
    </div>
  );
};

export function useToast() {
  const [toast, setToast] = React.useState<ToastData | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = React.useCallback((type: ToastData['type'], message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ type, message });
    timerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  return { toast, showToast };
}
