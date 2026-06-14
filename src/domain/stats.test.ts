import { describe, expect, it } from 'vitest';
import { createCalorieBars, getPeriodWorkouts, summarizeWorkouts } from './stats';
import type { Workout } from './workout';

const workouts: Workout[] = [
  { id: 1, date: '2026-06-01', time: '08:00', seconds: 600, min: 10, km: 1, kcal: 65, steps: 1200, maxSpeed: 6 },
  { id: 2, date: '2026-06-10', time: '08:00', seconds: 1200, min: 20, km: 2, kcal: 130, steps: 2400, maxSpeed: 7 },
  { id: 3, date: '2025-06-10', time: '08:00', seconds: 1800, min: 30, km: 3, kcal: 195, steps: 3600, maxSpeed: 8 },
];

describe('stats', () => {
  it('summarizes workouts', () => {
    expect(summarizeWorkouts(workouts)).toEqual({
      workouts: 3,
      min: 60,
      kcal: 390,
      km: 6,
      steps: 7200,
    });
  });

  it('filters by month and year using local calendar dates', () => {
    expect(getPeriodWorkouts(workouts, 'month', '2026-06-13').map((w) => w.id)).toEqual([1, 2]);
    expect(getPeriodWorkouts(workouts, 'year', '2026-06-13').map((w) => w.id)).toEqual([1, 2]);
    expect(getPeriodWorkouts(workouts, 'all', '2026-06-13').map((w) => w.id)).toEqual([1, 2, 3]);
  });

  it('creates calorie bars for week and all time', () => {
    expect(createCalorieBars(workouts, 'week', '2026-06-13')).toHaveLength(7);
    expect(createCalorieBars(workouts, 'all', '2026-06-13')).toEqual([
      { label: '2025', value: 195 },
      { label: '2026', value: 195 },
    ]);
  });
});
