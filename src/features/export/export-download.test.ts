import { describe, expect, it } from 'vitest';
import type { Workout } from '../../domain/workout';
import { makeWorkout } from '../../test/workout-fixtures';
import { createExportFile } from './export-download';

const workout: Workout = makeWorkout({
  id: 1,
  date: '2026-06-13',
  time: '08:00',
  seconds: 60,
  km: 0.1,
  kcal: 7,
  min: 1,
  steps: 120,
  maxSpeed: 6,
});

describe('createExportFile', () => {
  it('creates a json file name and versioned content', () => {
    const file = createExportFile([workout]);
    const parsed = JSON.parse(file.content) as { schemaVersion: number; workouts: Workout[] };

    expect(file.fileName).toMatch(/^treadmill-workouts-\d{4}-\d{2}-\d{2}\.json$/);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.workouts).toEqual([workout]);
  });
});
