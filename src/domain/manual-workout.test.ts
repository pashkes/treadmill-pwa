import { describe, expect, it } from 'vitest';
import { createManualWorkout, estimateSteps } from './manual-workout';

describe('manual workout', () => {
  it('creates a persisted workout shape from manual input', () => {
    const workout = createManualWorkout(
      {
        date: '2026-06-13',
        time: '08:30',
        km: 1.234,
        minutes: 28,
        kcal: 187.6,
      },
      123,
      '2026-06-13T08:30:00.000Z',
    );

    expect(workout).toMatchObject({
      id: 123,
      ownerUserId: null,
      date: '2026-06-13',
      time: '08:30',
      seconds: 1680,
      min: 28,
      km: 1.23,
      kcal: 188,
      steps: 1371,
      maxSpeed: 0,
      createdAt: '2026-06-13T08:30:00.000Z',
      updatedAt: '2026-06-13T08:30:00.000Z',
      deletedAt: null,
      syncStatus: 'local',
    });
    expect(workout.clientId).toMatch(/[0-9a-f-]{36}/);
  });

  it('estimates steps using the shared walking stride length', () => {
    expect(estimateSteps(1)).toBe(1111);
  });
});
