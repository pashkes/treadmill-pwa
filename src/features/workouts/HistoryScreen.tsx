import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { formatMonthLabel } from '../../domain/date-time';
import type { Workout } from '../../domain/workout';

export function HistoryScreen() {
  const workouts = useLiveQuery(() => db.workouts.orderBy('date').reverse().toArray(), []) ?? [];
  const showWorkoutDetail = useAppStore((state) => state.showWorkoutDetail);

  if (workouts.length === 0) {
    return (
      <main className="min-h-dvh pb-24">
        <header className="px-4 pt-14">
          <h1 className="text-[28px] font-extrabold">История</h1>
        </header>
        <div className="px-8 py-16 text-center text-neutral-700">
          <div className="mb-3 text-5xl">🏃</div>
          <p className="text-[15px] leading-relaxed">
            Тренировок пока нет.
            <br />
            Нажми GO чтобы начать!
          </p>
        </div>
      </main>
    );
  }

  const groups = groupByMonth(workouts);
  return (
    <main className="min-h-dvh pb-24">
      <header className="px-4 pt-14">
        <h1 className="text-[28px] font-extrabold">История</h1>
      </header>
      <div className="mt-4">
        {groups.map(([month, items]) => (
          <section key={month}>
            <div className="mx-4 mb-2 mt-4 text-sm font-semibold text-neutral-700">{formatMonthLabel(month)}</div>
            {items.map((workout) => (
              <button
                key={workout.id}
                type="button"
                className="mx-4 mb-2.5 block w-[calc(100%-32px)] rounded-[18px] bg-neutral-900 px-4 py-3.5 text-left text-white"
                onClick={() => showWorkoutDetail(workout.id)}
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[15px] font-bold">Свободная тренировка</span>
                  <span className="text-xs text-neutral-700">
                    {workout.date.slice(5).replace('-', '/')} {workout.time}
                  </span>
                </div>
                <div className="flex gap-5">
                  <Metric value={String(workout.km)} unit="км" />
                  <Metric value={String(workout.kcal)} unit="ккал" />
                  <Metric value={String(workout.min)} unit="мин" />
                </div>
              </button>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}

function groupByMonth(workouts: Workout[]): Array<[string, Workout[]]> {
  const groups = new Map<string, Workout[]>();
  for (const workout of workouts) {
    const key = workout.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), workout]);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function Metric({ value, unit }: { value: string; unit: string }) {
  return (
    <div>
      <span className="text-xl font-extrabold">{value}</span>
      <span className="ml-0.5 text-xs text-neutral-400">{unit}</span>
    </div>
  );
}
