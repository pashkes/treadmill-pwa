import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../app/app-store';
import { Toast } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAppStore.setState({
      toast: { message: '', visible: false },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restarts the hide timer when the toast message changes', () => {
    render(<Toast />);

    act(() => {
      useAppStore.getState().showToast('First message');
    });
    expect(screen.getByRole('status')).toHaveTextContent('First message');

    act(() => {
      vi.advanceTimersByTime(2_000);
      useAppStore.getState().showToast('Second message');
    });

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Second message');
    expect(useAppStore.getState().toast.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1_900);
    });
    expect(useAppStore.getState().toast.visible).toBe(false);
  });
});
