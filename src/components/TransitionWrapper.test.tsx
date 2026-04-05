import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TransitionWrapper } from './TransitionWrapper';

describe('TransitionWrapper', () => {
  it('renders children', () => {
    render(
      <TransitionWrapper transitionKey="test">
        <div>Content</div>
      </TransitionWrapper>,
    );
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('starts hidden then becomes visible', async () => {
    vi.useFakeTimers();
    const { container } = render(
      <TransitionWrapper transitionKey="test">
        <div>Content</div>
      </TransitionWrapper>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('hidden');

    await act(async () => {
      vi.advanceTimersByTime(16);
    });

    expect(wrapper.className).toContain('visible');
    vi.useRealTimers();
  });

  it('resets transition on key change', async () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <TransitionWrapper transitionKey="page1">
        <div>Page 1</div>
      </TransitionWrapper>,
    );

    await act(async () => {
      vi.advanceTimersByTime(16);
    });

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('visible');

    rerender(
      <TransitionWrapper transitionKey="page2">
        <div>Page 2</div>
      </TransitionWrapper>,
    );

    expect(wrapper.className).toContain('hidden');
    vi.useRealTimers();
  });
});
