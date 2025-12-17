import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useRef, useState } from 'react';

export type ToastKind = 'success' | 'info';

export type ToastMessage = {
  id: string;
  message: string;
  type: ToastKind;
  duration: number;
};

export type ToastContextValue = {
  toast: ToastMessage | null;
  showToast: (message: string, options?: { type?: ToastKind; duration?: number }) => void;
  hideToast: () => void;
};

export const [ToastProvider, useToast] = createContextHook<ToastContextValue>(() => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearExistingTimeout();
    console.log('[Toast] Hiding toast');
    setToast(null);
  }, [clearExistingTimeout]);

  const showToast = useCallback(
    (message: string, options?: { type?: ToastKind; duration?: number }) => {
      clearExistingTimeout();
      const duration = options?.duration ?? 2500;
      const type = options?.type ?? 'success';
      const nextToast: ToastMessage = {
        id: Date.now().toString(),
        message,
        type,
        duration,
      };
      console.log(`[Toast] Showing toast: ${message}`);
      setToast(nextToast);
      timeoutRef.current = setTimeout(() => {
        setToast(current => {
          if (current?.id === nextToast.id) {
            return null;
          }
          return current;
        });
        timeoutRef.current = null;
      }, duration);
    },
    [clearExistingTimeout],
  );

  return useMemo(
    () => ({
      toast,
      showToast,
      hideToast,
    }),
    [toast, showToast, hideToast],
  );
});
