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
  setTreadmillData: (speedKph?: number, distanceKm?: number) => void;
  start: () => boolean;
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
  setTreadmillData: (speedKph, distanceKm) =>
    set((state) => {
      const nextSpeedKph = speedKph ?? state.speedKph;
      const nextKm = distanceKm ?? state.km;

      return {
        speedKph: nextSpeedKph,
        maxSpeed: speedKph === undefined ? state.maxSpeed : Math.max(state.maxSpeed, speedKph),
        km: nextKm,
        kcal: nextKm * 65,
      };
    }),
  start: () => {
    if (!get().isConnected) return false;

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
    });
    return true;
  },
  tick: () =>
    set((state) => {
      if (state.isPaused || !state.isConnected) return state;
      const km = state.km + state.speedKph / 3600;
      return {
        seconds: state.seconds + 1,
        maxSpeed: Math.max(state.maxSpeed, state.speedKph),
        km,
        steps: state.steps + Math.round(state.speedKph * 1.4),
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
