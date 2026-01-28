import { renderHook, act } from '@testing-library/react';
import { useChat } from '../hooks/useChat';

// Mock useWebSocket
const mockSend = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

let mockOnMessage: ((data: unknown) => void) | undefined;
let mockOnError: (() => void) | undefined;

jest.mock('../hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(({ onMessage, onError }) => {
    mockOnMessage = onMessage;
    mockOnError = onError;
    return {
      status: 'connected',
      send: mockSend,
      connect: mockConnect,
      disconnect: mockDisconnect,
    };
  }),
}));

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnMessage = undefined;
    mockOnError = undefined;
  });

  it('should initialize with empty messages', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should return connection status', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    expect(result.current.connectionStatus).toBe('connected');
  });

  it('should add user message when sending', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    act(() => {
      result.current.sendMessage('Hello');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Hello');
  });

  it('should set isLoading to true when sending', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    act(() => {
      result.current.sendMessage('Hello');
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should call websocket send with correct payload', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws', sessionId: 'test-session' })
    );

    act(() => {
      result.current.sendMessage('Hello');
    });

    expect(mockSend).toHaveBeenCalledWith({
      action: 'chat',
      session_id: 'test-session',
      content: 'Hello',
    });
  });

  it('should not send empty messages', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    // Clear any initial calls (e.g., history fetch)
    mockSend.mockClear();

    act(() => {
      result.current.sendMessage('');
    });

    expect(mockSend).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'chat' })
    );
    expect(result.current.messages).toHaveLength(0);
  });

  it('should not send whitespace-only messages', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    // Clear any initial calls (e.g., history fetch)
    mockSend.mockClear();

    act(() => {
      result.current.sendMessage('   ');
    });

    expect(mockSend).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'chat' })
    );
    expect(result.current.messages).toHaveLength(0);
  });

  it('should add assistant message on chat response', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    act(() => {
      result.current.sendMessage('Hello');
    });

    act(() => {
      mockOnMessage?.({
        action: 'chat',
        role: 'assistant',
        content: 'Hi there!',
        message_id: 'msg-1',
        session_id: 'session-1',
      });
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('Hi there!');
  });

  it('should set isLoading to false on response', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    act(() => {
      result.current.sendMessage('Hello');
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      mockOnMessage?.({
        action: 'chat',
        role: 'assistant',
        content: 'Hi there!',
      });
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should set error on error response', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    act(() => {
      mockOnMessage?.({
        error: 'Something went wrong',
      });
    });

    expect(result.current.error).toBe('Something went wrong');
    expect(result.current.isLoading).toBe(false);
  });

  it('should set error on connection error', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    act(() => {
      mockOnError?.();
    });

    expect(result.current.error).toBe('Connection error');
  });

  it('should clear error with clearError', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    act(() => {
      mockOnMessage?.({ error: 'Error' });
    });

    expect(result.current.error).toBe('Error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should clear messages with clearMessages', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    act(() => {
      result.current.sendMessage('Hello');
    });

    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it('should include RAG context in assistant messages', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    const ragContext = [
      {
        entry_id: 'entry-1',
        entry_date: '2024-01-15',
        text_snippet: 'Relevant text',
        score: 0.95,
      },
    ];

    act(() => {
      mockOnMessage?.({
        action: 'chat',
        role: 'assistant',
        content: 'Based on your notes...',
        rag_context: ragContext,
      });
    });

    expect(result.current.messages[0].rag_context).toEqual(ragContext);
  });

  it('should generate session ID if not provided', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws' })
    );

    act(() => {
      result.current.sendMessage('Hello');
    });

    const sentPayload = mockSend.mock.calls[0][0];
    expect(sentPayload.session_id).toBeDefined();
    expect(typeof sentPayload.session_id).toBe('string');
  });

  it('should use provided session ID', () => {
    const { result } = renderHook(() =>
      useChat({ wsUrl: 'ws://localhost:8080/ws', sessionId: 'my-session' })
    );

    act(() => {
      result.current.sendMessage('Hello');
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: 'my-session' })
    );
  });
});
