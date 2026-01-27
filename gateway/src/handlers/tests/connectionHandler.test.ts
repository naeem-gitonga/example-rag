import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { IncomingMessage } from "http";
import WebSocket from "ws";

const mockHandleMessage = jest.fn<() => Promise<void>>();

jest.unstable_mockModule("../messageHandler.js", () => ({
  handleMessage: mockHandleMessage,
}));

const { connectionHandler } = await import("../connectionHandler.js");

function createMockSocket() {
  return {
    send: jest.fn(),
    on: jest.fn(),
  };
}

function createMockRequest(remoteAddress?: string) {
  return {
    socket: {
      remoteAddress,
    },
  } as unknown as IncomingMessage;
}

describe("connectionHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should send welcome message with session ID on connection", () => {
    const mockSocket = createMockSocket();
    const mockRequest = createMockRequest("127.0.0.1");

    connectionHandler(mockSocket as unknown as WebSocket, mockRequest);

    expect(mockSocket.send).toHaveBeenCalledTimes(1);
    const sentMessage = JSON.parse(mockSocket.send.mock.calls[0][0] as string);
    expect(sentMessage.type).toBe("connected");
    expect(sentMessage.sessionId).toBeDefined();
    expect(typeof sentMessage.sessionId).toBe("string");
  });

  it("should register message handler", () => {
    const mockSocket = createMockSocket();
    const mockRequest = createMockRequest("127.0.0.1");

    connectionHandler(mockSocket as unknown as WebSocket, mockRequest);

    expect(mockSocket.on).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("should register close handler", () => {
    const mockSocket = createMockSocket();
    const mockRequest = createMockRequest("127.0.0.1");

    connectionHandler(mockSocket as unknown as WebSocket, mockRequest);

    expect(mockSocket.on).toHaveBeenCalledWith("close", expect.any(Function));
  });

  it("should register error handler", () => {
    const mockSocket = createMockSocket();
    const mockRequest = createMockRequest("127.0.0.1");

    connectionHandler(mockSocket as unknown as WebSocket, mockRequest);

    expect(mockSocket.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("should call handleMessage when message received", () => {
    const mockSocket = createMockSocket();
    const mockRequest = createMockRequest("127.0.0.1");

    connectionHandler(mockSocket as unknown as WebSocket, mockRequest);

    const messageCall = (mockSocket.on.mock.calls as [string, Function][]).find(
      (call) => call[0] === "message"
    );
    expect(messageCall).toBeDefined();

    const messageHandler = messageCall![1];
    const testData = Buffer.from('{"action":"test"}');
    messageHandler(testData);

    expect(mockHandleMessage).toHaveBeenCalledWith(
      mockSocket,
      expect.any(String),
      testData
    );
  });

  it("should handle unknown remote address", () => {
    const mockSocket = createMockSocket();
    const mockRequest = createMockRequest(undefined);

    expect(() => {
      connectionHandler(mockSocket as unknown as WebSocket, mockRequest);
    }).not.toThrow();

    expect(mockSocket.send).toHaveBeenCalled();
  });

  it("should generate unique session IDs", () => {
    const mockSocket1 = createMockSocket();
    const mockSocket2 = createMockSocket();
    const mockRequest = createMockRequest("127.0.0.1");

    connectionHandler(mockSocket1 as unknown as WebSocket, mockRequest);
    const firstMessage = JSON.parse(mockSocket1.send.mock.calls[0][0] as string);

    connectionHandler(mockSocket2 as unknown as WebSocket, mockRequest);
    const secondMessage = JSON.parse(mockSocket2.send.mock.calls[0][0] as string);

    expect(firstMessage.sessionId).not.toBe(secondMessage.sessionId);
  });

  it("should handle close event without error", () => {
    const mockSocket = createMockSocket();
    const mockRequest = createMockRequest("127.0.0.1");

    connectionHandler(mockSocket as unknown as WebSocket, mockRequest);

    const closeCall = (mockSocket.on.mock.calls as [string, Function][]).find(
      (call) => call[0] === "close"
    );
    const closeHandler = closeCall![1];

    expect(() => closeHandler()).not.toThrow();
  });

  it("should handle error event without crashing", () => {
    const mockSocket = createMockSocket();
    const mockRequest = createMockRequest("127.0.0.1");

    connectionHandler(mockSocket as unknown as WebSocket, mockRequest);

    const errorCall = (mockSocket.on.mock.calls as [string, Function][]).find(
      (call) => call[0] === "error"
    );
    const errorHandler = errorCall![1];

    expect(() => errorHandler(new Error("test error"))).not.toThrow();
  });
});
