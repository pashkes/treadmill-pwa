export const ACTIVE_WORKOUT_KEY = 'walking-app-active-workout';

export type PersistedActiveWorkout = {
  deviceName: string | null;
  startedDate: string | null;
  startedAt: string | null;
  seconds: number;
  speedKph: number;
  maxSpeed: number;
  km: number;
  kcal: number;
  steps: number;
  inclinePercent: number;
  hasStartedMoving: boolean;
};

export function persistActiveWorkout(state: PersistedActiveWorkout): void {
  if (!state.startedAt || !state.startedDate) return;

  const payload: PersistedActiveWorkout = {
    deviceName: state.deviceName,
    startedDate: state.startedDate,
    startedAt: state.startedAt,
    seconds: state.seconds,
    speedKph: state.speedKph,
    maxSpeed: state.maxSpeed,
    km: state.km,
    kcal: state.kcal,
    steps: state.steps,
    inclinePercent: state.inclinePercent,
    hasStartedMoving: state.hasStartedMoving,
  };
  window.localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(payload));
}

export function readActiveWorkout(): PersistedActiveWorkout | null {
  const raw = window.localStorage.getItem(ACTIVE_WORKOUT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PersistedActiveWorkout;
  } catch {
    clearActiveWorkout();
    return null;
  }
}

export function clearActiveWorkout(): void {
  window.localStorage.removeItem(ACTIVE_WORKOUT_KEY);
}
