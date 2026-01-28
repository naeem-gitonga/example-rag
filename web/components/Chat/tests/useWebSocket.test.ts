import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../hooks/useWebSocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  });

  // Test helpers
  simulateMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

let mockWebSocketInstance: MockWebSocket;

// Replace global WebSocket
beforeAll(() => {
  (global as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = jest.fn((url: string) => {
    mockWebSocketInstance = new MockWebSocket(url);
    return mockWebSocketInstance;
  }) as unknown as typeof WebSocket;
  (global.WebSocket as unknown as { OPEN: number }).OPEN = MockWebSocket.OPEN;
});

describe('useWebSocket', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start with connecting status', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws' })
    );

    expect(result.current.status).toBe('connecting');
  });

  it('should transition to connected status on open', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws' })
    );

    await act(async () => {
      jest.runAllTimers();
    });

    expect(result.current.status).toBe('connected');
  });

  it('should call onOpen callback when connected', async () => {
    const onOpen = jest.fn();
    renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws', onOpen })
    );

    await act(async () => {
      jest.runAllTimers();
    });

    expect(onOpen).toHaveBeenCalled();
  });

  it('should call onMessage callback with parsed data', async () => {
    const onMessage = jest.fn();
    renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws', onMessage })
    );

    await act(async () => {
      jest.runAllTimers();
    });

    act(() => {
      mockWebSocketInstance.simulateMessage({ action: 'chat', content: 'Hello' });
    });

    expect(onMessage).toHaveBeenCalledWith({ action: 'chat', content: 'Hello' });
  });

  it('should send JSON stringified messages', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws' })
    );

    await act(async () => {
      jest.runAllTimers();
    });

    act(() => {
      result.current.send({ action: 'chat', content: 'Hello' });
    });

    expect(mockWebSocketInstance.send).toHaveBeenCalledWith(
      JSON.stringify({ action: 'chat', content: 'Hello' })
    );
  });

  it('should not send when disconnected', () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws' })
    );

    // Still connecting, readyState is not OPEN
    act(() => {
      result.current.send({ action: 'chat', content: 'Hello' });
    });

    expect(mockWebSocketInstance.send).not.toHaveBeenCalled();
  });

  it('should transition to disconnected on close', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws', reconnectAttempts: 0 })
    );

    await act(async () => {
      jest.runAllTimers();
    });

    act(() => {
      mockWebSocketInstance.simulateClose();
    });

    expect(result.current.status).toBe('disconnected');
  });

  it('should call onClose callback when disconnected', async () => {
    const onClose = jest.fn();
    renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws', onClose, reconnectAttempts: 0 })
    );

    await act(async () => {
      jest.runAllTimers();
    });

    act(() => {
      mockWebSocketInstance.simulateClose();
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('should transition to error on error', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws' })
    );

    await act(async () => {
      jest.runAllTimers();
    });

    act(() => {
      mockWebSocketInstance.simulateError();
    });

    expect(result.current.status).toBe('error');
  });

  it('should call onError callback on error', async () => {
    const onError = jest.fn();
    renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws', onError })
    );

    await act(async () => {
      jest.runAllTimers();
    });

    act(() => {
      mockWebSocketInstance.simulateError();
    });

    expect(onError).toHaveBeenCalled();
  });

  it('should disconnect when calling disconnect', async () => {
    const { result } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws' })
    );

    await act(async () => {
      jest.runAllTimers();
    });

    act(() => {
      result.current.disconnect();
    });

    expect(mockWebSocketInstance.close).toHaveBeenCalled();
    expect(result.current.status).toBe('disconnected');
  });

  it('should cleanup on unmount', async () => {
    const { unmount } = renderHook(() =>
      useWebSocket({ url: 'ws://localhost:8080/ws' })
    );

    await act(async () => {
      jest.runAllTimers();
    });

    unmount();

    expect(mockWebSocketInstance.close).toHaveBeenCalled();
  });
});
