import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageInput } from '../MessageInput';

jest.mock('../Chat.module.scss', () => ({
  inputContainer: 'inputContainer',
  messageInput: 'messageInput',
  sendButton: 'sendButton',
}));

describe('MessageInput', () => {
  const mockOnSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render textarea with default placeholder', () => {
    render(<MessageInput onSend={mockOnSend} />);
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('should render textarea with custom placeholder', () => {
    render(<MessageInput onSend={mockOnSend} placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('should render send button', () => {
    render(<MessageInput onSend={mockOnSend} />);
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  it('should disable send button when input is empty', () => {
    render(<MessageInput onSend={mockOnSend} />);
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('should enable send button when input has text', () => {
    render(<MessageInput onSend={mockOnSend} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(screen.getByRole('button', { name: 'Send message' })).not.toBeDisabled();
  });

  it('should call onSend when clicking send button', () => {
    render(<MessageInput onSend={mockOnSend} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(mockOnSend).toHaveBeenCalledWith('Hello');
  });

  it('should clear input after sending', () => {
    render(<MessageInput onSend={mockOnSend} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(textarea.value).toBe('');
  });

  it('should send message on Enter key press', () => {
    render(<MessageInput onSend={mockOnSend} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(mockOnSend).toHaveBeenCalledWith('Hello');
  });

  it('should not send message on Shift+Enter', () => {
    render(<MessageInput onSend={mockOnSend} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should disable textarea when disabled prop is true', () => {
    render(<MessageInput onSend={mockOnSend} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should not send when disabled', () => {
    render(<MessageInput onSend={mockOnSend} disabled />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should trim whitespace from message', () => {
    render(<MessageInput onSend={mockOnSend} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '  Hello  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(mockOnSend).toHaveBeenCalledWith('  Hello  ');
  });

  it('should not send whitespace-only message', () => {
    render(<MessageInput onSend={mockOnSend} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });
});
