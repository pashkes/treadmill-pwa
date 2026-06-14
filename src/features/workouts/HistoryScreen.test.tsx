import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../app/app-store';
import { db } from '../../db/app-db';
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
});
