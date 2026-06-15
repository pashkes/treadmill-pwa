import { Download, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../../app/app-store';
import { useT } from '../../i18n';

function isStandaloneDisplayMode() {
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function InstallPromptBanner() {
  const t = useT();
  const screen = useAppStore((state) => state.screen);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      if (isStandaloneDisplayMode()) return;
      event.preventDefault();
      setInstallPrompt(event);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch (error) {
      console.error(error);
    } finally {
      setInstallPrompt(null);
      setIsVisible(false);
    }
  }, [installPrompt]);

  if (!isVisible || !installPrompt || screen === 'live' || screen === 'detail') return null;

  return (
    <section className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+86px)] z-[9997] mx-auto max-w-[min(420px,calc(100vw-32px))] rounded-[18px] border border-neutral-800 bg-neutral-950/95 p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-black">
          <Download size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-tight">{t.pwa.installTitle}</h2>
          <p className="mt-1 text-xs leading-snug text-neutral-400">{t.pwa.installDescription}</p>
          <button
            type="button"
            className="mt-3 min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-black"
            onClick={() => void promptInstall()}
          >
            {t.pwa.installAction}
          </button>
        </div>
        <button
          type="button"
          className="-mr-2 -mt-2 flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-500"
          aria-label={t.pwa.dismissInstall}
          onClick={() => setIsVisible(false)}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
