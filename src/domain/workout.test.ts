import { describe, expect, it } from 'vitest';
import { formatCadence, formatDuration, formatFastestPace, formatPace, formatSpeed, formatTopSpeed, workoutSeconds } from './workout';

describe('workout calculations', () => {
  it('formats duration as hh:mm:ss', () => {
    expect(formatDuration(3723)).toBe('01:02:03');
  });

  it('uses seconds before legacy minute fallback', () => {
    expect(workoutSeconds({ seconds: 125, min: 99 })).toBe(125);
    expect(workoutSeconds({ min: 3 })).toBe(180);
  });

  it('calculates pace, speed, and cadence', () => {
    const workout = { seconds: 1800, min: 30, km: 3, steps: 3600 };
    expect(formatPace(workout)).toBe('10\'00"');
    expect(formatSpeed(workout)).toBe('6.0');
    expect(formatCadence(workout)).toBe('120');
  });

  it('formats average pace from elapsed time and distance', () => {
    expect(formatPace({ seconds: 13 * 60 + 48, km: 1.3 })).toBe('10\'37"');
  });

  it('does not format top speed lower than average speed for rounded short workouts', () => {
    const workout = { seconds: 31, km: 0.01, maxSpeed: 1 };

    expect(formatSpeed(workout)).toBe('1.2');
    expect(formatTopSpeed(workout)).toBe('1.2');
    expect(formatFastestPace(workout)).toBe('51\'40"');
  });
});
