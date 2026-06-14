import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { useLiveStore } from './live-store';
import { LiveScreen } from './LiveScreen';

describe('LiveScreen', () => {
  beforeEach(async () => {
    await db.workouts.clear();
    window.localStorage.clear();
    useAppStore.setState({
      screen: 'live',
      selectedWorkoutId: null,
      statsPeriod: 'week',
      toast: { message: '', visible: false },
    });
    useLiveStore.setState({
      isConnected: true,
      deviceName: 'SW / T30EA-0227',
      isPaused: false,
      startedDate: '2026-06-14',
      startedAt: '12:00',
      ftmsConnection: null,
      seconds: 278,
      speedKph: 6,
      maxSpeed: 6,
      km: 0.4,
      kcal: 38,
      steps: 512,
      inclinePercent: 2.5,
      hasStartedMoving: true,
      autoStopRequested: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows pace from elapsed time and distance instead of current speed', () => {
    render(<LiveScreen />);

    expect(screen.getByText(`11'35"`)).toBeVisible();
    expect(screen.getByText('2.5')).toBeVisible();
  });

  it('removes broken speed controls and confirms manual finish', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<LiveScreen />);

    expect(screen.queryByRole('button', { name: 'Уменьшить скорость' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Увеличить скорость' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Завершить тренировку' }));

    expect(confirm).toHaveBeenCalledWith('Завершить и сохранить тренировку?');
    expect(await db.workouts.count()).toBe(0);
    expect(useAppStore.getState().screen).toBe('live');
  });

  it('saves automatically when the treadmill stop event is received', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    useLiveStore.setState({ autoStopRequested: true });

    render(<LiveScreen />);

    await waitFor(async () => {
      expect(await db.workouts.count()).toBe(1);
    });
    expect(confirm).not.toHaveBeenCalled();
    expect(useAppStore.getState().screen).toBe('home');
  });
});
