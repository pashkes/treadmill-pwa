import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workout } from '../domain/workout';
import { db } from './app-db';
import {
  addWorkout,
  createWorkoutExportPayload,
  deleteWorkout,
  getWorkout,
  listWorkouts,
  migrateLegacyLocalStorageWorkouts,
} from './workout-repository';

const workout: Workout = {
  id: 100,
  date: '2026-06-13',
  time: '08:30',
  seconds: 600,
  min: 10,
  km: 1,
  kcal: 65,
  steps: 1200,
  maxSpeed: 6,
};

describe('workout repository', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();
    await db.workouts.clear();
  });

  it('adds, lists, and gets workouts newest first', async () => {
    await addWorkout(workout);
    await addWorkout({ ...workout, id: 101, date: '2026-06-14' });

    expect((await listWorkouts()).map((item) => item.id)).toEqual([101, 100]);
    expect(await getWorkout(100)).toEqual(workout);
  });

  it('deletes a persisted workout', async () => {
    await addWorkout(workout);

    await deleteWorkout(workout.id);

    expect(await getWorkout(workout.id)).toBeUndefined();
    expect(await listWorkouts()).toEqual([]);
  });

  it('migrates valid legacy localStorage data once without deleting it', async () => {
    localStorage.setItem('treadmill_v2', JSON.stringify([workout]));

    await migrateLegacyLocalStorageWorkouts();
    await migrateLegacyLocalStorageWorkouts();

    expect(await listWorkouts()).toEqual([workout]);
    expect(localStorage.getItem('treadmill_v2')).toBe(JSON.stringify([workout]));
    expect(localStorage.getItem('treadmill_v2_migrated_to_dexie')).toBe('1');
  });

  it('normalizes older legacy workouts without seconds steps or maxSpeed', async () => {
    const olderWorkout = {
      id: 99,
      date: '2026-06-12',
      time: '07:30',
      min: 12,
      km: 1.2,
      kcal: 80,
    };
    localStorage.setItem('treadmill_v2', JSON.stringify([olderWorkout]));

    await migrateLegacyLocalStorageWorkouts();

    expect(await getWorkout(99)).toEqual({
      ...olderWorkout,
      seconds: 720,
      steps: 0,
      maxSpeed: 0,
    });
    expect(localStorage.getItem('treadmill_v2_migrated_to_dexie')).toBe('1');
  });

  it('ignores invalid legacy localStorage data and marks migration complete', async () => {
    localStorage.setItem('treadmill_v2', '{broken');

    await migrateLegacyLocalStorageWorkouts();

    expect(await listWorkouts()).toEqual([]);
    expect(localStorage.getItem('treadmill_v2_migrated_to_dexie')).toBe('1');
  });

  it('does not mark migration complete when Dexie write fails', async () => {
    localStorage.setItem('treadmill_v2', JSON.stringify([workout]));
    const bulkPut = vi.spyOn(db.workouts, 'bulkPut').mockRejectedValueOnce(new Error('write failed'));

    await migrateLegacyLocalStorageWorkouts();

    expect(bulkPut).toHaveBeenCalled();
    expect(localStorage.getItem('treadmill_v2_migrated_to_dexie')).toBeNull();
  });

  it('creates an export payload from persisted workouts', async () => {
    await addWorkout(workout);

    const payload = await createWorkoutExportPayload();

    expect(payload.schemaVersion).toBe(1);
    expect(payload.workouts).toEqual([workout]);
    expect(new Date(payload.exportedAt).toString()).not.toBe('Invalid Date');
  });
});
