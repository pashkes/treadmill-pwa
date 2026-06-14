import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAppStore } from '../../app/app-store';
import { formatDuration, formatPace } from '../../domain/workout';
import { useLiveStore } from './live-store';

export function LiveScreen() {
  const navigate = useNavigate();
  const showToast = useAppStore((state) => state.showToast);
  const { deviceName, seconds, km, kcal, steps, speedKph, inclinePercent, autoStopRequested, clearAutoStopRequest, stopAndSave } =
    useLiveStore();

  const timer = formatDuration(seconds).slice(3);
  const pace = formatPace({ seconds, km });

  async function handleManualStop() {
    if (!window.confirm('Завершить и сохранить тренировку?')) return;

    const saved = await stopAndSave();
    if (saved) showToast('Тренировка сохранена');
    void navigate({ to: '/' });
  }

  useEffect(() => {
    if (!autoStopRequested) return;

    clearAutoStopRequest();
    void stopAndSave().then((saved) => {
      if (saved) showToast('Тренировка завершена');
      void navigate({ to: '/' });
    });
  }, [autoStopRequested, clearAutoStopRequest, navigate, showToast, stopAndSave]);

  return (
    <main className="min-h-dvh bg-black pb-8 pt-[calc(env(safe-area-inset-top)+12px)] text-white">
      <header className="flex items-center justify-between px-4">
        <div />
        <div className="min-w-0 max-w-[72vw] rounded-b-[18px] bg-neutral-900 px-5 py-2 text-center">
          <div className="truncate text-[13px] font-bold text-neutral-300">{deviceName ?? 'Дорожка'}</div>
        </div>
        <div className="h-10 w-10" />
      </header>
      <div className="mt-5 text-center text-[22px] font-extrabold text-neutral-300">Свободная тренировка</div>
      <div className="mt-2 text-center text-[11px] font-bold uppercase tracking-[2px] text-neutral-700">Время</div>
      <div className="my-1 text-center text-[76px] font-extrabold leading-none tracking-normal tabular-nums">{timer}</div>
      <section className="mx-4 mt-3 grid grid-cols-2 gap-2.5">
        <LiveMetric label="Дистанция" value={km.toFixed(2)} unit="км" color="text-[#5B8AF6]" />
        <LiveMetric label="Калории" value={Math.round(kcal).toString()} unit="ккал" color="text-[#F06A1D]" />
        <LiveMetric label="Темп" value={pace} unit="мин/км" color="text-[#5B5BF6]" />
        <LiveMetric label="Шаги" value={Math.round(steps).toLocaleString('ru')} unit="" color="text-neutral-400" />
      </section>
      <section className="mx-4 mt-2.5 rounded-[18px] bg-neutral-900 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[1px] text-neutral-400">Скорость</div>
            <span className="text-[54px] font-extrabold leading-none">{speedKph.toFixed(1)}</span>
            <span className="ml-1 text-base text-neutral-400">км/ч</span>
          </div>
          <div className="shrink-0 text-right">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[1px] text-neutral-400">Угол</div>
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
        className="mx-4 mt-3 w-[calc(100%-32px)] rounded-[18px] border border-red-500/40 bg-red-500/10 p-4 text-[17px] font-bold text-red-500"
        onClick={() => void handleManualStop()}
      >
        Завершить тренировку
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
