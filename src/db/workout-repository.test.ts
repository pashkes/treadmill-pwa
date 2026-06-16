import { beforeEach, describe, expect, it } from 'vitest';
import type { Workout } from '../domain/workout';
import { db } from './app-db';
import { addWorkout, createWorkoutExportPayload, deleteWorkout, getWorkout, listWorkouts } from './workout-repository';

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

  it('creates an export payload from persisted workouts', async () => {
    await addWorkout(workout);

    const payload = await createWorkoutExportPayload();

    expect(payload.schemaVersion).toBe(1);
    expect(payload.workouts).toEqual([workout]);
    expect(new Date(payload.exportedAt).toString()).not.toBe('Invalid Date');
  });
});
