import { create } from 'zustand';
import { addWorkout } from '../../db/workout-repository';
import { nowTimeString, todayString } from '../../domain/date-time';
import type { Workout } from '../../domain/workout';
import type { FtmsConnection } from '../bluetooth/ftms';

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
  setConnection: (isConnected: boolean, deviceName: string | null) => void;
  setFtmsConnection: (connection: FtmsConnection | null) => void;
  setSpeed: (speedKph: number) => void;
  start: () => void;
  tick: () => void;
  pause: () => void;
  changeSpeed: (delta: number) => void;
  stopAndSave: () => Promise<Workout | null>;
};

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
  setConnection: (isConnected, deviceName) => set({ isConnected, deviceName }),
  setFtmsConnection: (ftmsConnection) => set({ ftmsConnection }),
  setSpeed: (speedKph) => set((state) => ({ speedKph, maxSpeed: Math.max(state.maxSpeed, speedKph) })),
  start: () =>
    set({
      isPaused: false,
      startedDate: todayString(),
      startedAt: nowTimeString(),
      seconds: 0,
      speedKph: get().isConnected ? get().speedKph : 0,
      maxSpeed: 0,
      km: 0,
      kcal: 0,
      steps: 0,
    }),
  tick: () =>
    set((state) => {
      if (state.isPaused) return state;
      const simulatedSpeed = state.isConnected ? state.speedKph : Math.min(5 + Math.sin((state.seconds + 1) / 25) * 2, 12);
      const km = state.km + simulatedSpeed / 3600;
      return {
        seconds: state.seconds + 1,
        speedKph: simulatedSpeed,
        maxSpeed: Math.max(state.maxSpeed, simulatedSpeed),
        km,
        steps: state.steps + Math.round(simulatedSpeed * 1.4),
        kcal: km * 65,
      };
    }),
  pause: () => set((state) => ({ isPaused: !state.isPaused })),
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
    if (workout.seconds <= 0) return null;
    await addWorkout(workout);
    return workout;
  },
}));
