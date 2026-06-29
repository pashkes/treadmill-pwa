import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './app-db';

export function useTodayWorkouts(today: string) {
  return (
    useLiveQuery(async () => (await db.workouts.where('date').equals(today).toArray()).filter((workout) => !workout.deletedAt), [today]) ??
    []
  );
}

export function useAllWorkouts() {
  return useLiveQuery(async () => (await db.workouts.toArray()).filter((workout) => !workout.deletedAt), []) ?? [];
}

export function useWorkoutsByDateDesc(limit?: number) {
  return (
    useLiveQuery(async () => {
      const collection = db.workouts
        .orderBy('[date+time+id]')
        .reverse()
        .filter((workout) => !workout.deletedAt);

      return limit ? await collection.limit(limit).toArray() : await collection.toArray();
    }, [limit]) ?? []
  );
}

export function useWorkoutHistoryCount() {
  return useLiveQuery(async () => db.workouts.filter((workout) => !workout.deletedAt).count(), []) ?? 0;
}

export function useWorkout(id: number | null) {
  return useLiveQuery(async () => {
    const workout = id ? await db.workouts.get(id) : undefined;
    return workout?.deletedAt ? undefined : workout;
  }, [id]);
}
