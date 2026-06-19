import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './app-db';

export function useTodayWorkouts(today: string) {
  return useLiveQuery(async () => (await db.workouts.where('date').equals(today).toArray()).filter((workout) => !workout.deletedAt), [today]) ?? [];
}

export function useAllWorkouts() {
  return useLiveQuery(async () => (await db.workouts.toArray()).filter((workout) => !workout.deletedAt), []) ?? [];
}

export function useWorkoutsByDateDesc() {
  return useLiveQuery(async () => (await db.workouts.orderBy('date').reverse().toArray()).filter((workout) => !workout.deletedAt), []) ?? [];
}

export function useWorkout(id: number | null) {
  return useLiveQuery(async () => {
    const workout = id ? await db.workouts.get(id) : undefined;
    return workout?.deletedAt ? undefined : workout;
  }, [id]);
}
