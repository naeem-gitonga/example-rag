import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock the AWS SDK
const mockSend = jest.fn<() => Promise<{ Payload?: Uint8Array }>>();

jest.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  InvokeCommand: jest.fn(),
}));

describe("lambdaClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe("invokeLambda", () => {
    it("should invoke ingestion lambda with correct payload", async () => {
      mockSend.mockResolvedValue({
        Payload: Buffer.from(
          JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({ id: "123", message: "Entry ingested successfully" }),
          })
        ),
      });

      const { invokeLambda } = await import("../lambdaClient.js");
      const result = await invokeLambda("ingestion", {
        action: "ingest",
        body: { text: "test", entry_date: "2024-01-15" },
      });

      expect(result).toEqual({
        statusCode: 200,
        data: { id: "123", message: "Entry ingested successfully" },
      });
    });

    it("should invoke query lambda with correct payload", async () => {
      mockSend.mockResolvedValue({
        Payload: Buffer.from(
          JSON.stringify({
            statusCode: 200,
            body: JSON.stringify({ results: [{ text: "result" }] }),
          })
        ),
      });

      const { invokeLambda } = await import("../lambdaClient.js");
      const result = await invokeLambda("query", {
        action: "query",
        body: { query: "test query", limit: 5 },
      });

      expect(result).toEqual({
        statusCode: 200,
        data: { results: [{ text: "result" }] },
      });
    });

    it("should throw error for unknown service", async () => {
      const { invokeLambda } = await import("../lambdaClient.js");

      await expect(
        invokeLambda("unknown" as "ingestion", { action: "test" })
      ).rejects.toThrow("Unknown Lambda service: unknown");
    });

    it("should throw error when no response payload", async () => {
      mockSend.mockResolvedValue({});

      const { invokeLambda } = await import("../lambdaClient.js");

      await expect(
        invokeLambda("ingestion", { action: "health" })
      ).rejects.toThrow("No response from Lambda");
    });

    it("should return raw payload when no body field", async () => {
      mockSend.mockResolvedValue({
        Payload: Buffer.from(JSON.stringify({ status: "ok" })),
      });

      const { invokeLambda } = await import("../lambdaClient.js");
      const result = await invokeLambda("ingestion", { action: "health" });

      expect(result).toEqual({ status: "ok" });
    });
  });
});
