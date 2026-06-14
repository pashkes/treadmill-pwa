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
      startedDate: null,
      startedAt: null,
      ftmsConnection: null,
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

  it('saves workout date from start time instead of stop time', async () => {
    useLiveStore.setState({
      startedDate: '2026-06-13',
      startedAt: '23:59',
      seconds: 60,
      km: 0.1,
      kcal: 7,
      steps: 120,
      maxSpeed: 6,
    });

    const saved = await useLiveStore.getState().stopAndSave();

    expect(saved?.date).toBe('2026-06-13');
    expect(saved?.time).toBe('23:59');
  });

  it('uses treadmill-reported distance when available', () => {
    useLiveStore.getState().setTreadmillData(6, 1.25);

    expect(useLiveStore.getState().speedKph).toBe(6);
    expect(useLiveStore.getState().km).toBe(1.25);
    expect(useLiveStore.getState().kcal).toBe(81.25);
  });
});
