import { beforeEach, describe, expect, it } from 'vitest';
import type { Workout } from '../domain/workout';
import { makeWorkout } from '../test/workout-fixtures';
import { db } from './app-db';
import {
  addWorkout,
  createWorkoutExportPayload,
  deleteWorkout,
  getWorkout,
  importWorkoutExportPayload,
  listWorkouts,
} from './workout-repository';

const workout = makeWorkout();

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

  it('hides soft-deleted workouts from visible reads', async () => {
    await addWorkout(makeWorkout({ id: 100, deletedAt: null }));
    await addWorkout(makeWorkout({ id: 101, clientId: '22222222-2222-4222-8222-222222222222', deletedAt: '2026-06-14T08:30:00.000Z' }));

    expect((await listWorkouts()).map((item) => item.id)).toEqual([100]);
  });

  it('soft deletes workouts instead of removing them', async () => {
    await addWorkout(makeWorkout({ id: 100, ownerUserId: 'user-a', syncStatus: 'synced' }));

    await deleteWorkout(100);
    const saved = await db.workouts.get(100);

    expect(saved?.deletedAt).toBeTruthy();
    expect(saved?.syncStatus).toBe('pending');
    expect(await getWorkout(100)).toBeUndefined();
  });

  it('creates an export payload from persisted workouts', async () => {
    await addWorkout(workout);

    const payload = await createWorkoutExportPayload();

    expect(payload.schemaVersion).toBe(1);
    expect(payload.workouts).toEqual([workout]);
    expect(new Date(payload.exportedAt).toString()).not.toBe('Invalid Date');
  });

  it('imports workouts from an export payload', async () => {
    const imported = await importWorkoutExportPayload(
      JSON.stringify({
        schemaVersion: 1,
        exportedAt: '2026-06-13T10:00:00.000Z',
        workouts: [workout, { ...workout, id: 101, date: '2026-06-14' }],
      }),
    );

    expect(imported).toBe(2);
    expect((await listWorkouts()).map((item) => item.id)).toEqual([101, 100]);
  });

  it('preserves legacy workouts and adds sync metadata', async () => {
    await db.workouts.put({
      id: 777,
      date: '2026-06-01',
      time: '07:15',
      seconds: 900,
      min: 15,
      km: 1.5,
      kcal: 90,
      steps: 1800,
      maxSpeed: 6.5,
    } as Workout);

    const saved = await getWorkout(777);

    expect(saved).toMatchObject({
      id: 777,
      date: '2026-06-01',
      ownerUserId: null,
      deletedAt: null,
      syncStatus: 'local',
    });
    expect(saved?.clientId).toMatch(/[0-9a-f-]{36}/);
    expect(new Date(saved?.createdAt ?? '').toString()).not.toBe('Invalid Date');
    expect(new Date(saved?.updatedAt ?? '').toString()).not.toBe('Invalid Date');
  });
});
