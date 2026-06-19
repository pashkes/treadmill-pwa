import type { Workout } from './workout';

export type WorkoutExportPayload = {
  schemaVersion: 1;
  exportedAt: string;
  workouts: Workout[];
};

export function createExportPayload(workouts: Workout[], exportedAt = new Date().toISOString()): WorkoutExportPayload {
  return {
    schemaVersion: 1,
    exportedAt,
    workouts,
  };
}

export function parseWorkoutExportPayload(content: string): WorkoutExportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error('Invalid workout export payload', { cause: error });
  }

  if (!isWorkoutExportPayload(parsed)) {
    throw new Error('Invalid workout export payload');
  }
  return parsed;
}

function isWorkoutExportPayload(value: unknown): value is WorkoutExportPayload {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1) return false;
  if (typeof value.exportedAt !== 'string' || Number.isNaN(Date.parse(value.exportedAt))) return false;
  if (!Array.isArray(value.workouts)) return false;
  return value.workouts.every(isWorkout);
}

function isWorkout(value: unknown): value is Workout {
  if (!isRecord(value)) return false;
  return (
    isNonNegativeInteger(value.id) &&
    isLocalDateString(value.date) &&
    isTimeString(value.time) &&
    isNonNegativeNumber(value.seconds) &&
    isNonNegativeNumber(value.km) &&
    isNonNegativeNumber(value.kcal) &&
    isNonNegativeNumber(value.min) &&
    isNonNegativeNumber(value.steps) &&
    isNonNegativeNumber(value.maxSpeed)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isLocalDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value);
}
