import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { Sidebar } from './Sidebar';
import { useUiStore } from '../store/ui';

vi.mock('../store/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/ui')>();
  return actual;
});

describe('Sidebar', () => {
  beforeEach(() => {
    init({ debug: false, visualDebug: false });
    useUiStore.setState({
      currentScreen: 'home',
      screenParams: {},
      navigationStack: [],
    });
  });

  it('renders all sidebar items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Home')).toBeDefined();
    expect(screen.getByText('Search')).toBeDefined();
    expect(screen.getByText('Bookmarks')).toBeDefined();
    expect(screen.getByText('History')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('renders sidebar icons', () => {
    render(<Sidebar />);
    expect(screen.getByText('⌂')).toBeDefined();
    expect(screen.getByText('⌕')).toBeDefined();
    expect(screen.getByText('★')).toBeDefined();
    expect(screen.getByText('⏱')).toBeDefined();
    expect(screen.getByText('⚙')).toBeDefined();
  });

  it('renders as nav element', () => {
    const { container } = render(<Sidebar />);
    const nav = container.querySelector('nav');
    expect(nav).not.toBeNull();
  });
});
