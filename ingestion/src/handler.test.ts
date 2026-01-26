import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock the shared modules before importing
jest.unstable_mockModule("@shared/db/connection", () => ({
  initConnection: jest.fn<any>().mockResolvedValue({}),
  getTable: jest.fn<any>(),
}));

jest.unstable_mockModule("./services/ingestion.service", () => ({
  ingest: jest.fn<any>(),
}));

// Dynamic imports after mocking
const { ingest } = await import("./services/ingestion.service");
const { handler } = await import("./handler");

const mockIngest = ingest as jest.MockedFunction<typeof ingest>;

describe("handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIngest.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ id: "test-id", message: "Entry ingested successfully" }),
    });
  });

  describe("action routing", () => {
    it("should route to ingest when action is 'ingest'", async () => {
      const event = {
        action: "ingest",
        body: {
          entry_date: "2024-01-15",
          text: "Test entry",
          moods: [],
        },
      };

      const result = await handler(event as any);

      expect(mockIngest).toHaveBeenCalledWith({
        entry_date: "2024-01-15",
        text: "Test entry",
        moods: [],
      });
      expect(result.statusCode).toBe(200);
    });

    it("should route to ingest when action is in body", async () => {
      const event = {
        body: {
          action: "ingest",
          entry_date: "2024-01-15",
          text: "Test entry",
          moods: [],
        },
      };

      const result = await handler(event as any);

      expect(mockIngest).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
    });

    it("should parse stringified body", async () => {
      const event = {
        action: "ingest",
        body: JSON.stringify({
          entry_date: "2024-01-15",
          text: "Test entry",
          moods: ["happy"],
        }),
      };

      const result = await handler(event as any);

      expect(mockIngest).toHaveBeenCalledWith({
        entry_date: "2024-01-15",
        text: "Test entry",
        moods: ["happy"],
      });
      expect(result.statusCode).toBe(200);
    });

    it("should return health status when action is 'health'", async () => {
      const event = {
        action: "health",
        body: null,
      };

      const result = await handler(event as any);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        status: "ok",
        service: "ingestion",
      });
    });

    it("should return 400 for invalid action", async () => {
      const event = {
        action: "unknown",
        body: null,
      };

      const result = await handler(event as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "Invalid action. Use: ingest, health",
      });
    });

    it("should return 400 when no action is provided", async () => {
      const event = {
        body: {},
      };

      const result = await handler(event as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "Invalid action. Use: ingest, health",
      });
    });
  });

  describe("error handling", () => {
    it("should return 500 when ingest throws an error", async () => {
      mockIngest.mockRejectedValue(new Error("Database connection failed"));

      const event = {
        action: "ingest",
        body: {
          entry_date: "2024-01-15",
          text: "Test entry",
          moods: [],
        },
      };

      const result = await handler(event as any);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: "Internal server error",
        message: "Database connection failed",
      });
    });

    it("should handle non-Error objects thrown", async () => {
      mockIngest.mockRejectedValue("String error");

      const event = {
        action: "ingest",
        body: {
          entry_date: "2024-01-15",
          text: "Test entry",
          moods: [],
        },
      };

      const result = await handler(event as any);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: "Internal server error",
        message: "Unknown error",
      });
    });

    it("should handle null body", async () => {
      const event = {
        action: "health",
        body: null,
      };

      const result = await handler(event as any);

      expect(result.statusCode).toBe(200);
    });
  });
});
