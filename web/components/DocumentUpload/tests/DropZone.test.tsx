import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DropZone } from '../DropZone';

jest.mock('../DocumentUpload.module.scss', () => ({
  dropzone: 'dropzone',
  dragging: 'dragging',
  fileInput: 'fileInput',
  dropzoneContent: 'dropzoneContent',
  dropzoneIcon: 'dropzoneIcon',
  dropzoneText: 'dropzoneText',
  dropzoneHint: 'dropzoneHint',
}));

describe('DropZone', () => {
  const defaultProps = {
    isDragging: false,
    onDragOver: jest.fn(),
    onDragLeave: jest.fn(),
    onDrop: jest.fn(),
    onClick: jest.fn(),
    onFileSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dropzone content', () => {
    render(<DropZone {...defaultProps} />);

    expect(screen.getByText('Drag and drop files here, or click to select')).toBeInTheDocument();
    expect(screen.getByText('Supports TXT, MD, PDF files')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    render(<DropZone {...defaultProps} />);

    const dropzone = screen.getByText('Drag and drop files here, or click to select').closest('div');
    fireEvent.click(dropzone!.parentElement!);

    expect(defaultProps.onClick).toHaveBeenCalled();
  });

  it('should call onDragOver on drag over', () => {
    render(<DropZone {...defaultProps} />);

    const dropzone = screen.getByText('Drag and drop files here, or click to select').closest('div');
    fireEvent.dragOver(dropzone!.parentElement!);

    expect(defaultProps.onDragOver).toHaveBeenCalled();
  });

  it('should call onDragLeave on drag leave', () => {
    render(<DropZone {...defaultProps} />);

    const dropzone = screen.getByText('Drag and drop files here, or click to select').closest('div');
    fireEvent.dragLeave(dropzone!.parentElement!);

    expect(defaultProps.onDragLeave).toHaveBeenCalled();
  });

  it('should call onDrop on drop', () => {
    render(<DropZone {...defaultProps} />);

    const dropzone = screen.getByText('Drag and drop files here, or click to select').closest('div');
    fireEvent.drop(dropzone!.parentElement!);

    expect(defaultProps.onDrop).toHaveBeenCalled();
  });

  it('should apply dragging class when isDragging is true', () => {
    const { container } = render(<DropZone {...defaultProps} isDragging={true} />);

    const dropzone = container.querySelector('.dropzone');
    expect(dropzone).toHaveClass('dragging');
  });

  it('should not apply dragging class when isDragging is false', () => {
    const { container } = render(<DropZone {...defaultProps} isDragging={false} />);

    const dropzone = container.querySelector('.dropzone');
    expect(dropzone).not.toHaveClass('dragging');
  });

  it('should have hidden file input', () => {
    render(<DropZone {...defaultProps} />);

    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveClass('fileInput');
  });

  it('should accept default file types', () => {
    render(<DropZone {...defaultProps} />);

    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept', '.txt,.md,.pdf');
  });

  it('should accept custom file types', () => {
    render(<DropZone {...defaultProps} accept=".pdf,.doc" />);

    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept', '.pdf,.doc');
  });

  it('should allow multiple files', () => {
    render(<DropZone {...defaultProps} />);

    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('multiple');
  });

  it('should call onFileSelect when files are selected', () => {
    render(<DropZone {...defaultProps} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(defaultProps.onFileSelect).toHaveBeenCalled();
  });

  it('should forward ref to input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<DropZone {...defaultProps} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('file');
  });
});
