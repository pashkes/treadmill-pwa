import { describe, expect, it, vi } from 'vitest';
import { makeWorkout } from '../../test/workout-fixtures';
import { createSupabaseWorkoutApi, fromRemoteWorkout, toRemoteWorkout, type RemoteWorkoutRow } from './supabase-workout-api';

const row: RemoteWorkoutRow = {
  client_id: '11111111-1111-4111-8111-111111111111',
  user_id: 'user-a',
  workout_date: '2026-06-13',
  workout_time: '08:30',
  seconds: 600,
  km: 1,
  kcal: 65,
  minutes: 10,
  steps: 1200,
  max_speed: 6,
  created_at: '2026-06-13T08:30:00.000Z',
  updated_at: '2026-06-13T08:30:00.000Z',
  deleted_at: null,
};

describe('supabase workout api', () => {
  it('maps local workouts to Supabase rows', () => {
    expect(toRemoteWorkout(makeWorkout({ ownerUserId: 'user-a' }))).toMatchObject({
      client_id: '11111111-1111-4111-8111-111111111111',
      user_id: 'user-a',
      workout_date: '2026-06-13',
      workout_time: '08:30',
      minutes: 10,
      max_speed: 6,
    });
  });

  it('requires an owner before mapping local workouts to Supabase rows', () => {
    expect(() => toRemoteWorkout(makeWorkout({ ownerUserId: null }))).toThrow('Cannot map workout without ownerUserId');
  });

  it('maps Supabase rows to local workouts', () => {
    expect(fromRemoteWorkout(row)).toMatchObject({
      id: 0,
      clientId: '11111111-1111-4111-8111-111111111111',
      ownerUserId: 'user-a',
      date: '2026-06-13',
      time: '08:30',
      min: 10,
      maxSpeed: 6,
      syncStatus: 'synced',
    });
  });

  it('lists remote workouts for a user', async () => {
    const eq = vi.fn().mockResolvedValue({ data: [row], error: null });
    const select = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ select }) };
    const api = createSupabaseWorkoutApi(client);

    await expect(api.listWorkouts('user-a')).resolves.toEqual([fromRemoteWorkout(row)]);
    expect(client.from).toHaveBeenCalledWith('workouts');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-a');
  });

  it('upserts remote workouts by client_id', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn().mockReturnValue({ upsert }) };
    const api = createSupabaseWorkoutApi(client);

    await api.upsertWorkouts([makeWorkout({ ownerUserId: 'user-a' })]);

    expect(upsert).toHaveBeenCalledWith([expect.objectContaining({ client_id: '11111111-1111-4111-8111-111111111111' })], {
      onConflict: 'client_id',
    });
  });
});
