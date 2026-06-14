import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { addWorkout, getWorkout } from '../../db/workout-repository';
import type { Workout } from '../../domain/workout';
import { WorkoutDetailScreen } from './WorkoutDetailScreen';

const workout: Workout = {
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

describe('WorkoutDetailScreen', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();
    await db.workouts.clear();
    await addWorkout(workout);
    useAppStore.setState({
      screen: 'detail',
      selectedWorkoutId: workout.id,
      statsPeriod: 'week',
      toast: { message: '', visible: false },
    });
  });

  it('deletes the saved workout after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<WorkoutDetailScreen />);

    await screen.findByText('Свободная тренировка');
    await userEvent.click(screen.getByRole('button', { name: 'Удалить тренировку' }));

    await waitFor(async () => {
      expect(await getWorkout(workout.id)).toBeUndefined();
    });
    expect(useAppStore.getState().screen).toBe('history');
    expect(useAppStore.getState().toast.message).toBe('Тренировка удалена');
  });

  it('keeps the saved workout when deletion is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<WorkoutDetailScreen />);

    await screen.findByText('Свободная тренировка');
    await userEvent.click(screen.getByRole('button', { name: 'Удалить тренировку' }));

    expect(await getWorkout(workout.id)).toEqual(workout);
    expect(useAppStore.getState().screen).toBe('detail');
  });
});
