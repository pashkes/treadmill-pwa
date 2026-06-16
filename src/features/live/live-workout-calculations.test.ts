import { describe, expect, it } from 'vitest';
import { applyTreadmillData, createWorkoutFromLiveState, tickLiveWorkout } from './live-workout-calculations';

const baseState = {
  deviceName: 'Blue treadmill',
  startedDate: '2026-06-15',
  startedAt: '12:00',
  isPaused: false,
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

describe('live workout calculations', () => {
  it('keeps the last positive calories when a stopped treadmill reset packet reports zero', () => {
    const stopped = applyTreadmillData(
      {
        ...baseState,
        seconds: 3615,
        speedKph: 6,
        maxSpeed: 6,
        km: 5.9,
        kcal: 320,
        steps: 7546,
        hasStartedMoving: true,
      },
      { speedKph: 0, distanceKm: 5.9, kcal: 0, elapsedSeconds: 3615, inclinePercent: 0 },
    );

    expect(stopped.kcal).toBe(320);
    expect(stopped.isPaused).toBe(true);
    expect(createWorkoutFromLiveState(stopped).kcal).toBe(320);
  });

  it('applies treadmill data without moving elapsed time backwards', () => {
    const running = applyTreadmillData({ ...baseState, seconds: 65, km: 0.1, hasStartedMoving: true }, { speedKph: 6, elapsedSeconds: 64 });

    expect(running.seconds).toBe(65);
    expect(running.speedKph).toBe(6);
  });

  it('preserves restored metrics from stopped reset packets', () => {
    const next = applyTreadmillData(
      {
        ...baseState,
        seconds: 1398,
        speedKph: 6,
        maxSpeed: 6,
        km: 2.3,
        kcal: 114,
        steps: 2947,
        inclinePercent: 2,
        hasStartedMoving: true,
        restoredFromStorage: true,
      },
      { speedKph: 0, distanceKm: 0, kcal: 0, elapsedSeconds: 0, inclinePercent: 0 },
    );

    expect(next.seconds).toBe(1398);
    expect(next.km).toBe(2.3);
    expect(next.kcal).toBe(114);
    expect(next.steps).toBe(2947);
    expect(next.inclinePercent).toBe(2);
    expect(next.isPaused).toBe(true);
  });

  it('ticks only active moving workouts', () => {
    const next = tickLiveWorkout({ ...baseState, hasStartedMoving: true, speedKph: 6 });

    expect(next.seconds).toBe(1);
    expect(next.km).toBeCloseTo(6 / 3600, 4);
    expect(next.steps).toBeGreaterThan(0);
  });

  it('creates a completed workout snapshot from live state', () => {
    const workout = createWorkoutFromLiveState({
      ...baseState,
      seconds: 0,
      km: 0.4,
      kcal: 38,
      steps: 512,
      maxSpeed: 6,
      hasStartedMoving: true,
    });

    expect(workout).toMatchObject({
      date: '2026-06-15',
      time: '12:00',
      seconds: 240,
      min: 4,
      km: 0.4,
      kcal: 38,
      steps: 512,
      maxSpeed: 6,
    });
  });
});
