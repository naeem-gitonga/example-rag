import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

import { useTheme } from '@/contexts/ThemeContext';
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

jest.mock('../ThemeToggle.module.scss', () => ({
  toggle: 'toggle',
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render moon icon when theme is light', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: jest.fn(),
    });

    render(<ThemeToggle />);

    expect(screen.getByRole('button')).toHaveTextContent('🌙');
  });

  it('should render sun icon when theme is dark', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: jest.fn(),
    });

    render(<ThemeToggle />);

    expect(screen.getByRole('button')).toHaveTextContent('☀️');
  });

  it('should have correct aria-label for light theme', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: jest.fn(),
    });

    render(<ThemeToggle />);

    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Switch to dark mode'
    );
  });

  it('should have correct aria-label for dark theme', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      toggleTheme: jest.fn(),
    });

    render(<ThemeToggle />);

    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Switch to light mode'
    );
  });

  it('should call toggleTheme when clicked', () => {
    const toggleTheme = jest.fn();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme,
    });

    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button'));

    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should have toggle class', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      toggleTheme: jest.fn(),
    });

    render(<ThemeToggle />);

    expect(screen.getByRole('button')).toHaveClass('toggle');
  });
});
