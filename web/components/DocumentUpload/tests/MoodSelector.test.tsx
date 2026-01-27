import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoodSelector } from '../MoodSelector';
import { AVAILABLE_MOODS } from '../types';

// Mock the styles
jest.mock('../DocumentUpload.module.scss', () => ({
  formGroup: 'formGroup',
  label: 'label',
  moodSelector: 'moodSelector',
  moodChip: 'moodChip',
  selected: 'selected',
}));

describe('MoodSelector', () => {
  const defaultProps = {
    selectedMoods: [] as string[],
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all available moods', () => {
    render(<MoodSelector {...defaultProps} />);

    AVAILABLE_MOODS.forEach((mood) => {
      expect(screen.getByRole('button', { name: mood })).toBeInTheDocument();
    });
  });

  it('should render with default label', () => {
    render(<MoodSelector {...defaultProps} />);

    expect(screen.getByText('Moods')).toBeInTheDocument();
  });

  it('should render with custom label', () => {
    render(<MoodSelector {...defaultProps} label="Custom Label" />);

    expect(screen.getByText('Custom Label')).toBeInTheDocument();
  });

  it('should call onToggle when mood is clicked', () => {
    const onToggle = jest.fn();
    render(<MoodSelector {...defaultProps} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: 'happy' }));

    expect(onToggle).toHaveBeenCalledWith('happy');
  });

  it('should apply selected class to selected moods', () => {
    render(<MoodSelector {...defaultProps} selectedMoods={['happy', 'calm']} />);

    const happyButton = screen.getByRole('button', { name: 'happy' });
    const calmButton = screen.getByRole('button', { name: 'calm' });
    const sadButton = screen.getByRole('button', { name: 'sad' });

    expect(happyButton).toHaveClass('selected');
    expect(calmButton).toHaveClass('selected');
    expect(sadButton).not.toHaveClass('selected');
  });

  it('should have type="button" to prevent form submission', () => {
    render(<MoodSelector {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });
});
