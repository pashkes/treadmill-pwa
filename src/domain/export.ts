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
