import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/app-db';
import { addWorkout } from '../../db/workout-repository';
import { makeWorkout } from '../../test/workout-fixtures';
import { syncWorkouts, type RemoteWorkoutApi } from './workout-sync';

function createFakeRemote(): RemoteWorkoutApi & {
  listWorkouts: ReturnType<typeof vi.fn<RemoteWorkoutApi['listWorkouts']>>;
  upsertWorkouts: ReturnType<typeof vi.fn<RemoteWorkoutApi['upsertWorkouts']>>;
} {
  return {
    listWorkouts: vi.fn<RemoteWorkoutApi['listWorkouts']>().mockResolvedValue([]),
    upsertWorkouts: vi.fn<RemoteWorkoutApi['upsertWorkouts']>().mockResolvedValue(undefined),
  };
}

describe('workout sync', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await db.workouts.clear();
  });

  it('attaches guest workouts to the current user before push', async () => {
    const fakeRemote = createFakeRemote();
    await addWorkout(makeWorkout({ id: 1, ownerUserId: null, syncStatus: 'local' }));

    await syncWorkouts({ userId: 'user-a', remote: fakeRemote });

    expect((await db.workouts.get(1))?.ownerUserId).toBe('user-a');
    expect(fakeRemote.upsertWorkouts).toHaveBeenCalledWith([expect.objectContaining({ id: 1, ownerUserId: 'user-a' })]);
  });

  it('does not push workouts owned by a different user', async () => {
    const fakeRemote = createFakeRemote();
    await addWorkout(makeWorkout({ id: 1, ownerUserId: 'user-b', syncStatus: 'pending' }));

    await syncWorkouts({ userId: 'user-a', remote: fakeRemote });

    expect(fakeRemote.upsertWorkouts).not.toHaveBeenCalled();
  });

  it('pulls newer remote workouts into Dexie', async () => {
    const fakeRemote = createFakeRemote();
    await addWorkout(
      makeWorkout({
        id: 1,
        clientId: '11111111-1111-4111-8111-111111111111',
        ownerUserId: 'user-a',
        updatedAt: '2026-06-19T08:30:00.000Z',
        kcal: 60,
      }),
    );
    fakeRemote.listWorkouts.mockResolvedValue([
      makeWorkout({
        id: 999,
        clientId: '11111111-1111-4111-8111-111111111111',
        ownerUserId: 'user-a',
        updatedAt: '2026-06-19T08:31:00.000Z',
        kcal: 70,
        syncStatus: 'synced',
      }),
    ]);

    await syncWorkouts({ userId: 'user-a', remote: fakeRemote });

    expect((await db.workouts.get(1))?.kcal).toBe(70);
    expect((await db.workouts.get(1))?.id).toBe(1);
  });

  it('pushes newer local workouts when the remote copy is older', async () => {
    const fakeRemote = createFakeRemote();
    await addWorkout(
      makeWorkout({
        id: 1,
        clientId: '11111111-1111-4111-8111-111111111111',
        ownerUserId: 'user-a',
        updatedAt: '2026-06-19T08:31:00.000Z',
        kcal: 80,
        syncStatus: 'pending',
      }),
    );
    fakeRemote.listWorkouts.mockResolvedValue([
      makeWorkout({
        id: 999,
        clientId: '11111111-1111-4111-8111-111111111111',
        ownerUserId: 'user-a',
        updatedAt: '2026-06-19T08:30:00.000Z',
        kcal: 70,
        syncStatus: 'synced',
      }),
    ]);

    await syncWorkouts({ userId: 'user-a', remote: fakeRemote });

    expect(fakeRemote.upsertWorkouts).toHaveBeenCalledWith([expect.objectContaining({ id: 1, kcal: 80 })]);
    expect((await db.workouts.get(1))?.syncStatus).toBe('synced');
  });

  it('stores remote-only workouts with a local id', async () => {
    const fakeRemote = createFakeRemote();
    fakeRemote.listWorkouts.mockResolvedValue([
      makeWorkout({
        id: 0,
        clientId: '33333333-3333-4333-8333-333333333333',
        ownerUserId: 'user-a',
        syncStatus: 'synced',
      }),
    ]);

    await syncWorkouts({ userId: 'user-a', remote: fakeRemote });

    const saved = await db.workouts.where('clientId').equals('33333333-3333-4333-8333-333333333333').first();
    expect(saved?.id).toBeGreaterThan(0);
    expect(saved?.ownerUserId).toBe('user-a');
  });
});
