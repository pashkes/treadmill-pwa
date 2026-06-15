import { beforeEach, describe, expect, it } from 'vitest';
import { clearActiveWorkout, readActiveWorkout, persistActiveWorkout } from './active-workout-storage';

describe('active workout storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores only reload recovery fields', () => {
    persistActiveWorkout({
      deviceName: 'Blue treadmill',
      startedDate: '2026-06-15',
      startedAt: '12:00',
      seconds: 278,
      speedKph: 6,
      maxSpeed: 6,
      km: 0.4,
      kcal: 38,
      steps: 512,
      inclinePercent: 2,
      hasStartedMoving: true,
    });

    expect(readActiveWorkout()).toEqual({
      deviceName: 'Blue treadmill',
      startedDate: '2026-06-15',
      startedAt: '12:00',
      seconds: 278,
      speedKph: 6,
      maxSpeed: 6,
      km: 0.4,
      kcal: 38,
      steps: 512,
      inclinePercent: 2,
      hasStartedMoving: true,
    });
  });

  it('clears invalid stored JSON', () => {
    window.localStorage.setItem('walking-app-active-workout', '{broken');

    expect(readActiveWorkout()).toBeNull();
    expect(window.localStorage.getItem('walking-app-active-workout')).toBeNull();
  });

  it('removes recovery storage', () => {
    window.localStorage.setItem('walking-app-active-workout', '{}');

    clearActiveWorkout();

    expect(window.localStorage.getItem('walking-app-active-workout')).toBeNull();
  });
});
