import type { Workout } from '../domain/workout';

export function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 100,
    clientId: '11111111-1111-4111-8111-111111111111',
    ownerUserId: null,
    date: '2026-06-13',
    time: '08:30',
    seconds: 600,
    min: 10,
    km: 1,
    kcal: 65,
    steps: 1200,
    maxSpeed: 6,
    createdAt: '2026-06-13T08:30:00.000Z',
    updatedAt: '2026-06-13T08:30:00.000Z',
    deletedAt: null,
    syncStatus: 'local',
    ...overrides,
  };
}
