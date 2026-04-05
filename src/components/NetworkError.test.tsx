import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NetworkError } from './NetworkError';

describe('NetworkError', () => {
  it('renders default message when online', () => {
    const onRetry = vi.fn();
    render(<NetworkError onRetry={onRetry} />);
    expect(screen.getByText('Network error occurred')).toBeDefined();
    expect(screen.getByText('Press Enter to retry')).toBeDefined();
  });

  it('renders custom message', () => {
    const onRetry = vi.fn();
    render(<NetworkError message="Server unavailable" onRetry={onRetry} />);
    expect(screen.getByText('Server unavailable')).toBeDefined();
  });

  it('calls onRetry on Enter key press', () => {
    const onRetry = vi.fn();
    render(<NetworkError onRetry={onRetry} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not call onRetry on other keys', () => {
    const onRetry = vi.fn();
    render(<NetworkError onRetry={onRetry} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('shows offline message when navigator.onLine is false', () => {
    const originalOnLine = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(Navigator.prototype, 'onLine', {
      value: false,
      configurable: true,
    });

    try {
      const onRetry = vi.fn();
      render(<NetworkError onRetry={onRetry} />);
      expect(screen.getByText('No internet connection')).toBeDefined();
    } finally {
      if (originalOnLine) {
        Object.defineProperty(Navigator.prototype, 'onLine', originalOnLine);
      }
    }
  });
});
