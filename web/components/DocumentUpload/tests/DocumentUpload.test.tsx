import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentUpload from '../DocumentUpload';

// Mock child components to isolate testing
jest.mock('../TextEntryForm', () => ({
  TextEntryForm: () => <div data-testid="text-entry-form">TextEntryForm</div>,
}));

jest.mock('../FileUploadForm', () => ({
  FileUploadForm: () => <div data-testid="file-upload-form">FileUploadForm</div>,
}));

jest.mock('@/components/ThemeToggle/ThemeToggle', () => ({
  __esModule: true,
  default: () => <button data-testid="theme-toggle">Theme Toggle</button>,
}));

jest.mock('../DocumentUpload.module.scss', () => ({
  container: 'container',
  header: 'header',
  logo: 'logo',
  nav: 'nav',
  navLink: 'navLink',
  navLinkActive: 'navLinkActive',
  main: 'main',
  modeToggle: 'modeToggle',
  modeButton: 'modeButton',
  active: 'active',
}));

describe('DocumentUpload', () => {
  it('should render header with logo', () => {
    render(<DocumentUpload />);

    expect(screen.getByText('RAG Chat')).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(<DocumentUpload />);

    expect(screen.getByRole('link', { name: 'RAG Chat' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Chat' })).toHaveAttribute('href', '/chat');
    expect(screen.getByRole('link', { name: 'Add Knowledge' })).toHaveAttribute('href', '/upload');
  });

  it('should render theme toggle', () => {
    render(<DocumentUpload />);

    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('should render mode toggle buttons', () => {
    render(<DocumentUpload />);

    expect(screen.getByRole('button', { name: 'Write Entry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload File' })).toBeInTheDocument();
  });

  it('should show TextEntryForm by default', () => {
    render(<DocumentUpload />);

    expect(screen.getByTestId('text-entry-form')).toBeInTheDocument();
    expect(screen.queryByTestId('file-upload-form')).not.toBeInTheDocument();
  });

  it('should have Write Entry button active by default', () => {
    render(<DocumentUpload />);

    expect(screen.getByRole('button', { name: 'Write Entry' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Upload File' })).not.toHaveClass('active');
  });

  it('should switch to FileUploadForm when Upload File is clicked', () => {
    render(<DocumentUpload />);

    fireEvent.click(screen.getByRole('button', { name: 'Upload File' }));

    expect(screen.queryByTestId('text-entry-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('file-upload-form')).toBeInTheDocument();
  });

  it('should update active state when mode changes', () => {
    render(<DocumentUpload />);

    fireEvent.click(screen.getByRole('button', { name: 'Upload File' }));

    expect(screen.getByRole('button', { name: 'Write Entry' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Upload File' })).toHaveClass('active');
  });

  it('should switch back to TextEntryForm when Write Entry is clicked', () => {
    render(<DocumentUpload />);

    fireEvent.click(screen.getByRole('button', { name: 'Upload File' }));
    fireEvent.click(screen.getByRole('button', { name: 'Write Entry' }));

    expect(screen.getByTestId('text-entry-form')).toBeInTheDocument();
    expect(screen.queryByTestId('file-upload-form')).not.toBeInTheDocument();
  });

  it('should highlight Add Knowledge as active nav link', () => {
    render(<DocumentUpload />);

    const addKnowledgeLink = screen.getByRole('link', { name: 'Add Knowledge' });
    expect(addKnowledgeLink).toHaveClass('navLinkActive');
  });

  it('should not highlight Chat as active nav link', () => {
    render(<DocumentUpload />);

    const chatLink = screen.getByRole('link', { name: 'Chat' });
    expect(chatLink).toHaveClass('navLink');
    expect(chatLink).not.toHaveClass('navLinkActive');
  });
});
