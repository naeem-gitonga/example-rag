import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploadForm } from '../FileUploadForm';

// Mock the hooks module
jest.mock('../hooks/useFileUpload', () => ({
  useFileUpload: jest.fn(),
}));

import { useFileUpload } from '../hooks/useFileUpload';
const mockUseFileUpload = useFileUpload as jest.MockedFunction<typeof useFileUpload>;

jest.mock('../DocumentUpload.module.scss', () => ({
  fileUploadForm: 'fileUploadForm',
  formRow: 'formRow',
  formGroup: 'formGroup',
  label: 'label',
  dateInput: 'dateInput',
  topicSelector: 'topicSelector',
  topicChip: 'topicChip',
  selected: 'selected',
  customTopicInputWrapper: 'customTopicInputWrapper',
  customTopicInput: 'customTopicInput',
  addTopicButton: 'addTopicButton',
  dropzone: 'dropzone',
  dragging: 'dragging',
  fileInput: 'fileInput',
  dropzoneContent: 'dropzoneContent',
  dropzoneIcon: 'dropzoneIcon',
  dropzoneText: 'dropzoneText',
  dropzoneHint: 'dropzoneHint',
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
  removeButton: 'removeButton',
}));

describe('FileUploadForm', () => {
  const mockFileInputRef = { current: null };

  const defaultMockReturn = {
    files: [] as File[],
    uploadStatuses: [],
    isDragging: false,
    fileDate: '2024-01-15',
    setFileDate: jest.fn(),
    fileTopics: [] as string[],
    toggleTopic: jest.fn(),
    customTopics: [] as string[],
    addCustomTopic: jest.fn(),
    fileInputRef: mockFileInputRef,
    handleDragOver: jest.fn(),
    handleDragLeave: jest.fn(),
    handleDrop: jest.fn(),
    handleFileSelect: jest.fn(),
    removeFile: jest.fn(),
    uploadAll: jest.fn(),
    clearCompleted: jest.fn(),
    openFileDialog: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFileUpload.mockReturnValue(defaultMockReturn);
  });

  it('should render date input with label', () => {
    render(<FileUploadForm />);

    expect(screen.getByText('Entry Date (for all files)')).toBeInTheDocument();
  });

  it('should render topic selector with label', () => {
    render(<FileUploadForm />);

    expect(screen.getByText('Topics (for all files)')).toBeInTheDocument();
  });

  it('should render dropzone', () => {
    render(<FileUploadForm />);

    expect(screen.getByText('Drag and drop files here, or click to select')).toBeInTheDocument();
  });

  it('should call setFileDate when date changes', () => {
    const setFileDate = jest.fn();
    mockUseFileUpload.mockReturnValue({
      ...defaultMockReturn,
      setFileDate,
    });

    render(<FileUploadForm />);

    const dateInput = screen.getByDisplayValue('2024-01-15');
    fireEvent.change(dateInput, { target: { value: '2024-02-20' } });

    expect(setFileDate).toHaveBeenCalledWith('2024-02-20');
  });

  it('should call toggleTopic when topic is clicked', () => {
    const toggleTopic = jest.fn();
    mockUseFileUpload.mockReturnValue({
      ...defaultMockReturn,
      toggleTopic,
    });

    render(<FileUploadForm />);

    fireEvent.click(screen.getByRole('button', { name: 'science' }));

    expect(toggleTopic).toHaveBeenCalledWith('science');
  });

  it('should call openFileDialog when dropzone is clicked', () => {
    const openFileDialog = jest.fn();
    mockUseFileUpload.mockReturnValue({
      ...defaultMockReturn,
      openFileDialog,
    });

    render(<FileUploadForm />);

    const dropzone = screen.getByText('Drag and drop files here, or click to select').closest('div');
    fireEvent.click(dropzone!.parentElement!);

    expect(openFileDialog).toHaveBeenCalled();
  });

  it('should not render file list when no files', () => {
    render(<FileUploadForm />);

    expect(screen.queryByText('Selected Files')).not.toBeInTheDocument();
  });

  it('should render file list when files exist', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    mockUseFileUpload.mockReturnValue({
      ...defaultMockReturn,
      files: [file],
      uploadStatuses: [{ name: 'test.txt', status: 'pending' }],
    });

    render(<FileUploadForm />);

    expect(screen.getByText('Selected Files (1)')).toBeInTheDocument();
  });

  it('should highlight selected topics', () => {
    mockUseFileUpload.mockReturnValue({
      ...defaultMockReturn,
      fileTopics: ['science'],
    });

    render(<FileUploadForm />);

    expect(screen.getByRole('button', { name: 'science' })).toHaveClass('selected');
  });

  it('should apply dragging class when isDragging is true', () => {
    mockUseFileUpload.mockReturnValue({
      ...defaultMockReturn,
      isDragging: true,
    });

    const { container } = render(<FileUploadForm />);

    expect(container.querySelector('.dropzone')).toHaveClass('dragging');
  });

  it('should call uploadAll when Upload All is clicked', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const uploadAll = jest.fn();
    mockUseFileUpload.mockReturnValue({
      ...defaultMockReturn,
      files: [file],
      uploadStatuses: [{ name: 'test.txt', status: 'pending' }],
      uploadAll,
    });

    render(<FileUploadForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Upload All' }));

    expect(uploadAll).toHaveBeenCalled();
  });

  it('should call clearCompleted when Clear Completed is clicked', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const clearCompleted = jest.fn();
    mockUseFileUpload.mockReturnValue({
      ...defaultMockReturn,
      files: [file],
      uploadStatuses: [{ name: 'test.txt', status: 'pending' }],
      clearCompleted,
    });

    render(<FileUploadForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear Completed' }));

    expect(clearCompleted).toHaveBeenCalled();
  });

  it('should call removeFile when Remove is clicked', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const removeFile = jest.fn();
    mockUseFileUpload.mockReturnValue({
      ...defaultMockReturn,
      files: [file],
      uploadStatuses: [{ name: 'test.txt', status: 'pending' }],
      removeFile,
    });

    render(<FileUploadForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(removeFile).toHaveBeenCalledWith(0);
  });
});
