import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { IncomingMessage, ServerResponse } from "http";

const mockListen = jest.fn<(port: number, cb: () => void) => void>();
const mockWssOn = jest.fn();
const mockConnectionHandler = jest.fn();

let capturedRequestHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

jest.unstable_mockModule("http", () => ({
  default: {
    createServer: jest.fn((handler: (req: IncomingMessage, res: ServerResponse) => void) => {
      capturedRequestHandler = handler;
      return { listen: mockListen };
    }),
  },
}));

jest.unstable_mockModule("ws", () => ({
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: mockWssOn,
  })),
}));

jest.unstable_mockModule("../handlers/connectionHandler.js", () => ({
  connectionHandler: mockConnectionHandler,
}));

describe("index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedRequestHandler = null;
    mockListen.mockImplementation((port: number, cb: () => void) => cb());
  });

  it("should listen on port 8080", async () => {
    await import("../index.js");

    expect(mockListen).toHaveBeenCalledWith(8080, expect.any(Function));
  });

  it("should register connection handler on WebSocket server", async () => {
    jest.resetModules();
    await import("../index.js");

    expect(mockWssOn).toHaveBeenCalledWith("connection", mockConnectionHandler);
  });

  it("should return health check response for /health", async () => {
    jest.resetModules();
    await import("../index.js");

    expect(capturedRequestHandler).not.toBeNull();

    const mockReq = { url: "/health" } as IncomingMessage;
    const mockRes = {
      writeHead: jest.fn(),
      end: jest.fn(),
    } as unknown as ServerResponse;

    capturedRequestHandler!(mockReq, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(mockRes.end).toHaveBeenCalledWith(
      JSON.stringify({ status: "ok", service: "gateway" })
    );
  });

  it("should return 404 for unknown routes", async () => {
    jest.resetModules();
    await import("../index.js");

    expect(capturedRequestHandler).not.toBeNull();

    const mockReq = { url: "/unknown" } as IncomingMessage;
    const mockRes = {
      writeHead: jest.fn(),
      end: jest.fn(),
    } as unknown as ServerResponse;

    capturedRequestHandler!(mockReq, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(404, {
      "Content-Type": "text/plain",
    });
    expect(mockRes.end).toHaveBeenCalledWith(
      "Not found - connect via WebSocket at /ws"
    );
  });
});
