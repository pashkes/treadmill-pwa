import { describe, expect, it } from 'vitest';
import { createExportPayload, parseWorkoutExportPayload } from './export';

const workout = {
  id: 100,
  date: '2026-06-13',
  time: '08:30',
  seconds: 600,
  min: 10,
  km: 1,
  kcal: 65,
  steps: 1200,
  maxSpeed: 6,
};

describe('createExportPayload', () => {
  it('creates versioned export data', () => {
    const payload = createExportPayload([], '2026-06-13T10:00:00.000Z');
    expect(payload).toEqual({
      schemaVersion: 1,
      exportedAt: '2026-06-13T10:00:00.000Z',
      workouts: [],
    });
  });

  it('parses exported workout history', () => {
    const payload = {
      schemaVersion: 1,
      exportedAt: '2026-06-13T10:00:00.000Z',
      workouts: [workout],
    };

    expect(parseWorkoutExportPayload(JSON.stringify(payload))).toEqual(payload);
  });

  it('rejects invalid exported workout history', () => {
    expect(() =>
      parseWorkoutExportPayload(
        JSON.stringify({
          schemaVersion: 1,
          exportedAt: '2026-06-13T10:00:00.000Z',
          workouts: [{ ...workout, date: '06/13/2026' }],
        }),
      ),
    ).toThrow('Invalid workout export payload');
  });
});
