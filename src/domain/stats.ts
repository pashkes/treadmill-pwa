import { Temporal } from '@js-temporal/polyfill';
import type { Workout } from './workout';

export type StatsPeriod = 'week' | 'month' | 'year' | 'all';

export type WorkoutSummary = {
  workouts: number;
  min: number;
  kcal: number;
  km: number;
  steps: number;
};

export type ChartBar = {
  label: string;
  value: number;
};

export function summarizeWorkouts(workouts: Workout[]): WorkoutSummary {
  return workouts.reduce(
    (summary, workout) => ({
      workouts: summary.workouts + 1,
      min: summary.min + workout.min,
      kcal: summary.kcal + workout.kcal,
      km: summary.km + workout.km,
      steps: summary.steps + (workout.steps || 0),
    }),
    { workouts: 0, min: 0, kcal: 0, km: 0, steps: 0 },
  );
}

export function getPeriodWorkouts(
  workouts: Workout[],
  period: StatsPeriod,
  today = Temporal.Now.plainDateISO().toString(),
): Workout[] {
  if (period === 'all') return workouts;

  const now = Temporal.PlainDate.from(today);
  return workouts.filter((workout) => {
    const date = Temporal.PlainDate.from(workout.date);
    if (Temporal.PlainDate.compare(date, now) > 0) return false;
    if (period === 'week') {
      const dayOfWeek = now.dayOfWeek % 7;
      const start = now.subtract({ days: dayOfWeek });
      return Temporal.PlainDate.compare(date, start) >= 0;
    }
    if (period === 'month') {
      return date.year === now.year && date.month === now.month;
    }
    return date.year === now.year;
  });
}

export function createCalorieBars(
  workouts: Workout[],
  period: StatsPeriod,
  today = Temporal.Now.plainDateISO().toString(),
): ChartBar[] {
  const now = Temporal.PlainDate.from(today);

  if (period === 'week') {
    const labels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return Array.from({ length: 7 }, (_, index) => {
      const date = now.subtract({ days: 6 - index });
      const dateString = date.toString();
      return {
        label: labels[date.dayOfWeek % 7],
        value: workouts.filter((workout) => workout.date === dateString).reduce((sum, workout) => sum + workout.kcal, 0),
      };
    });
  }

  if (period === 'month') {
    const monthStart = now.with({ day: 1 });
    const monthEnd = monthStart.add({ months: 1 }).subtract({ days: 1 });
    const ranges = [
      { label: 'Н1', start: monthStart, end: monthStart.with({ day: Math.min(7, monthEnd.day) }) },
      { label: 'Н2', start: monthStart.with({ day: Math.min(8, monthEnd.day) }), end: monthStart.with({ day: Math.min(14, monthEnd.day) }) },
      { label: 'Н3', start: monthStart.with({ day: Math.min(15, monthEnd.day) }), end: monthStart.with({ day: Math.min(21, monthEnd.day) }) },
      { label: 'Н4', start: monthStart.with({ day: Math.min(22, monthEnd.day) }), end: monthEnd },
    ];

    return ranges.map(({ label, start, end }) => {
      return {
        label,
        value: workouts
          .filter((workout) => {
            const date = Temporal.PlainDate.from(workout.date);
            if (Temporal.PlainDate.compare(date, now) > 0) return false;
            return Temporal.PlainDate.compare(date, start) >= 0 && Temporal.PlainDate.compare(date, end) <= 0;
          })
          .reduce((sum, workout) => sum + workout.kcal, 0),
      };
    });
  }

  if (period === 'year') {
    const labels = ['Я', 'Ф', 'М', 'А', 'М', 'И', 'И', 'А', 'С', 'О', 'Н', 'Д'];
    return labels.map((label, monthIndex) => ({
      label,
      value: workouts
        .filter((workout) => {
          const date = Temporal.PlainDate.from(workout.date);
          return date.year === now.year && date.month === monthIndex + 1;
        })
        .reduce((sum, workout) => sum + workout.kcal, 0),
    }));
  }

  const years = Array.from(new Set(workouts.map((workout) => workout.date.slice(0, 4)))).sort();
  const effectiveYears = years.length > 0 ? years : [String(now.year)];
  return effectiveYears.map((year) => ({
    label: year,
    value: workouts.filter((workout) => workout.date.startsWith(year)).reduce((sum, workout) => sum + workout.kcal, 0),
  }));
}
