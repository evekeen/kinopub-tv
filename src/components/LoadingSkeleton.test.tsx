import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PosterSkeleton, Spinner } from './LoadingSkeleton';

describe('PosterSkeleton', () => {
  it('renders 5 skeleton cards', () => {
    const { container } = render(<PosterSkeleton count={5} />);
    const cards = container.querySelectorAll('[class*="posterCard"]');
    expect(cards.length).toBe(5);
  });

  it('renders specified number of skeleton cards', () => {
    const { container } = render(<PosterSkeleton count={3} />);
    const cards = container.querySelectorAll('[class*="posterCard"]');
    expect(cards.length).toBe(3);
  });

  it('each card has image and title placeholders', () => {
    const { container } = render(<PosterSkeleton count={1} />);
    const images = container.querySelectorAll('[class*="posterImage"]');
    const titles = container.querySelectorAll('[class*="posterTitle"]');
    expect(images.length).toBe(1);
    expect(titles.length).toBe(1);
  });
});

describe('Spinner', () => {
  it('renders spinner element', () => {
    const { container } = render(<Spinner />);
    const spinner = container.querySelector('[class*="spinner"]');
    expect(spinner).toBeDefined();
    expect(spinner).not.toBeNull();
  });
});
