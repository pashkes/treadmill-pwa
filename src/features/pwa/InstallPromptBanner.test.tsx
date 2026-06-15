import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../app/app-store';
import { InstallPromptBanner } from './InstallPromptBanner';

function createBeforeInstallPromptEvent(prompt = vi.fn().mockResolvedValue(undefined)) {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
  Object.assign(event, {
    platforms: ['web'],
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
  });
  return { event, prompt };
}

describe('InstallPromptBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      screen: 'home',
      statsPeriod: 'week',
      toast: { message: '', visible: false },
      locale: 'en',
    });
  });

  it('appears when the browser reports the PWA can be installed', () => {
    render(<InstallPromptBanner />);

    const { event } = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByText('Install Workout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
  });

  it('opens the native install prompt from a user action and then hides', async () => {
    const user = userEvent.setup();
    render(<InstallPromptBanner />);

    const { event, prompt } = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });

    await user.click(screen.getByRole('button', { name: 'Install' }));

    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText('Install Workout')).not.toBeInTheDocument();
    });
  });

  it('does not appear again after the user dismisses it manually', async () => {
    const user = userEvent.setup();
    render(<InstallPromptBanner />);

    const { event } = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });

    await user.click(screen.getByRole('button', { name: 'Dismiss install prompt' }));

    expect(screen.queryByText('Install Workout')).not.toBeInTheDocument();

    const { event: nextEvent } = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(nextEvent);
    });

    expect(screen.queryByText('Install Workout')).not.toBeInTheDocument();
  });
});
