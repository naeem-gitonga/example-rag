import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateInput } from '../DateInput';

jest.mock('../DocumentUpload.module.scss', () => ({
  formGroup: 'formGroup',
  label: 'label',
  dateInput: 'dateInput',
}));

describe('DateInput', () => {
  const defaultProps = {
    value: '2024-01-15',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default label', () => {
    render(<DateInput {...defaultProps} />);

    expect(screen.getByText('Entry Date')).toBeInTheDocument();
  });

  it('should render with custom label', () => {
    render(<DateInput {...defaultProps} label="Custom Date Label" />);

    expect(screen.getByText('Custom Date Label')).toBeInTheDocument();
  });

  it('should display the provided value', () => {
    render(<DateInput {...defaultProps} value="2024-06-20" />);

    const input = screen.getByDisplayValue('2024-06-20');
    expect(input).toBeInTheDocument();
  });

  it('should call onChange when date is changed', () => {
    const onChange = jest.fn();
    render(<DateInput {...defaultProps} onChange={onChange} />);

    const input = screen.getByDisplayValue('2024-01-15');
    fireEvent.change(input, { target: { value: '2024-02-20' } });

    expect(onChange).toHaveBeenCalledWith('2024-02-20');
  });

  it('should have type="date"', () => {
    render(<DateInput {...defaultProps} />);

    const input = screen.getByDisplayValue('2024-01-15');
    expect(input).toHaveAttribute('type', 'date');
  });

  it('should have correct CSS class', () => {
    render(<DateInput {...defaultProps} />);

    const input = screen.getByDisplayValue('2024-01-15');
    expect(input).toHaveClass('dateInput');
  });
});
