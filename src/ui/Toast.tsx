import { useEffect } from 'react';
import { useAppStore } from '../app/app-store';

export function Toast() {
  const toast = useAppStore((state) => state.toast);
  const hideToast = useAppStore((state) => state.hideToast);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = window.setTimeout(hideToast, 2800);
    return () => window.clearTimeout(timer);
  }, [hideToast, toast.message, toast.visible]);

  return (
    <div
      role="status"
      className={`fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+24px)] z-[9998] mx-auto max-w-[min(420px,calc(100vw-32px))] rounded-[18px] bg-neutral-900 px-5 py-3 text-center text-sm font-semibold leading-snug text-white shadow-2xl ${
        toast.visible ? 'block' : 'hidden'
      }`}
    >
      {toast.message}
    </div>
  );
}
