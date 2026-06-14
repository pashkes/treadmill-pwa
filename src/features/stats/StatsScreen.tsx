import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { createCalorieBars, createFrequencyDays, getPeriodWorkouts, summarizeWorkouts, type StatsPeriod } from '../../domain/stats';
import { useT } from '../../i18n';

export function StatsScreen() {
  const t = useT();
  const locale = useAppStore((state) => state.locale);
  const workouts = useLiveQuery(() => db.workouts.toArray(), []) ?? [];
  const period = useAppStore((state) => state.statsPeriod);
  const setStatsPeriod = useAppStore((state) => state.setStatsPeriod);
  const filtered = getPeriodWorkouts(workouts, period);
  const summary = summarizeWorkouts(filtered);
  const bars = createCalorieBars(workouts, period, undefined, locale, t.stats.weekLabels);
  const frequencyDays = createFrequencyDays(workouts);
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);

  const periods: Array<{ value: StatsPeriod; label: string }> = [
    { value: 'week', label: t.stats.periods.week },
    { value: 'month', label: t.stats.periods.month },
    { value: 'year', label: t.stats.periods.year },
    { value: 'all', label: t.stats.periods.all },
  ];

  return (
    <main className="min-h-dvh pb-24">
      <header className="px-4 pt-14">
        <h1 className="text-[28px] font-extrabold">{t.stats.title}</h1>
      </header>
      <div className="mx-4 mt-3 flex rounded-full bg-neutral-800 p-1">
        {periods.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`flex-1 rounded-full py-2 text-[13px] font-semibold ${period === item.value ? 'bg-white text-black' : 'text-neutral-400'}`}
            onClick={() => setStatsPeriod(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section className="mx-4 mt-3 rounded-[20px] bg-neutral-900 p-[18px]">
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t.stats.time} value={summary.min.toLocaleString(locale)} unit={t.units.min} color="text-[#5B8AF6]" />
          <Stat label={t.stats.calories} value={summary.kcal.toLocaleString(locale)} unit={t.units.kcal} color="text-[#F06A1D]" />
          <Stat label={t.stats.distance} value={summary.km.toFixed(2)} unit={t.units.km} color="text-[#5B8AF6]" />
          <Stat label={t.stats.workouts} value={String(summary.workouts)} unit="" color="text-neutral-400" />
        </div>
        <div className="mt-4 flex h-20 items-end gap-1.5">
          {bars.map((bar) => (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t ${bar.value > 0 ? 'bg-[#5B5BF6]' : 'bg-neutral-800'}`}
                style={{ height: `${Math.round((bar.value / maxValue) * 68) + 4}px` }}
              />
              <div className="text-[9px] font-semibold text-neutral-700">{bar.label}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-4 mt-3 rounded-[20px] bg-neutral-900 p-[18px]">
        <div className="mb-3.5 text-base font-bold">{t.stats.frequency}</div>
        <div className="flex flex-wrap gap-1.5">
          {frequencyDays.map((day) => (
            <div
              key={day.date}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold ${day.active ? 'bg-[#5B5BF6] text-white' : 'bg-neutral-800 text-neutral-700'}`}
            >
              {day.day}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div>
      <div className={`mb-1 text-xs font-semibold ${color}`}>{label}</div>
      <span className="text-[28px] font-extrabold leading-none">{value}</span>
      {unit ? <span className="ml-0.5 text-xs text-neutral-400">{unit}</span> : null}
    </div>
  );
}
