import { useEffect } from 'react';
import { useAppStore } from '../app/app-store';

export function Toast() {
  const toast = useAppStore((state) => state.toast);
  const hideToast = useAppStore((state) => state.hideToast);

  useEffect(() => {
    if (!toast.visible) return;
    const timer = window.setTimeout(hideToast, 2800);
    return () => window.clearTimeout(timer);
  }, [hideToast, toast.visible]);

  return (
    <div
      className={`fixed left-1/2 top-[60px] z-[9998] -translate-x-1/2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl transition-transform duration-300 ${
        toast.visible ? 'translate-y-0' : '-translate-y-20'
      }`}
    >
      {toast.message}
    </div>
  );
}
