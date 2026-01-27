import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusMessage } from '../StatusMessage';
import { UploadStatus } from '../types';

jest.mock('../DocumentUpload.module.scss', () => ({
  statusMessage: 'statusMessage',
  uploading: 'uploading',
  success: 'success',
  error: 'error',
}));

describe('StatusMessage', () => {
  it('should return null when status is null', () => {
    const { container } = render(<StatusMessage status={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display "Saving..." when status is uploading', () => {
    const status: UploadStatus = {
      name: 'Test',
      status: 'uploading',
    };

    render(<StatusMessage status={status} />);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('should display message when status is success', () => {
    const status: UploadStatus = {
      name: 'Test',
      status: 'success',
      message: 'Entry saved successfully',
    };

    render(<StatusMessage status={status} />);

    expect(screen.getByText('Entry saved successfully')).toBeInTheDocument();
  });

  it('should display message when status is error', () => {
    const status: UploadStatus = {
      name: 'Test',
      status: 'error',
      message: 'Network error occurred',
    };

    render(<StatusMessage status={status} />);

    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
  });

  it('should apply correct CSS class for uploading status', () => {
    const status: UploadStatus = {
      name: 'Test',
      status: 'uploading',
    };

    render(<StatusMessage status={status} />);

    const element = screen.getByText('Saving...');
    expect(element).toHaveClass('statusMessage');
    expect(element).toHaveClass('uploading');
  });

  it('should apply correct CSS class for success status', () => {
    const status: UploadStatus = {
      name: 'Test',
      status: 'success',
      message: 'Done',
    };

    render(<StatusMessage status={status} />);

    const element = screen.getByText('Done');
    expect(element).toHaveClass('success');
  });

  it('should apply correct CSS class for error status', () => {
    const status: UploadStatus = {
      name: 'Test',
      status: 'error',
      message: 'Failed',
    };

    render(<StatusMessage status={status} />);

    const element = screen.getByText('Failed');
    expect(element).toHaveClass('error');
  });
});
