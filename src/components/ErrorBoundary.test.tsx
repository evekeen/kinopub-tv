import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }): null {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return null;
}

function GoodChild(): JSX.Element {
  return <div>Working content</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Working content')).toBeDefined();
  });

  it('renders error fallback when child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('Press Enter to retry')).toBeDefined();
    vi.restoreAllMocks();
  });

  it('calls onReset and recovers on Enter key press', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReset = vi.fn();

    const { rerender } = render(
      <ErrorBoundary onReset={onReset}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeDefined();

    rerender(
      <ErrorBoundary onReset={onReset}>
        <ThrowingChild shouldThrow={false} />
        <GoodChild />
      </ErrorBoundary>,
    );

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.queryByText('Something went wrong')).toBeNull();
    vi.restoreAllMocks();
  });

  it('does not register keydown listener when not in error state', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );
    const keydownCalls = addSpy.mock.calls.filter(
      ([event]) => event === 'keydown',
    );
    expect(keydownCalls.length).toBe(0);
    addSpy.mockRestore();
  });
});
