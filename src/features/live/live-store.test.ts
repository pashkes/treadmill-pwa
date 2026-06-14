import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/app-db';
import { useLiveStore } from './live-store';

describe('live-store', () => {
  beforeEach(async () => {
    await db.workouts.clear();
    useLiveStore.setState({
      isConnected: false,
      deviceName: null,
      isPaused: false,
      startedAt: null,
      seconds: 0,
      speedKph: 0,
      maxSpeed: 0,
      km: 0,
      kcal: 0,
      steps: 0,
    });
  });

  it('saves workouts shorter than thirty seconds when they have elapsed time', async () => {
    useLiveStore.getState().start();
    useLiveStore.getState().tick();

    const saved = await useLiveStore.getState().stopAndSave();

    expect(saved?.seconds).toBe(1);
    expect(await db.workouts.count()).toBe(1);
  });
});
