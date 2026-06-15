import { create } from 'zustand';
import { addWorkout } from '../../db/workout-repository';
import { nowTimeString, todayString } from '../../domain/date-time';
import type { Workout } from '../../domain/workout';
import type { FtmsConnection, FtmsConnectionErrorCode, TreadmillData } from '../bluetooth/ftms';
import { clearActiveWorkout, persistActiveWorkout, readActiveWorkout } from './active-workout-storage';
import { applyTreadmillData, createWorkoutFromLiveState, tickLiveWorkout } from './live-workout-calculations';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type LiveState = {
  isConnected: boolean;
  deviceName: string | null;
  connectionStatus: ConnectionStatus;
  connectionError: FtmsConnectionErrorCode | null;
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
  restoredFromStorage: boolean;
  autoStopRequested: boolean;
  setConnection: (isConnected: boolean, deviceName: string | null) => void;
  setConnectionStatus: (connectionStatus: ConnectionStatus, connectionError?: FtmsConnectionErrorCode | null) => void;
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

function resetActiveWorkoutState(): Pick<
  LiveState,
  | 'isPaused'
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
  | 'restoredFromStorage'
  | 'autoStopRequested'
> {
  return {
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
    restoredFromStorage: false,
    autoStopRequested: false,
  };
}

export const useLiveStore = create<LiveState>((set, get) => ({
  isConnected: false,
  deviceName: null,
  connectionStatus: 'disconnected',
  connectionError: null,
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
  restoredFromStorage: false,
  autoStopRequested: false,
  setConnection: (isConnected, deviceName) =>
    set({
      isConnected,
      deviceName,
      connectionStatus: isConnected ? 'connected' : 'disconnected',
      connectionError: null,
    }),
  setConnectionStatus: (connectionStatus, connectionError = null) =>
    set((state) => ({
      connectionStatus,
      connectionError,
      isConnected: connectionStatus === 'connected',
      deviceName: connectionStatus === 'disconnected' ? null : state.deviceName,
    })),
  setFtmsConnection: (ftmsConnection) => set({ ftmsConnection }),
  setSpeed: (speedKph) => set((state) => ({ speedKph, maxSpeed: Math.max(state.maxSpeed, speedKph) })),
  setTreadmillData: (data) =>
    set((state) => {
      const nextState = applyTreadmillData(state, data);
      persistActiveWorkout(nextState);
      return nextState;
    }),
  restoreActiveWorkout: () => {
    const activeWorkout = readActiveWorkout();
    if (!activeWorkout?.startedAt || !activeWorkout.startedDate) return false;

    set({
      ...activeWorkout,
      isConnected: false,
      connectionStatus: 'disconnected',
      connectionError: null,
      isPaused: false,
      ftmsConnection: null,
      restoredFromStorage: true,
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
      restoredFromStorage: false,
      autoStopRequested: false,
    };
    set(nextState);
    persistActiveWorkout({ ...currentState, ...nextState });
    void currentState.ftmsConnection?.startWorkout();
    return true;
  },
  tick: () =>
    set((state) => {
      const nextState = tickLiveWorkout(state);
      if (nextState === state) return state;
      persistActiveWorkout(nextState);
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
    const workout: Workout = createWorkoutFromLiveState(state);
    if (workout.seconds <= 0) {
      clearActiveWorkout();
      set(resetActiveWorkoutState());
      return null;
    }
    await addWorkout(workout);
    clearActiveWorkout();
    set(resetActiveWorkoutState());
    return workout;
  },
  clearAutoStopRequest: () => set({ autoStopRequested: false }),
}));
