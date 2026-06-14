import { describe, expect, it } from 'vitest';
import { createCalorieBars, getPeriodWorkouts, summarizeWorkouts } from './stats';
import type { Workout } from './workout';

const workouts: Workout[] = [
  { id: 1, date: '2026-06-01', time: '08:00', seconds: 600, min: 10, km: 1, kcal: 65, steps: 1200, maxSpeed: 6 },
  { id: 2, date: '2026-06-10', time: '08:00', seconds: 1200, min: 20, km: 2, kcal: 130, steps: 2400, maxSpeed: 7 },
  { id: 3, date: '2025-06-10', time: '08:00', seconds: 1800, min: 30, km: 3, kcal: 195, steps: 3600, maxSpeed: 8 },
  { id: 4, date: '2026-06-25', time: '08:00', seconds: 2400, min: 40, km: 4, kcal: 260, steps: 4800, maxSpeed: 9 },
];

describe('stats', () => {
  it('summarizes workouts', () => {
    expect(summarizeWorkouts(workouts)).toEqual({
      workouts: 4,
      min: 100,
      kcal: 650,
      km: 10,
      steps: 12000,
    });
  });

  it('filters by period using local calendar dates and excludes future workouts', () => {
    expect(getPeriodWorkouts(workouts, 'month', '2026-06-13').map((w) => w.id)).toEqual([1, 2]);
    expect(getPeriodWorkouts(workouts, 'year', '2026-06-13').map((w) => w.id)).toEqual([1, 2]);
    expect(getPeriodWorkouts(workouts, 'week', '2026-06-13').map((w) => w.id)).toEqual([2]);
    expect(getPeriodWorkouts(workouts, 'all', '2026-06-13').map((w) => w.id)).toEqual([1, 2, 3, 4]);
  });

  it('creates calorie bars for week, month, year, and all time', () => {
    expect(createCalorieBars(workouts, 'week', '2026-06-13').map((bar) => bar.value)).toEqual([0, 0, 0, 130, 0, 0, 0]);
    expect(createCalorieBars(workouts, 'month', '2026-06-13')).toEqual([
      { label: 'Н1', value: 65 },
      { label: 'Н2', value: 130 },
      { label: 'Н3', value: 0 },
      { label: 'Н4', value: 0 },
    ]);
    expect(createCalorieBars(workouts, 'year', '2026-06-13').slice(0, 6).map((bar) => bar.value)).toEqual([0, 0, 0, 0, 0, 455]);
    expect(createCalorieBars(workouts, 'all', '2026-06-13')).toEqual([
      { label: '2025', value: 195 },
      { label: '2026', value: 455 },
    ]);
  });
});
