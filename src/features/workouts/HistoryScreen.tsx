import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAppStore } from '../../app/app-store';
import { useWorkoutHistoryCount, useWorkoutsByDateDesc } from '../../db/workout-live-queries';
import { formatMonthLabel } from '../../domain/date-time';
import type { Workout } from '../../domain/workout';
import { useT } from '../../i18n';

const INITIAL_VISIBLE_WORKOUTS = 10;
const LOAD_MORE_WORKOUTS = 10;

export function HistoryScreen() {
  const t = useT();
  const locale = useAppStore((state) => state.locale);
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_WORKOUTS);
  const workouts = useWorkoutsByDateDesc(visibleCount);
  const workoutCount = useWorkoutHistoryCount();
  const hasMoreWorkouts = visibleCount < workoutCount;
  const groups = groupByMonth(workouts);

  if (workoutCount === 0) {
    return (
      <main className="min-h-dvh pb-24">
        <header className="px-4 pt-14">
          <h1 className="text-[28px] font-extrabold">{t.history.title}</h1>
        </header>
        <div className="px-8 py-16 text-center text-neutral-700">
          <div className="mb-3 text-5xl">🏃</div>
          <p className="text-[15px] leading-relaxed">
            {t.history.emptyLine1}
            <br />
            {t.history.emptyLine2}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-24">
      <header className="px-4 pt-14">
        <h1 className="text-[28px] font-extrabold">{t.history.title}</h1>
      </header>
      <div className="mt-4">
        {groups.map(([month, items]) => (
          <section key={month}>
            <div className="mx-4 mb-2 mt-4 text-sm font-semibold text-neutral-700">{formatMonthLabel(month, locale)}</div>
            {items.map((workout) => (
              <button
                key={workout.id}
                type="button"
                className="mx-4 mb-2.5 block w-[calc(100%-32px)] rounded-[18px] bg-neutral-900 px-4 py-3.5 text-left text-white"
                onClick={() => void navigate({ to: '/workouts/$workoutId', params: { workoutId: String(workout.id) } })}
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[15px] font-bold">{t.history.freeWorkout}</span>
                  <span className="text-xs text-neutral-700">
                    {workout.date.slice(5).replace('-', '/')} {workout.time}
                  </span>
                </div>
                <div className="flex gap-5">
                  <Metric value={String(workout.km)} unit={t.units.km} />
                  <Metric value={String(workout.kcal)} unit={t.units.kcal} />
                  <Metric value={String(workout.min)} unit={t.units.min} />
                </div>
              </button>
            ))}
          </section>
        ))}
        {hasMoreWorkouts ? (
          <button
            type="button"
            className="mx-4 mt-2 flex min-h-12 w-[calc(100%-32px)] items-center justify-center rounded-[16px] border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm font-extrabold text-neutral-300"
            onClick={() => setVisibleCount((current) => Math.min(current + LOAD_MORE_WORKOUTS, workoutCount))}
          >
            {t.history.loadMore}
          </button>
        ) : null}
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
