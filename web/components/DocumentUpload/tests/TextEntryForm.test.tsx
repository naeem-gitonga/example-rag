import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextEntryForm } from '../TextEntryForm';

// Mock the hooks module
jest.mock('../hooks/useTextEntry', () => ({
  useTextEntry: jest.fn(),
}));

import { useTextEntry } from '../hooks/useTextEntry';
const mockUseTextEntry = useTextEntry as jest.MockedFunction<typeof useTextEntry>;

jest.mock('../DocumentUpload.module.scss', () => ({
  textEntryForm: 'textEntryForm',
  formGroup: 'formGroup',
  label: 'label',
  dateInput: 'dateInput',
  moodSelector: 'moodSelector',
  moodChip: 'moodChip',
  selected: 'selected',
  textArea: 'textArea',
  formActions: 'formActions',
  primaryButton: 'primaryButton',
  statusMessage: 'statusMessage',
  uploading: 'uploading',
  success: 'success',
  error: 'error',
}));

describe('TextEntryForm', () => {
  const defaultMockReturn = {
    entryText: '',
    setEntryText: jest.fn(),
    entryDate: '2024-01-15',
    setEntryDate: jest.fn(),
    selectedMoods: [] as string[],
    toggleMood: jest.fn(),
    submitStatus: null,
    submit: jest.fn(),
    canSubmit: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTextEntry.mockReturnValue(defaultMockReturn);
  });

  it('should render date input', () => {
    render(<TextEntryForm />);

    expect(screen.getByText('Entry Date')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
  });

  it('should render mood selector', () => {
    render(<TextEntryForm />);

    expect(screen.getByText('Moods')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'happy' })).toBeInTheDocument();
  });

  it('should render text area', () => {
    render(<TextEntryForm />);

    expect(screen.getByText('Entry Text')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write your journal entry here...')).toBeInTheDocument();
  });

  it('should render Save Entry button', () => {
    render(<TextEntryForm />);

    expect(screen.getByRole('button', { name: 'Save Entry' })).toBeInTheDocument();
  });

  it('should disable Save Entry button when canSubmit is false', () => {
    render(<TextEntryForm />);

    expect(screen.getByRole('button', { name: 'Save Entry' })).toBeDisabled();
  });

  it('should enable Save Entry button when canSubmit is true', () => {
    mockUseTextEntry.mockReturnValue({
      ...defaultMockReturn,
      canSubmit: true,
    });

    render(<TextEntryForm />);

    expect(screen.getByRole('button', { name: 'Save Entry' })).not.toBeDisabled();
  });

  it('should call setEntryText when textarea changes', () => {
    const setEntryText = jest.fn();
    mockUseTextEntry.mockReturnValue({
      ...defaultMockReturn,
      setEntryText,
    });

    render(<TextEntryForm />);

    const textarea = screen.getByPlaceholderText('Write your journal entry here...');
    fireEvent.change(textarea, { target: { value: 'New entry' } });

    expect(setEntryText).toHaveBeenCalledWith('New entry');
  });

  it('should call setEntryDate when date changes', () => {
    const setEntryDate = jest.fn();
    mockUseTextEntry.mockReturnValue({
      ...defaultMockReturn,
      setEntryDate,
    });

    render(<TextEntryForm />);

    const dateInput = screen.getByDisplayValue('2024-01-15');
    fireEvent.change(dateInput, { target: { value: '2024-02-20' } });

    expect(setEntryDate).toHaveBeenCalledWith('2024-02-20');
  });

  it('should call toggleMood when mood is clicked', () => {
    const toggleMood = jest.fn();
    mockUseTextEntry.mockReturnValue({
      ...defaultMockReturn,
      toggleMood,
    });

    render(<TextEntryForm />);

    fireEvent.click(screen.getByRole('button', { name: 'happy' }));

    expect(toggleMood).toHaveBeenCalledWith('happy');
  });

  it('should call submit when Save Entry is clicked', () => {
    const submit = jest.fn();
    mockUseTextEntry.mockReturnValue({
      ...defaultMockReturn,
      canSubmit: true,
      submit,
    });

    render(<TextEntryForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Entry' }));

    expect(submit).toHaveBeenCalled();
  });

  it('should not render status message when submitStatus is null', () => {
    render(<TextEntryForm />);

    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
  });

  it('should render uploading status', () => {
    mockUseTextEntry.mockReturnValue({
      ...defaultMockReturn,
      submitStatus: { name: 'Test', status: 'uploading' },
    });

    render(<TextEntryForm />);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('should render success status', () => {
    mockUseTextEntry.mockReturnValue({
      ...defaultMockReturn,
      submitStatus: { name: 'Test', status: 'success', message: 'Entry saved successfully' },
    });

    render(<TextEntryForm />);

    expect(screen.getByText('Entry saved successfully')).toBeInTheDocument();
  });

  it('should render error status', () => {
    mockUseTextEntry.mockReturnValue({
      ...defaultMockReturn,
      submitStatus: { name: 'Test', status: 'error', message: 'Network error' },
    });

    render(<TextEntryForm />);

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('should highlight selected moods', () => {
    mockUseTextEntry.mockReturnValue({
      ...defaultMockReturn,
      selectedMoods: ['happy', 'calm'],
    });

    render(<TextEntryForm />);

    expect(screen.getByRole('button', { name: 'happy' })).toHaveClass('selected');
    expect(screen.getByRole('button', { name: 'calm' })).toHaveClass('selected');
    expect(screen.getByRole('button', { name: 'sad' })).not.toHaveClass('selected');
  });
});
