import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Chat } from '../Chat';

// Mock the hooks and components
jest.mock('../hooks/useChat', () => ({
  useChat: jest.fn(),
}));

jest.mock('../Chat.module.scss', () => ({
  chatContainer: 'chatContainer',
  chatHeader: 'chatHeader',
  title: 'title',
  errorBanner: 'errorBanner',
  dismissButton: 'dismissButton',
  chatBody: 'chatBody',
  chatFooter: 'chatFooter',
}));

import { useChat } from '../hooks/useChat';
const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;

// Mock child components
jest.mock('../MessageList', () => ({
  MessageList: ({ messages, isLoading }: { messages: unknown[]; isLoading: boolean }) => (
    <div data-testid="message-list" data-loading={isLoading}>
      {messages.length} messages
    </div>
  ),
}));

jest.mock('../MessageInput', () => ({
  MessageInput: ({ onSend, disabled, placeholder }: { onSend: (msg: string) => void; disabled: boolean; placeholder: string }) => (
    <div data-testid="message-input">
      <input
        data-testid="input"
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onSend(e.target.value)}
      />
    </div>
  ),
}));

jest.mock('../ConnectionStatus', () => ({
  ConnectionStatus: ({ status }: { status: string }) => (
    <div data-testid="connection-status">{status}</div>
  ),
}));

describe('Chat', () => {
  const defaultMockReturn = {
    messages: [],
    isLoading: false,
    error: null,
    connectionStatus: 'connected' as const,
    sendMessage: jest.fn(),
    clearMessages: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChat.mockReturnValue(defaultMockReturn);
  });

  it('should render chat container', () => {
    const { container } = render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(container.querySelector('.chatContainer')).toBeInTheDocument();
  });

  it('should render chat title', () => {
    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('should render connection status', () => {
    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
  });

  it('should render message list', () => {
    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
  });

  it('should render message input', () => {
    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('should pass messages to MessageList', () => {
    const messages = [
      { message_id: '1', session_id: 's1', role: 'user' as const, content: 'Hi', created_at: new Date() },
    ];
    mockUseChat.mockReturnValue({ ...defaultMockReturn, messages });

    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByTestId('message-list')).toHaveTextContent('1 messages');
  });

  it('should pass isLoading to MessageList', () => {
    mockUseChat.mockReturnValue({ ...defaultMockReturn, isLoading: true });

    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByTestId('message-list')).toHaveAttribute('data-loading', 'true');
  });

  it('should disable input when disconnected', () => {
    mockUseChat.mockReturnValue({ ...defaultMockReturn, connectionStatus: 'disconnected' });

    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByTestId('input')).toBeDisabled();
  });

  it('should disable input when loading', () => {
    mockUseChat.mockReturnValue({ ...defaultMockReturn, isLoading: true });

    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByTestId('input')).toBeDisabled();
  });

  it('should enable input when connected and not loading', () => {
    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByTestId('input')).not.toBeDisabled();
  });

  it('should show waiting placeholder when disconnected', () => {
    mockUseChat.mockReturnValue({ ...defaultMockReturn, connectionStatus: 'disconnected' });

    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByTestId('input')).toHaveAttribute('placeholder', 'Waiting for connection...');
  });

  it('should show normal placeholder when connected', () => {
    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByTestId('input')).toHaveAttribute('placeholder', 'Type a message...');
  });

  it('should render error banner when error exists', () => {
    mockUseChat.mockReturnValue({ ...defaultMockReturn, error: 'Something went wrong' });

    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should not render error banner when no error', () => {
    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
  });

  it('should call clearError when dismiss button is clicked', () => {
    const clearError = jest.fn();
    mockUseChat.mockReturnValue({ ...defaultMockReturn, error: 'Error', clearError });

    render(<Chat wsUrl="ws://localhost:8080/ws" />);
    fireEvent.click(screen.getByText('Dismiss'));

    expect(clearError).toHaveBeenCalled();
  });

  it('should pass wsUrl to useChat', () => {
    render(<Chat wsUrl="ws://test:8080/ws" />);
    expect(mockUseChat).toHaveBeenCalledWith(expect.objectContaining({ wsUrl: 'ws://test:8080/ws' }));
  });

  it('should pass sessionId to useChat when provided', () => {
    render(<Chat wsUrl="ws://localhost:8080/ws" sessionId="my-session" />);
    expect(mockUseChat).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'my-session' }));
  });
});
