import { createWorkoutSyncFields, type Workout } from './workout';

const ESTIMATED_STRIDE_LENGTH_METERS = 0.9;

export type ManualWorkoutInput = {
  date: string;
  time: string;
  km: number;
  minutes: number;
  kcal: number;
};

export function estimateSteps(distanceKm: number): number {
  return Math.round((Math.max(0, distanceKm) * 1000) / ESTIMATED_STRIDE_LENGTH_METERS);
}

export function createManualWorkout(input: ManualWorkoutInput, id: number, now = new Date().toISOString()): Workout {
  const seconds = Math.round(input.minutes * 60);
  const km = Math.round(input.km * 100) / 100;

  return {
    id,
    ...createWorkoutSyncFields(now),
    date: input.date,
    time: input.time,
    seconds,
    km,
    kcal: Math.round(input.kcal),
    min: Math.round(input.minutes),
    steps: estimateSteps(input.km),
    maxSpeed: 0,
  };
}
