import { Pause, Play } from 'lucide-react';
import { useEffect } from 'react';
import { useAppStore } from '../../app/app-store';
import { formatDuration, formatPaceSeconds } from '../../domain/workout';
import { useLiveStore } from './live-store';

export function LiveScreen() {
  const showScreen = useAppStore((state) => state.showScreen);
  const showToast = useAppStore((state) => state.showToast);
  const { seconds, km, kcal, steps, speedKph, isPaused, tick, pause, changeSpeed, stopAndSave } = useLiveStore();

  useEffect(() => {
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [tick]);

  const timer = formatDuration(seconds).slice(3);
  const pace = speedKph > 0.1 ? formatPaceSeconds((60 / speedKph) * 60) : '--';

  return (
    <main className="min-h-dvh bg-black pb-8 text-white">
      <header className="flex items-center justify-between px-4 pt-14">
        <div />
        <div className="text-base font-bold text-neutral-400">Свободная тренировка</div>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900"
          onClick={pause}
          aria-label={isPaused ? 'Продолжить' : 'Пауза'}
        >
          {isPaused ? <Play size={20} /> : <Pause size={20} />}
        </button>
      </header>
      <div className="mt-2 text-center text-[11px] font-bold uppercase tracking-[2px] text-neutral-700">Время</div>
      <div className="my-1 text-center text-[76px] font-extrabold leading-none tracking-normal tabular-nums">{timer}</div>
      <section className="mx-4 mt-3 grid grid-cols-2 gap-2.5">
        <LiveMetric label="Дистанция" value={km.toFixed(2)} unit="км" color="text-[#5B8AF6]" />
        <LiveMetric label="Калории" value={Math.round(kcal).toString()} unit="ккал" color="text-[#F06A1D]" />
        <LiveMetric label="Темп" value={pace} unit="мин/км" color="text-[#5B5BF6]" />
        <LiveMetric label="Шаги" value={Math.round(steps).toLocaleString('ru')} unit="" color="text-neutral-400" />
      </section>
      <section className="mx-4 mt-2.5 rounded-[18px] bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[1px] text-neutral-400">Скорость</div>
            <span className="text-[54px] font-extrabold leading-none">{speedKph.toFixed(1)}</span>
            <span className="ml-1 text-base text-neutral-400">км/ч</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-neutral-800 text-3xl font-bold"
              onClick={() => changeSpeed(-0.5)}
              aria-label="Уменьшить скорость"
            >
              −
            </button>
            <button
              type="button"
              className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#5B5BF6] text-3xl font-bold"
              onClick={() => changeSpeed(0.5)}
              aria-label="Увеличить скорость"
            >
              +
            </button>
          </div>
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full rounded-full bg-[#5B5BF6] transition-[width]" style={{ width: `${Math.min((speedKph / 20) * 100, 100)}%` }} />
        </div>
      </section>
      <button
        type="button"
        className="mx-4 mt-3 w-[calc(100%-32px)] rounded-[18px] border border-red-500/40 bg-red-500/10 p-4 text-[17px] font-bold text-red-500"
        onClick={async () => {
          const saved = await stopAndSave();
          if (saved) showToast('Тренировка сохранена');
          showScreen('home');
        }}
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
