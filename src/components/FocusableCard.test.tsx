import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableCard } from './FocusableCard';

describe('FocusableCard', () => {
  beforeEach(() => {
    init({ debug: false, visualDebug: false });
  });

  it('renders children with focused state', () => {
    const renderChild = vi.fn((focused: boolean) => (
      <span>{focused ? 'focused' : 'unfocused'}</span>
    ));

    render(
      <FocusableCard onEnterPress={vi.fn()}>
        {renderChild}
      </FocusableCard>,
    );

    expect(renderChild).toHaveBeenCalled();
  });

  it('renders wrapper div', () => {
    const { container } = render(
      <FocusableCard onEnterPress={vi.fn()}>
        {() => <span>content</span>}
      </FocusableCard>,
    );

    const wrapper = container.querySelector('[class*="wrapper"]');
    expect(wrapper).not.toBeNull();
  });
});
