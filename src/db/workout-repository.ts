import { createExportPayload, type WorkoutExportPayload } from '../domain/export';
import type { Workout } from '../domain/workout';
import { db } from './app-db';

const LEGACY_KEY = 'treadmill_v2';
const MIGRATION_KEY = 'treadmill_v2_migrated_to_dexie';

function isWorkout(value: unknown): value is Workout {
  if (!value || typeof value !== 'object') return false;
  const workout = value as Record<string, unknown>;
  return (
    typeof workout.id === 'number' &&
    typeof workout.date === 'string' &&
    typeof workout.time === 'string' &&
    typeof workout.seconds === 'number' &&
    typeof workout.km === 'number' &&
    typeof workout.kcal === 'number' &&
    typeof workout.min === 'number' &&
    typeof workout.steps === 'number' &&
    typeof workout.maxSpeed === 'number'
  );
}

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

export async function bulkPutWorkouts(workouts: Workout[]): Promise<number> {
  return db.workouts.bulkPut(workouts);
}

export async function exportWorkouts(): Promise<Workout[]> {
  return listWorkouts();
}

export async function createWorkoutExportPayload(): Promise<WorkoutExportPayload> {
  return createExportPayload(await exportWorkouts());
}

export async function migrateLegacyLocalStorageWorkouts(): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY) === '1') return;

  let parsed: unknown = [];
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    parsed = raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Unable to parse legacy workouts', error);
    localStorage.setItem(MIGRATION_KEY, '1');
    return;
  }

  try {
    if (!Array.isArray(parsed)) {
      localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }
    const workouts = parsed.filter(isWorkout);
    if (workouts.length > 0) {
      await bulkPutWorkouts(workouts);
    }
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch (error) {
    console.warn('Unable to migrate legacy workouts', error);
  }
}
