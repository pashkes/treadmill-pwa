import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from './app-db';
import { useWorkoutsByDateDesc } from './workout-live-queries';
import { makeWorkout } from '../test/workout-fixtures';

describe('workout live queries', () => {
  beforeEach(async () => {
    await db.workouts.clear();
    vi.restoreAllMocks();
  });

  it('limits the history query in Dexie instead of loading every workout', async () => {
    const limitCalls: number[] = [];
    const orderByOriginal = db.workouts.orderBy.bind(db.workouts);
    const orderBy = vi.spyOn(db.workouts, 'orderBy');

    orderBy.mockImplementation((index) => {
      const collection = orderByOriginal(index);
      const limitOriginal = collection.limit.bind(collection);
      const limit = vi.spyOn(collection, 'limit');

      limit.mockImplementation((count) => {
        limitCalls.push(count);
        return limitOriginal(count);
      });

      return collection;
    });

    await db.workouts.bulkPut(createWorkoutHistory(12));

    const { result } = renderHook(() => useWorkoutsByDateDesc(10));

    await waitFor(() => expect(result.current).toHaveLength(10));
    expect(limitCalls).toContain(10);
  });
});

function createWorkoutHistory(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const day = index + 1;
    const date = `2026-06-${String(day).padStart(2, '0')}`;
    const time = `08:${String(day).padStart(2, '0')}`;

    return makeWorkout({
      id: day,
      clientId: `11111111-1111-4111-8111-${String(day).padStart(12, '0')}`,
      date,
      time,
      createdAt: `${date}T${time}:00.000Z`,
      updatedAt: `${date}T${time}:00.000Z`,
    });
  });
}
