import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
import { makeWorkout } from '../../test/workout-fixtures';
import { HistoryScreen } from './HistoryScreen';

describe('HistoryScreen', () => {
  beforeEach(async () => {
    await db.workouts.clear();
    useAppStore.setState({ locale: 'ru' });
  });

  it('renders an empty state before workouts are stored', async () => {
    render(<HistoryScreen />);

    expect(await screen.findByText(/Тренировок пока нет/i)).toBeInTheDocument();
  });

  it('shows the latest ten workouts before loading more history', async () => {
    await db.workouts.bulkPut(createWorkoutHistory(12));

    render(<HistoryScreen />);

    expect(await screen.findByText(/06\/12 08:12/)).toBeInTheDocument();
    expect(screen.queryByText(/06\/02 08:02/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Свободная тренировка/ })).toHaveLength(10);
    expect(screen.getByRole('button', { name: 'Показать ещё' })).toBeInTheDocument();
  });

  it('loads ten more workouts when load more is clicked', async () => {
    await db.workouts.bulkPut(createWorkoutHistory(12));

    render(<HistoryScreen />);

    await userEvent.click(await screen.findByRole('button', { name: 'Показать ещё' }));

    expect(await screen.findByText(/06\/02 08:02/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Свободная тренировка/ })).toHaveLength(12);
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument();
  });

  it('does not show load more when ten or fewer workouts are stored', async () => {
    await db.workouts.bulkPut(createWorkoutHistory(10));

    render(<HistoryScreen />);

    expect(await screen.findByText(/06\/01 08:01/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Свободная тренировка/ })).toHaveLength(10);
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument();
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
      kcal: 100 + day,
      createdAt: `${date}T${time}:00.000Z`,
      updatedAt: `${date}T${time}:00.000Z`,
    });
  });
}
