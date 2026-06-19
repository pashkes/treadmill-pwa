import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../app/app-store';
import { importWorkoutExportPayload } from '../../db/workout-repository';
import { ImportButton } from './ImportButton';

vi.mock('../../db/workout-repository', () => ({
  importWorkoutExportPayload: vi.fn(),
}));

describe('ImportButton', () => {
  beforeEach(() => {
    vi.mocked(importWorkoutExportPayload).mockReset();
    useAppStore.setState({
      screen: 'home',
      statsPeriod: 'week',
      toast: { message: '', visible: false },
      locale: 'en',
    });
  });

  it('imports a selected workout history file and shows success feedback', async () => {
    vi.mocked(importWorkoutExportPayload).mockResolvedValue(1);
    render(<ImportButton />);

    const content = '{"schemaVersion":1,"exportedAt":"2026-06-13T10:00:00.000Z","workouts":[]}';
    const file = new File([content], 'workouts.json', {
      type: 'application/json',
    });

    await userEvent.upload(screen.getByLabelText('Import workouts'), file);

    await waitFor(() => expect(importWorkoutExportPayload).toHaveBeenCalledWith(content));
    expect(useAppStore.getState().toast).toEqual({ message: 'Import ready', visible: true });
  });

  it('shows localized error feedback when import fails', async () => {
    vi.mocked(importWorkoutExportPayload).mockRejectedValue(new Error('Invalid JSON'));
    render(<ImportButton />);

    const file = new File(['broken'], 'workouts.json', { type: 'application/json' });

    await userEvent.upload(screen.getByLabelText('Import workouts'), file);

    await waitFor(() => expect(useAppStore.getState().toast).toEqual({ message: 'Failed to import workouts', visible: true }));
  });
});
