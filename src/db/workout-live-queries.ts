import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './app-db';

export function useTodayWorkouts(today: string) {
  return useLiveQuery(() => db.workouts.where('date').equals(today).toArray(), [today]) ?? [];
}

export function useAllWorkouts() {
  return useLiveQuery(() => db.workouts.toArray(), []) ?? [];
}

export function useWorkoutsByDateDesc() {
  return useLiveQuery(() => db.workouts.orderBy('date').reverse().toArray(), []) ?? [];
}

export function useWorkout(id: number | null) {
  return useLiveQuery(() => (id ? db.workouts.get(id) : undefined), [id]);
}
