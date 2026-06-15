import { nowTimeString, todayString } from '../../domain/date-time';
import type { Workout } from '../../domain/workout';
import type { TreadmillData } from '../bluetooth/ftms';

const MOVING_SPEED_KPH = 0.1;
const ESTIMATED_STRIDE_LENGTH_METERS = 0.78125;

export type LiveWorkoutCalculationState = {
  startedDate: string | null;
  startedAt: string | null;
  isPaused: boolean;
  seconds: number;
  speedKph: number;
  maxSpeed: number;
  km: number;
  kcal: number;
  steps: number;
  inclinePercent: number;
  hasStartedMoving: boolean;
  restoredFromStorage: boolean;
  autoStopRequested: boolean;
};

export function estimateSteps(distanceKm: number): number {
  return Math.round((Math.max(0, distanceKm) * 1000) / ESTIMATED_STRIDE_LENGTH_METERS);
}

export function inferWorkoutSeconds(state: Pick<LiveWorkoutCalculationState, 'seconds' | 'km' | 'maxSpeed' | 'hasStartedMoving' | 'kcal' | 'steps'>): number {
  if (state.seconds > 0) return state.seconds;

  if (state.km > 0 && state.maxSpeed > MOVING_SPEED_KPH) {
    return Math.max(1, Math.round((state.km / state.maxSpeed) * 3600));
  }

  if (state.hasStartedMoving || state.km > 0 || state.kcal > 0 || state.steps > 0) {
    return 1;
  }

  return 0;
}

export function applyTreadmillData<T extends LiveWorkoutCalculationState>(state: T, data: TreadmillData): T {
  const speedKph = data.speedKph ?? state.speedKph;
  const hasStartedMoving = state.hasStartedMoving || speedKph > MOVING_SPEED_KPH || state.km > 0 || (data.distanceKm ?? 0) > 0;
  const isPaused =
    state.startedAt && state.hasStartedMoving && data.speedKph !== undefined ? data.speedKph <= MOVING_SPEED_KPH : state.isPaused;
  const isStoppedResetAfterRestore =
    state.restoredFromStorage &&
    data.speedKph !== undefined &&
    data.speedKph <= MOVING_SPEED_KPH &&
    ((data.elapsedSeconds !== undefined && data.elapsedSeconds < state.seconds) ||
      (data.distanceKm !== undefined && data.distanceKm < state.km) ||
      data.kcal === 0);

  const prevSeconds = state.seconds;
  const seconds = isStoppedResetAfterRestore
    ? state.seconds
    : hasStartedMoving
      ? Math.max(state.seconds, data.elapsedSeconds ?? state.seconds)
      : state.seconds;

  let km: number;
  if (isStoppedResetAfterRestore) {
    km = state.km;
  } else if (data.distanceKm !== undefined && data.distanceKm > 0) {
    km = Math.max(state.km, data.distanceKm);
  } else if (hasStartedMoving && speedKph > MOVING_SPEED_KPH) {
    const deltaSeconds = Math.min(2, Math.max(0, seconds - prevSeconds));
    km = state.km + (speedKph / 3600) * deltaSeconds;
  } else {
    km = state.km;
  }

  const steps = data.steps ?? estimateSteps(km);

  return {
    ...state,
    speedKph,
    maxSpeed: data.speedKph === undefined ? state.maxSpeed : Math.max(state.maxSpeed, data.speedKph),
    seconds,
    km,
    kcal: isStoppedResetAfterRestore ? state.kcal : (data.kcal ?? state.kcal),
    steps: isStoppedResetAfterRestore ? state.steps : steps,
    inclinePercent: isStoppedResetAfterRestore ? state.inclinePercent : (data.inclinePercent ?? state.inclinePercent),
    hasStartedMoving,
    isPaused: Boolean(isPaused),
    restoredFromStorage: state.restoredFromStorage && speedKph <= MOVING_SPEED_KPH,
    autoStopRequested: state.autoStopRequested,
  };
}

export function tickLiveWorkout<T extends LiveWorkoutCalculationState>(state: T): T {
  if (!state.startedAt || !state.hasStartedMoving || state.isPaused || state.speedKph <= MOVING_SPEED_KPH) return state;

  const km = state.km + state.speedKph / 3600;
  return {
    ...state,
    seconds: state.seconds + 1,
    km,
    steps: estimateSteps(km),
  };
}

export function createWorkoutFromLiveState(state: LiveWorkoutCalculationState): Workout {
  const seconds = inferWorkoutSeconds(state);
  return {
    id: Date.now(),
    date: state.startedDate ?? todayString(),
    time: state.startedAt ?? nowTimeString(),
    seconds,
    km: Math.round(state.km * 100) / 100,
    kcal: Math.round(state.kcal),
    min: Math.round(seconds / 60),
    steps: Math.round(state.steps),
    maxSpeed: Math.round(state.maxSpeed * 10) / 10,
  };
}
