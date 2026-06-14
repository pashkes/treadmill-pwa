import { createExportPayload, type WorkoutExportPayload } from '../domain/export';
import type { Workout } from '../domain/workout';
import { db } from './app-db';

const LEGACY_KEY = 'treadmill_v2';
const MIGRATION_KEY = 'treadmill_v2_migrated_to_dexie';

function normalizeLegacyWorkout(value: unknown): Workout | null {
  if (!value || typeof value !== 'object') return null;
  const workout = value as Record<string, unknown>;
  const hasRequiredFields =
    typeof workout.id === 'number' &&
    typeof workout.date === 'string' &&
    typeof workout.time === 'string' &&
    typeof workout.km === 'number' &&
    typeof workout.kcal === 'number' &&
    typeof workout.min === 'number';
  if (!hasRequiredFields) return null;

  const id = workout.id as number;
  const date = workout.date as string;
  const time = workout.time as string;
  const km = workout.km as number;
  const kcal = workout.kcal as number;
  const min = workout.min as number;

  return {
    id,
    date,
    time,
    seconds: typeof workout.seconds === 'number' ? workout.seconds : min * 60,
    km,
    kcal,
    min,
    steps: typeof workout.steps === 'number' ? workout.steps : 0,
    maxSpeed: typeof workout.maxSpeed === 'number' ? workout.maxSpeed : 0,
  };
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
    const workouts = parsed.map(normalizeLegacyWorkout).filter((workout): workout is Workout => workout !== null);
    if (workouts.length > 0) {
      await bulkPutWorkouts(workouts);
    }
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch (error) {
    console.warn('Unable to migrate legacy workouts', error);
  }
}
