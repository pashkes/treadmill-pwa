import { createExportPayload, parseWorkoutExportPayload, type WorkoutExportPayload } from '../domain/export';
import type { Workout } from '../domain/workout';
import { db } from './app-db';

function visible(workouts: Workout[]): Workout[] {
  return workouts.filter((workout) => !workout.deletedAt);
}

export async function listWorkouts(): Promise<Workout[]> {
  const workouts = visible(await db.workouts.orderBy('date').reverse().toArray());
  return workouts.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export async function getWorkout(id: number): Promise<Workout | undefined> {
  const workout = await db.workouts.get(id);
  return workout?.deletedAt ? undefined : workout;
}

export async function addWorkout(workout: Workout): Promise<number> {
  return db.workouts.put({ ...workout, syncStatus: workout.ownerUserId ? 'pending' : workout.syncStatus });
}

export async function deleteWorkout(id: number): Promise<void> {
  const workout = await db.workouts.get(id);
  if (!workout) return;
  const deletedAt = new Date().toISOString();
  await db.workouts.put({
    ...workout,
    deletedAt,
    updatedAt: deletedAt,
    syncStatus: workout.ownerUserId ? 'pending' : 'local',
  });
}

export async function bulkPutWorkouts(workouts: Workout[]): Promise<number> {
  return db.workouts.bulkPut(workouts);
}

export async function createLocalWorkoutId(): Promise<number> {
  const lastWorkout = await db.workouts.orderBy('id').last();
  return Math.max(Date.now(), (lastWorkout?.id ?? 0) + 1);
}

export async function listAllWorkoutsIncludingDeleted(): Promise<Workout[]> {
  return db.workouts.toArray();
}

export async function listWorkoutsForSync(userId: string): Promise<Workout[]> {
  return db.workouts
    .filter((workout) => workout.ownerUserId === userId && ['local', 'pending', 'error'].includes(workout.syncStatus))
    .toArray();
}

export async function attachGuestWorkoutsToUser(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.workouts
    .filter((workout) => workout.ownerUserId === null)
    .modify((workout) => {
      workout.ownerUserId = userId;
      workout.updatedAt = now;
      workout.syncStatus = 'pending';
    });
}

export async function exportWorkouts(): Promise<Workout[]> {
  return listWorkouts();
}

export async function createWorkoutExportPayload(): Promise<WorkoutExportPayload> {
  return createExportPayload(await exportWorkouts());
}

export async function importWorkoutExportPayload(content: string): Promise<number> {
  const payload = parseWorkoutExportPayload(content);
  if (payload.workouts.length === 0) return 0;
  await bulkPutWorkouts(payload.workouts);
  return payload.workouts.length;
}
