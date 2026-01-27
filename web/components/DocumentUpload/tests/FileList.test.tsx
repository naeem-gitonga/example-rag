import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileList } from '../FileList';
import { UploadStatus } from '../types';

jest.mock('../DocumentUpload.module.scss', () => ({
  fileList: 'fileList',
  fileListHeader: 'fileListHeader',
  fileListActions: 'fileListActions',
  secondaryButton: 'secondaryButton',
  primaryButton: 'primaryButton',
  files: 'files',
  fileItem: 'fileItem',
  fileInfo: 'fileInfo',
  fileName: 'fileName',
  fileSize: 'fileSize',
  fileStatus: 'fileStatus',
  statusPending: 'statusPending',
  statusUploading: 'statusUploading',
  statusSuccess: 'statusSuccess',
  statusError: 'statusError',
  removeButton: 'removeButton',
}));

describe('FileList', () => {
  const createFile = (name: string, size: number) => {
    const file = new File(['x'.repeat(size)], name, { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  const defaultProps = {
    files: [] as File[],
    statuses: [] as UploadStatus[],
    onRemove: jest.fn(),
    onUploadAll: jest.fn(),
    onClearCompleted: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when files is empty', () => {
    const { container } = render(<FileList {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render file count in header', () => {
    const files = [createFile('test1.txt', 1024), createFile('test2.txt', 2048)];
    const statuses: UploadStatus[] = [
      { name: 'test1.txt', status: 'pending' },
      { name: 'test2.txt', status: 'pending' },
    ];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    expect(screen.getByText('Selected Files (2)')).toBeInTheDocument();
  });

  it('should render Clear Completed button', () => {
    const files = [createFile('test.txt', 1024)];
    const statuses: UploadStatus[] = [{ name: 'test.txt', status: 'pending' }];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    expect(screen.getByRole('button', { name: 'Clear Completed' })).toBeInTheDocument();
  });

  it('should render Upload All button', () => {
    const files = [createFile('test.txt', 1024)];
    const statuses: UploadStatus[] = [{ name: 'test.txt', status: 'pending' }];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    expect(screen.getByRole('button', { name: 'Upload All' })).toBeInTheDocument();
  });

  it('should call onUploadAll when Upload All is clicked', () => {
    const files = [createFile('test.txt', 1024)];
    const statuses: UploadStatus[] = [{ name: 'test.txt', status: 'pending' }];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    fireEvent.click(screen.getByRole('button', { name: 'Upload All' }));

    expect(defaultProps.onUploadAll).toHaveBeenCalled();
  });

  it('should call onClearCompleted when Clear Completed is clicked', () => {
    const files = [createFile('test.txt', 1024)];
    const statuses: UploadStatus[] = [{ name: 'test.txt', status: 'pending' }];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear Completed' }));

    expect(defaultProps.onClearCompleted).toHaveBeenCalled();
  });

  it('should render file names', () => {
    const files = [createFile('document.txt', 1024)];
    const statuses: UploadStatus[] = [{ name: 'document.txt', status: 'pending' }];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    expect(screen.getByText('document.txt')).toBeInTheDocument();
  });

  it('should render file sizes in KB', () => {
    const files = [createFile('test.txt', 2560)]; // 2.5 KB
    const statuses: UploadStatus[] = [{ name: 'test.txt', status: 'pending' }];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    expect(screen.getByText('2.5 KB')).toBeInTheDocument();
  });

  it('should render pending status', () => {
    const files = [createFile('test.txt', 1024)];
    const statuses: UploadStatus[] = [{ name: 'test.txt', status: 'pending' }];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should render uploading status', () => {
    const files = [createFile('test.txt', 1024)];
    const statuses: UploadStatus[] = [{ name: 'test.txt', status: 'uploading' }];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('should render success status', () => {
    const files = [createFile('test.txt', 1024)];
    const statuses: UploadStatus[] = [{ name: 'test.txt', status: 'success' }];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    expect(screen.getByText('Uploaded')).toBeInTheDocument();
  });

  it('should render error status with message', () => {
    const files = [createFile('test.txt', 1024)];
    const statuses: UploadStatus[] = [
      { name: 'test.txt', status: 'error', message: 'Upload failed' },
    ];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });

  it('should render Remove button for pending files', () => {
    const files = [createFile('test.txt', 1024)];
    const statuses: UploadStatus[] = [{ name: 'test.txt', status: 'pending' }];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('should not render Remove button for non-pending files', () => {
    const files = [createFile('test.txt', 1024)];
    const statuses: UploadStatus[] = [{ name: 'test.txt', status: 'uploading' }];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('should call onRemove with correct index when Remove is clicked', () => {
    const files = [createFile('test1.txt', 1024), createFile('test2.txt', 1024)];
    const statuses: UploadStatus[] = [
      { name: 'test1.txt', status: 'pending' },
      { name: 'test2.txt', status: 'pending' },
    ];

    render(<FileList {...defaultProps} files={files} statuses={statuses} />);

    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    fireEvent.click(removeButtons[1]);

    expect(defaultProps.onRemove).toHaveBeenCalledWith(1);
  });
});
