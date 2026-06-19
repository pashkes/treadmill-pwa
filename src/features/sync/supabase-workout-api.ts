import type { Workout } from '../../domain/workout';
import type { RemoteWorkoutApi } from './workout-sync';

export type RemoteWorkoutRow = {
  client_id: string;
  user_id: string;
  workout_date: string;
  workout_time: string;
  seconds: number;
  km: number;
  kcal: number;
  minutes: number;
  steps: number;
  max_speed: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type SupabaseWorkoutClient = {
  from: (table: 'workouts') => {
    select: (columns: '*') => {
      eq: (column: 'user_id', value: string) => Promise<{ data: RemoteWorkoutRow[] | null; error: { message: string } | null }>;
    };
    upsert: (rows: RemoteWorkoutRow[], options: { onConflict: 'client_id' }) => Promise<{ error: { message: string } | null }>;
  };
};

export function toRemoteWorkout(workout: Workout): RemoteWorkoutRow {
  if (!workout.ownerUserId) {
    throw new Error('Cannot map workout without ownerUserId');
  }

  return {
    client_id: workout.clientId,
    user_id: workout.ownerUserId,
    workout_date: workout.date,
    workout_time: workout.time,
    seconds: workout.seconds,
    km: workout.km,
    kcal: workout.kcal,
    minutes: workout.min,
    steps: workout.steps,
    max_speed: workout.maxSpeed,
    created_at: workout.createdAt,
    updated_at: workout.updatedAt,
    deleted_at: workout.deletedAt,
  };
}

export function fromRemoteWorkout(row: RemoteWorkoutRow): Workout {
  return {
    id: 0,
    clientId: row.client_id,
    ownerUserId: row.user_id,
    date: row.workout_date,
    time: row.workout_time,
    seconds: row.seconds,
    km: row.km,
    kcal: row.kcal,
    min: row.minutes,
    steps: row.steps,
    maxSpeed: row.max_speed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncStatus: 'synced',
  };
}

export function createSupabaseWorkoutApi(client: SupabaseWorkoutClient): RemoteWorkoutApi {
  return {
    async listWorkouts(userId) {
      const { data, error } = await client.from('workouts').select('*').eq('user_id', userId);
      if (error) throw new Error(error.message);
      return (data ?? []).map(fromRemoteWorkout);
    },
    async upsertWorkouts(workouts) {
      const rows = workouts.map(toRemoteWorkout);
      const { error } = await client.from('workouts').upsert(rows, { onConflict: 'client_id' });
      if (error) throw new Error(error.message);
    },
  };
}
