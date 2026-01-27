import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import WebSocket from "ws";

const mockInvokeLambda = jest.fn<() => Promise<Record<string, unknown>>>();

jest.unstable_mockModule("../../services/lambdaClient.js", () => ({
  invokeLambda: mockInvokeLambda,
}));

const { handleMessage } = await import("../messageHandler.js");

function createMockSocket(readyState: number = WebSocket.OPEN) {
  return {
    readyState,
    send: jest.fn(),
  };
}

describe("messageHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("invalid messages", () => {
    it("should send error for invalid JSON", async () => {
      const mockSocket = createMockSocket();

      await handleMessage(mockSocket as unknown as WebSocket, "session1", Buffer.from("not json"));

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ error: "Invalid JSON" })
      );
    });

    it("should send error for missing action", async () => {
      const mockSocket = createMockSocket();

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        Buffer.from(JSON.stringify({ text: "hello" }))
      );

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ error: "Invalid message format - action required" })
      );
    });

    it("should send error for unknown action", async () => {
      const mockSocket = createMockSocket();

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        Buffer.from(JSON.stringify({ action: "unknown" }))
      );

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ error: "Unknown action: unknown" })
      );
    });

    it("should handle string data", async () => {
      const mockSocket = createMockSocket();

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        "invalid json" as unknown as WebSocket.RawData
      );

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ error: "Invalid JSON" })
      );
    });
  });

  describe("ingest action", () => {
    it("should invoke ingestion lambda and send response", async () => {
      mockInvokeLambda.mockResolvedValue({
        statusCode: 200,
        data: { id: "123", message: "Entry ingested successfully" },
      });

      const mockSocket = createMockSocket();

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        Buffer.from(
          JSON.stringify({
            action: "ingest",
            text: "test entry",
            entry_date: "2024-01-15",
            moods: ["happy"],
          })
        )
      );

      expect(mockInvokeLambda).toHaveBeenCalledWith("ingestion", {
        action: "ingest",
        body: {
          text: "test entry",
          entry_date: "2024-01-15",
          moods: ["happy"],
          entry_id: undefined,
          chunk_index: undefined,
        },
      });

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: "ingest",
          statusCode: 200,
          data: { id: "123", message: "Entry ingested successfully" },
        })
      );
    });

    it("should include optional fields when provided", async () => {
      mockInvokeLambda.mockResolvedValue({ statusCode: 200, data: {} });

      const mockSocket = createMockSocket();

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        Buffer.from(
          JSON.stringify({
            action: "ingest",
            text: "test",
            entry_date: "2024-01-15",
            entry_id: "entry-123",
            chunk_index: 2,
          })
        )
      );

      expect(mockInvokeLambda).toHaveBeenCalledWith("ingestion", {
        action: "ingest",
        body: {
          text: "test",
          entry_date: "2024-01-15",
          moods: undefined,
          entry_id: "entry-123",
          chunk_index: 2,
        },
      });
    });
  });

  describe("query action", () => {
    it("should invoke query lambda and send response", async () => {
      mockInvokeLambda.mockResolvedValue({
        statusCode: 200,
        data: { results: [{ text: "result 1" }] },
      });

      const mockSocket = createMockSocket();

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        Buffer.from(
          JSON.stringify({
            action: "query",
            query: "how was my day?",
            limit: 10,
          })
        )
      );

      expect(mockInvokeLambda).toHaveBeenCalledWith("query", {
        action: "query",
        body: {
          query: "how was my day?",
          limit: 10,
        },
      });

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: "query",
          statusCode: 200,
          data: { results: [{ text: "result 1" }] },
        })
      );
    });

    it("should use default limit when not provided", async () => {
      mockInvokeLambda.mockResolvedValue({ statusCode: 200, data: {} });

      const mockSocket = createMockSocket();

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        Buffer.from(
          JSON.stringify({
            action: "query",
            query: "test query",
          })
        )
      );

      expect(mockInvokeLambda).toHaveBeenCalledWith("query", {
        action: "query",
        body: {
          query: "test query",
          limit: 5,
        },
      });
    });
  });

  describe("health action", () => {
    it("should check ingestion service health by default", async () => {
      mockInvokeLambda.mockResolvedValue({ statusCode: 200, data: { status: "ok" } });

      const mockSocket = createMockSocket();

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        Buffer.from(JSON.stringify({ action: "health" }))
      );

      expect(mockInvokeLambda).toHaveBeenCalledWith("ingestion", {
        action: "health",
      });

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: "health",
          service: "ingestion",
          statusCode: 200,
          data: { status: "ok" },
        })
      );
    });

    it("should check specified service health", async () => {
      mockInvokeLambda.mockResolvedValue({ statusCode: 200, data: { status: "ok" } });

      const mockSocket = createMockSocket();

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        Buffer.from(JSON.stringify({ action: "health", service: "query" }))
      );

      expect(mockInvokeLambda).toHaveBeenCalledWith("query", {
        action: "health",
      });
    });
  });

  describe("error handling", () => {
    it("should send error when lambda invocation fails", async () => {
      mockInvokeLambda.mockRejectedValue(new Error("Lambda timeout"));

      const mockSocket = createMockSocket();

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        Buffer.from(JSON.stringify({ action: "ingest", text: "test", entry_date: "2024-01-15" }))
      );

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ error: "Lambda timeout" })
      );
    });

    it("should send generic error for non-Error exceptions", async () => {
      mockInvokeLambda.mockRejectedValue("string error");

      const mockSocket = createMockSocket();

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        Buffer.from(JSON.stringify({ action: "ingest", text: "test", entry_date: "2024-01-15" }))
      );

      expect(mockSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ error: "Internal error" })
      );
    });

    it("should not send when socket is closed", async () => {
      mockInvokeLambda.mockResolvedValue({ statusCode: 200, data: {} });

      const mockSocket = createMockSocket(WebSocket.CLOSED);

      await handleMessage(
        mockSocket as unknown as WebSocket,
        "session1",
        Buffer.from(JSON.stringify({ action: "health" }))
      );

      expect(mockSocket.send).not.toHaveBeenCalled();
    });
  });
});
