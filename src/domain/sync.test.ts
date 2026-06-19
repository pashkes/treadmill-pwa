import { describe, expect, it } from 'vitest';
import type { Workout } from './workout';
import { chooseNewestWorkout, syncStatusFromCounts } from './sync';

const baseWorkout: Workout = {
  id: 1,
  clientId: '11111111-1111-4111-8111-111111111111',
  ownerUserId: 'user-a',
  date: '2026-06-19',
  time: '08:30',
  seconds: 600,
  km: 1,
  kcal: 60,
  min: 10,
  steps: 1200,
  maxSpeed: 6,
  createdAt: '2026-06-19T08:30:00.000Z',
  updatedAt: '2026-06-19T08:30:00.000Z',
  deletedAt: null,
  syncStatus: 'synced',
};

describe('sync domain helpers', () => {
  it('keeps the newer workout by updatedAt', () => {
    const local = { ...baseWorkout, kcal: 60, updatedAt: '2026-06-19T08:30:00.000Z' };
    const remote = { ...baseWorkout, kcal: 70, updatedAt: '2026-06-19T08:31:00.000Z' };

    expect(chooseNewestWorkout(local, remote)).toEqual(remote);
  });

  it('keeps local workout when timestamps match', () => {
    const local = { ...baseWorkout, kcal: 60 };
    const remote = { ...baseWorkout, kcal: 70 };

    expect(chooseNewestWorkout(local, remote)).toEqual(local);
  });

  it('reports simple aggregate sync status', () => {
    expect(syncStatusFromCounts({ isOnline: false, isSyncing: false, pending: 0, errors: 0 })).toBe('offline');
    expect(syncStatusFromCounts({ isOnline: true, isSyncing: true, pending: 2, errors: 0 })).toBe('syncing');
    expect(syncStatusFromCounts({ isOnline: true, isSyncing: false, pending: 0, errors: 1 })).toBe('error');
    expect(syncStatusFromCounts({ isOnline: true, isSyncing: false, pending: 3, errors: 0 })).toBe('pending');
    expect(syncStatusFromCounts({ isOnline: true, isSyncing: false, pending: 0, errors: 0 })).toBe('synced');
  });
});
