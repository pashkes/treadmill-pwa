import { useState } from 'react';
import { useAppStore } from '../../app/app-store';
import { useT } from '../../i18n';
import { TreadmillConnectionStatus } from '../bluetooth/TreadmillConnectionStatus';
import { readRememberedTreadmill, type RememberedTreadmill } from '../bluetooth/remembered-treadmill-storage';
import { forgetRememberedTreadmill } from '../bluetooth/use-treadmill-connection';

export function SettingsScreen() {
  const t = useT();
  const showToast = useAppStore((state) => state.showToast);
  const [remembered, setRemembered] = useState<RememberedTreadmill | null>(() => readRememberedTreadmill());

  async function handleForget(): Promise<void> {
    if (!window.confirm(t.settings.forgetConfirm)) return;

    await forgetRememberedTreadmill();
    setRemembered(null);
    showToast(t.settings.forgotten);
  }

  return (
    <main className="min-h-dvh pb-28">
      <header className="px-4 pt-14">
        <h1 className="text-[28px] font-extrabold tracking-normal">{t.settings.title}</h1>
      </header>

      <section className="mx-4 mt-5 rounded-2xl bg-neutral-900 p-4">
        <div className="mb-3 text-xs font-semibold uppercase text-neutral-500">{t.settings.currentStatus}</div>
        <div className="rounded-[14px] bg-neutral-800 px-3 py-3">
          <TreadmillConnectionStatus />
        </div>
      </section>

      <section className="mx-4 mt-3 rounded-2xl bg-neutral-900 p-4">
        <div className="mb-2 text-xs font-semibold uppercase text-neutral-500">{t.settings.savedTreadmill}</div>
        <div className="text-lg font-bold">{remembered?.name ?? t.settings.noSavedTreadmill}</div>
        {remembered ? (
          <button
            type="button"
            className="mt-4 min-h-12 w-full rounded-[14px] bg-red-600 px-4 py-3 text-sm font-bold text-white active:bg-red-700"
            onClick={() => void handleForget()}
          >
            {t.settings.forgetSavedTreadmill}
          </button>
        ) : null}
      </section>
    </main>
  );
}
