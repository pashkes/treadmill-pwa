import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAppStore } from '../../app/app-store';
import { formatDuration, formatPace } from '../../domain/workout';
import { useLiveStore } from './live-store';
import { useT } from '../../i18n';
import { useScreenWakeLock } from './use-screen-wake-lock';

export function LiveScreen() {
  const t = useT();
  useScreenWakeLock();
  const locale = useAppStore((state) => state.locale);
  const navigate = useNavigate();
  const showToast = useAppStore((state) => state.showToast);
  const {
    deviceName,
    isPaused,
    seconds,
    km,
    kcal,
    steps,
    speedKph,
    inclinePercent,
    autoStopRequested,
    clearAutoStopRequest,
    resume,
    stopAndSave,
    tick,
  } = useLiveStore();

  const timer = formatDuration(seconds).slice(3);
  const pace = formatPace({ seconds, km });

  async function handleManualStop() {
    if (!window.confirm(t.live.stopConfirm)) return;

    try {
      const saved = await stopAndSave();
      if (saved) showToast(t.live.workoutSaved);
      void navigate({ to: '/' });
    } catch (error) {
      console.error(error);
      showToast(t.errors.saveWorkoutFailed);
    }
  }

  useEffect(() => {
    if (!autoStopRequested) return;

    clearAutoStopRequest();
    void stopAndSave().then((saved) => {
      if (saved) showToast(t.live.workoutCompleted);
      void navigate({ to: '/' });
    });
  }, [autoStopRequested, clearAutoStopRequest, navigate, showToast, stopAndSave, t]);

  useEffect(() => {
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [tick]);

  return (
    <main className="mx-auto min-h-dvh max-w-[720px] bg-black pb-8 pt-[calc(env(safe-area-inset-top)+12px)] text-white landscape:max-w-none landscape:pb-4">
      <header className="flex items-center justify-between px-4">
        <div />
        <div className="min-w-0 max-w-[72vw] rounded-b-[18px] bg-neutral-900 px-5 py-2 text-center">
          <div className="truncate text-[13px] font-bold text-neutral-300">{deviceName ?? t.live.treadmill}</div>
        </div>
        <div className="h-10 w-10" />
      </header>
      <div className="mt-5 text-center text-[22px] font-extrabold text-neutral-300 landscape:mt-2">{t.live.title}</div>
      <div className="mt-2 text-center text-[11px] font-bold uppercase tracking-[2px] text-neutral-700">{t.live.time}</div>
      <div className="my-1 text-center text-[76px] font-extrabold leading-none tracking-normal tabular-nums landscape:text-[56px]">
        {timer}
      </div>
      {isPaused ? (
        <section className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-[#F06A1D]/35 bg-[#F06A1D]/10 px-4 py-3">
          <div>
            <div className="text-sm font-extrabold text-[#F06A1D]">{t.live.paused}</div>
            <div className="mt-0.5 text-xs font-semibold text-neutral-300">{t.live.resumeHint}</div>
          </div>
          <button type="button" className="shrink-0 rounded-full bg-white px-4 py-2 text-[13px] font-extrabold text-black" onClick={resume}>
            {t.live.resume}
          </button>
        </section>
      ) : null}
      <section className="mx-4 mt-3 grid grid-cols-2 gap-2.5 landscape:grid-cols-4">
        <LiveMetric label={t.live.distance} value={km.toFixed(2)} unit={t.units.km} color="text-[#5B8AF6]" />
        <LiveMetric label={t.live.calories} value={Math.round(kcal).toString()} unit={t.units.kcal} color="text-[#F06A1D]" />
        <LiveMetric label={t.live.pace} value={pace} unit={t.units.minPerKm} color="text-[#5B5BF6]" />
        <LiveMetric label={t.live.steps} value={Math.round(steps).toLocaleString(locale)} unit="" color="text-neutral-400" />
      </section>
      <section className="mx-4 mt-2.5 rounded-[18px] bg-neutral-900 p-4 landscape:py-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[1px] text-neutral-400">{t.live.speed}</div>
            <span className="text-[54px] font-extrabold leading-none landscape:text-[42px]">{speedKph.toFixed(1)}</span>
            <span className="ml-1 text-base text-neutral-400">{t.units.kmh}</span>
          </div>
          <div className="shrink-0 text-right">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[1px] text-neutral-400">{t.live.incline}</div>
            <span className="text-[34px] font-extrabold leading-none">{inclinePercent.toFixed(1)}</span>
            <span className="ml-1 text-sm text-neutral-400">%</span>
          </div>
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-[#5B5BF6] transition-[width]"
            style={{ width: `${Math.min((speedKph / 20) * 100, 100)}%` }}
          />
        </div>
      </section>
      <button
        type="button"
        className="mx-4 mt-3 w-[calc(100%-32px)] rounded-[18px] border border-red-500/40 bg-red-500/10 p-4 text-[17px] font-bold text-red-500 landscape:py-3"
        onClick={() => void handleManualStop()}
      >
        {t.live.finish}
      </button>
    </main>
  );
}

function LiveMetric({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-[18px] bg-neutral-900 p-4">
      <div className={`mb-1.5 text-[10px] font-bold uppercase tracking-[1.5px] ${color}`}>{label}</div>
      <span className="text-[34px] font-extrabold leading-none">{value}</span>
      {unit ? <span className="ml-0.5 text-xs text-neutral-400">{unit}</span> : null}
    </div>
  );
}
