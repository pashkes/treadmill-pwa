import { createExportPayload, type WorkoutExportPayload } from '../domain/export';
import type { Workout } from '../domain/workout';
import { db } from './app-db';

export async function listWorkouts(): Promise<Workout[]> {
  const workouts = await db.workouts.orderBy('date').reverse().toArray();
  return workouts.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export async function getWorkout(id: number): Promise<Workout | undefined> {
  return db.workouts.get(id);
}

export async function addWorkout(workout: Workout): Promise<number> {
  return db.workouts.put(workout);
}

export async function deleteWorkout(id: number): Promise<void> {
  await db.workouts.delete(id);
}

export async function bulkPutWorkouts(workouts: Workout[]): Promise<number> {
  return db.workouts.bulkPut(workouts);
}

export async function exportWorkouts(): Promise<Workout[]> {
  return listWorkouts();
}

export async function createWorkoutExportPayload(): Promise<WorkoutExportPayload> {
  return createExportPayload(await exportWorkouts());
}
