import { create } from 'zustand';
import { addWorkout } from '../../db/workout-repository';
import { nowTimeString, todayString } from '../../domain/date-time';
import type { Workout } from '../../domain/workout';
import type { FtmsConnection, TreadmillData } from '../bluetooth/ftms';

const ACTIVE_WORKOUT_KEY = 'walking-app-active-workout';
const MOVING_SPEED_KPH = 0.1;
const ESTIMATED_STRIDE_LENGTH_METERS = 0.78125;

type LiveState = {
  isConnected: boolean;
  deviceName: string | null;
  isPaused: boolean;
  startedDate: string | null;
  startedAt: string | null;
  ftmsConnection: FtmsConnection | null;
  seconds: number;
  speedKph: number;
  maxSpeed: number;
  km: number;
  kcal: number;
  steps: number;
  inclinePercent: number;
  hasStartedMoving: boolean;
  autoStopRequested: boolean;
  setConnection: (isConnected: boolean, deviceName: string | null) => void;
  setFtmsConnection: (connection: FtmsConnection | null) => void;
  setSpeed: (speedKph: number) => void;
  setTreadmillData: (data: TreadmillData) => void;
  restoreActiveWorkout: () => boolean;
  start: () => boolean;
  tick: () => void;
  pause: () => void;
  resume: () => void;
  changeSpeed: (delta: number) => void;
  stopAndSave: () => Promise<Workout | null>;
  clearAutoStopRequest: () => void;
};

type PersistedActiveWorkout = Pick<
  LiveState,
  | 'deviceName'
  | 'startedDate'
  | 'startedAt'
  | 'seconds'
  | 'speedKph'
  | 'maxSpeed'
  | 'km'
  | 'kcal'
  | 'steps'
  | 'inclinePercent'
  | 'hasStartedMoving'
>;

function estimateSteps(distanceKm: number): number {
  return Math.round((Math.max(0, distanceKm) * 1000) / ESTIMATED_STRIDE_LENGTH_METERS);
}

function persistActiveWorkout(state: LiveState): void {
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

function readActiveWorkout(): PersistedActiveWorkout | null {
  const raw = window.localStorage.getItem(ACTIVE_WORKOUT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PersistedActiveWorkout;
  } catch {
    window.localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    return null;
  }
}

function clearActiveWorkout(): void {
  window.localStorage.removeItem(ACTIVE_WORKOUT_KEY);
}

export const useLiveStore = create<LiveState>((set, get) => ({
  isConnected: false,
  deviceName: null,
  isPaused: false,
  startedDate: null,
  startedAt: null,
  ftmsConnection: null,
  seconds: 0,
  speedKph: 0,
  maxSpeed: 0,
  km: 0,
  kcal: 0,
  steps: 0,
  inclinePercent: 0,
  hasStartedMoving: false,
  autoStopRequested: false,
  setConnection: (isConnected, deviceName) => set({ isConnected, deviceName }),
  setFtmsConnection: (ftmsConnection) => set({ ftmsConnection }),
  setSpeed: (speedKph) => set((state) => ({ speedKph, maxSpeed: Math.max(state.maxSpeed, speedKph) })),
  setTreadmillData: (data) =>
    set((state) => {
      const speedKph = data.speedKph ?? state.speedKph;
      // Only actual belt movement (speed or distance) signals a started session.
      // The treadmill sends a countdown (elapsedSeconds=5,4,3…) before the belt starts;
      // including elapsedSeconds here would trigger auto-stop before any movement.
      const hasStartedMoving = state.hasStartedMoving || speedKph > MOVING_SPEED_KPH || state.km > 0 || (data.distanceKm ?? 0) > 0;
      const isPaused =
        state.startedAt && state.hasStartedMoving && data.speedKph !== undefined ? data.speedKph <= MOVING_SPEED_KPH : state.isPaused;

      // Don't sync the timer until the belt is actually moving — the pre-start countdown
      // uses the same elapsedSeconds field and would show a descending counter on screen.
      const prevSeconds = state.seconds;
      const newSeconds = hasStartedMoving ? Math.max(state.seconds, data.elapsedSeconds ?? state.seconds) : state.seconds;

      // Use treadmill distance when it reports a non-zero value.
      // Many treadmills (including SW / T30EA-0227) always transmit distanceKm=0 even
      // when running, so we fall back to integrating speed × elapsed-time delta.
      let km: number;
      if (data.distanceKm !== undefined && data.distanceKm > 0) {
        km = Math.max(state.km, data.distanceKm);
      } else if (hasStartedMoving && speedKph > MOVING_SPEED_KPH) {
        const deltaSeconds = Math.min(2, Math.max(0, newSeconds - prevSeconds));
        km = state.km + (speedKph / 3600) * deltaSeconds;
      } else {
        km = state.km;
      }

      const steps = data.steps ?? estimateSteps(km);

      const nextState = {
        speedKph,
        maxSpeed: data.speedKph === undefined ? state.maxSpeed : Math.max(state.maxSpeed, data.speedKph),
        seconds: newSeconds,
        km,
        kcal: data.kcal ?? state.kcal,
        steps,
        inclinePercent: data.inclinePercent ?? state.inclinePercent,
        hasStartedMoving,
        isPaused,
        autoStopRequested: state.autoStopRequested,
      };

      persistActiveWorkout({ ...state, ...nextState });
      return nextState;
    }),
  restoreActiveWorkout: () => {
    const activeWorkout = readActiveWorkout();
    if (!activeWorkout?.startedAt || !activeWorkout.startedDate) return false;

    set({
      ...activeWorkout,
      isConnected: false,
      isPaused: false,
      ftmsConnection: null,
      autoStopRequested: false,
    });
    return true;
  },
  start: () => {
    const currentState = get();
    if (!currentState.isConnected) return false;

    if (currentState.startedAt && currentState.startedDate) {
      const nextState = {
        isPaused: false,
        autoStopRequested: false,
      };
      set(nextState);
      persistActiveWorkout({ ...currentState, ...nextState });
      return true;
    }

    const nextState = {
      isPaused: false,
      startedDate: todayString(),
      startedAt: nowTimeString(),
      seconds: 0,
      speedKph: currentState.speedKph,
      maxSpeed: currentState.speedKph,
      km: 0,
      kcal: 0,
      steps: 0,
      inclinePercent: 0,
      hasStartedMoving: false,
      autoStopRequested: false,
    };
    set(nextState);
    persistActiveWorkout({ ...currentState, ...nextState });
    void currentState.ftmsConnection?.startWorkout();
    return true;
  },
  tick: () =>
    set((state) => {
      if (!state.startedAt || !state.hasStartedMoving || state.isPaused || state.speedKph <= MOVING_SPEED_KPH) return state;

      const km = state.km + state.speedKph / 3600;
      const nextState = {
        seconds: state.seconds + 1,
        km,
        steps: estimateSteps(km),
      };
      persistActiveWorkout({ ...state, ...nextState });
      return nextState;
    }),
  pause: () => set((state) => ({ isPaused: !state.isPaused })),
  resume: () => {
    set({ isPaused: false, autoStopRequested: false });
    void get().ftmsConnection?.startWorkout();
  },
  changeSpeed: (delta) =>
    set((state) => {
      const speedKph = Math.max(0, Math.min(20, state.speedKph + delta));
      if (state.ftmsConnection && state.isConnected) {
        void state.ftmsConnection.writeSpeed(speedKph);
      }
      return { speedKph, maxSpeed: Math.max(state.maxSpeed, speedKph) };
    }),
  stopAndSave: async () => {
    const state = get();
    if (state.ftmsConnection) void state.ftmsConnection.stopWorkout();
    const workout: Workout = {
      id: Date.now(),
      date: state.startedDate ?? todayString(),
      time: state.startedAt ?? nowTimeString(),
      seconds: state.seconds,
      km: Math.round(state.km * 100) / 100,
      kcal: Math.round(state.kcal),
      min: Math.round(state.seconds / 60),
      steps: Math.round(state.steps),
      maxSpeed: Math.round(state.maxSpeed * 10) / 10,
    };
    if (workout.seconds <= 0) {
      clearActiveWorkout();
      return null;
    }
    await addWorkout(workout);
    clearActiveWorkout();
    set({
      isPaused: false,
      startedDate: null,
      startedAt: null,
      seconds: 0,
      speedKph: 0,
      maxSpeed: 0,
      km: 0,
      kcal: 0,
      steps: 0,
      inclinePercent: 0,
      hasStartedMoving: false,
      autoStopRequested: false,
    });
    return workout;
  },
  clearAutoStopRequest: () => set({ autoStopRequested: false }),
}));
