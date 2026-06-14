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
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().start();
    useLiveStore.getState().setTreadmillData({ elapsedSeconds: 1 });

    const saved = await useLiveStore.getState().stopAndSave();

    expect(saved?.seconds).toBe(1);
    expect(await db.workouts.count()).toBe(1);
  });

  it('does not start a workout before the treadmill is connected', () => {
    const started = useLiveStore.getState().start();

    expect(started).toBe(false);
    expect(useLiveStore.getState().startedAt).toBeNull();
    expect(useLiveStore.getState().seconds).toBe(0);
  });

  it('starts a workout when the treadmill is connected', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');

    const started = useLiveStore.getState().start();

    expect(started).toBe(true);
    expect(useLiveStore.getState().startedAt).not.toBeNull();
  });

  it('does not simulate live metrics on timer ticks', () => {
    useLiveStore.getState().setConnection(true, 'Blue treadmill');
    useLiveStore.getState().setTreadmillData({ speedKph: 6 });
    useLiveStore.getState().start();

    useLiveStore.getState().tick();

    expect(useLiveStore.getState().seconds).toBe(0);
    expect(useLiveStore.getState().km).toBe(0);
    expect(useLiveStore.getState().kcal).toBe(0);
    expect(useLiveStore.getState().steps).toBe(0);
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

  it('uses treadmill-reported metrics when available', () => {
    useLiveStore.getState().setTreadmillData({ speedKph: 6, distanceKm: 1.25, kcal: 80, elapsedSeconds: 120 });

    expect(useLiveStore.getState().speedKph).toBe(6);
    expect(useLiveStore.getState().km).toBe(1.25);
    expect(useLiveStore.getState().kcal).toBe(80);
    expect(useLiveStore.getState().seconds).toBe(120);
  });

  it('keeps previous values when a treadmill packet omits fields', () => {
    useLiveStore.getState().setTreadmillData({ speedKph: 6, distanceKm: 1.25, kcal: 80, elapsedSeconds: 120 });

    useLiveStore.getState().setTreadmillData({});

    expect(useLiveStore.getState().speedKph).toBe(6);
    expect(useLiveStore.getState().km).toBe(1.25);
    expect(useLiveStore.getState().kcal).toBe(80);
    expect(useLiveStore.getState().seconds).toBe(120);
  });
});
