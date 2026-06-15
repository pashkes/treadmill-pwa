import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../app/app-store';
import { exportWorkouts } from '../../db/workout-repository';
import { downloadJsonFile } from './export-download';
import { ExportButton } from './ExportButton';
import type * as ExportDownload from './export-download';

vi.mock('../../db/workout-repository', () => ({
  exportWorkouts: vi.fn(),
}));

vi.mock('./export-download', async (importOriginal) => {
  const actual = await importOriginal<typeof ExportDownload>();
  return {
    ...actual,
    downloadJsonFile: vi.fn(),
  };
});

describe('ExportButton', () => {
  beforeEach(() => {
    vi.mocked(exportWorkouts).mockReset();
    vi.mocked(downloadJsonFile).mockReset();
    useAppStore.setState({
      screen: 'home',
      statsPeriod: 'week',
      toast: { message: '', visible: false },
      locale: 'en',
    });
  });

  it('uses localized accessible label and success toast', async () => {
    vi.mocked(exportWorkouts).mockResolvedValue([]);
    render(<ExportButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Export workouts' }));

    expect(useAppStore.getState().toast).toEqual({ message: 'Export ready', visible: true });
  });

  it('uses localized error toast when export fails', async () => {
    vi.mocked(exportWorkouts).mockRejectedValue(new Error('IndexedDB unavailable'));
    render(<ExportButton />);

    await userEvent.click(screen.getByRole('button', { name: 'Export workouts' }));

    expect(useAppStore.getState().toast).toEqual({ message: 'Failed to export workouts', visible: true });
  });
});
