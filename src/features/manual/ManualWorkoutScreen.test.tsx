import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from '@tanstack/react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { router } from '../../app/router';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { useWorkoutSyncStore } from '../sync/sync-store';

describe('ManualWorkoutScreen', () => {
  beforeEach(async () => {
    await router.navigate({ to: '/manual-workout' });
    await db.workouts.clear();
    window.localStorage.clear();
    useAppStore.setState({
      screen: 'home',
      statsPeriod: 'week',
      toast: { message: '', visible: false },
      locale: 'ru',
    });
    useWorkoutSyncStore.setState({ status: 'synced', pendingCount: 0, error: null, localChangeVersion: 0 });
  });

  it('requires positive workout values before saving', async () => {
    render(<RouterProvider router={router} />);

    await userEvent.clear(await screen.findByLabelText('Дистанция'));
    await userEvent.type(screen.getByLabelText('Дистанция'), '0');
    await userEvent.clear(screen.getByLabelText('Длительность'));
    await userEvent.type(screen.getByLabelText('Длительность'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Введите дистанцию больше 0 км')).toBeVisible();
    expect(screen.getByText('Введите длительность минимум 1 минуту')).toBeVisible();
    expect(await db.workouts.count()).toBe(0);
  });

  it('saves a manual workout and opens its detail screen', async () => {
    render(<RouterProvider router={router} />);

    await userEvent.clear(await screen.findByLabelText('Дата'));
    await userEvent.type(screen.getByLabelText('Дата'), '2026-06-13');
    await userEvent.clear(screen.getByLabelText('Время'));
    await userEvent.type(screen.getByLabelText('Время'), '08:30');
    await userEvent.clear(screen.getByLabelText('Дистанция'));
    await userEvent.type(screen.getByLabelText('Дистанция'), '1.25');
    await userEvent.clear(screen.getByLabelText('Длительность'));
    await userEvent.type(screen.getByLabelText('Длительность'), '20');
    await userEvent.clear(screen.getByLabelText('Калории'));
    await userEvent.type(screen.getByLabelText('Калории'), '140');
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/workouts\/\d+$/));
    const saved = await db.workouts.toArray();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      date: '2026-06-13',
      time: '08:30',
      km: 1.25,
      min: 20,
      seconds: 1200,
      kcal: 140,
      steps: 1389,
      syncStatus: 'local',
    });
    expect(useWorkoutSyncStore.getState().localChangeVersion).toBe(1);
    expect(useAppStore.getState().toast).toEqual({ message: 'Тренировка сохранена', visible: true });
  });
});
