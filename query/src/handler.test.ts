import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock the shared modules before importing
jest.unstable_mockModule("@shared/db/connection", () => ({
  initConnection: jest.fn<any>().mockResolvedValue({}),
  getTable: jest.fn<any>(),
}));

jest.unstable_mockModule("./services/query.service", () => ({
  search: jest.fn<any>(),
}));

// Dynamic imports after mocking
const { search } = await import("./services/query.service");
const { handler } = await import("./handler");

const mockSearch = search as jest.MockedFunction<typeof search>;

describe("handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ results: [] }),
    });
  });

  describe("action routing", () => {
    it("should route to search when action is 'query'", async () => {
      const event = {
        action: "query",
        body: {
          query: "How was my day?",
        },
      };

      const result = await handler(event as any);

      expect(mockSearch).toHaveBeenCalledWith({
        query: "How was my day?",
      });
      expect(result.statusCode).toBe(200);
    });

    it("should route to search when action is in body", async () => {
      const event = {
        body: {
          action: "query",
          query: "Test query",
        },
      };

      const result = await handler(event as any);

      expect(mockSearch).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
    });

    it("should parse stringified body", async () => {
      const event = {
        action: "query",
        body: JSON.stringify({
          query: "Test query",
          limit: 10,
        }),
      };

      const result = await handler(event as any);

      expect(mockSearch).toHaveBeenCalledWith({
        query: "Test query",
        limit: 10,
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
        service: "query",
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
        error: "Invalid action. Use: query, health",
      });
    });

    it("should return 400 when no action is provided", async () => {
      const event = {
        body: {},
      };

      const result = await handler(event as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "Invalid action. Use: query, health",
      });
    });
  });

  describe("error handling", () => {
    it("should return 500 when search throws an error", async () => {
      mockSearch.mockRejectedValue(new Error("Database connection failed"));

      const event = {
        action: "query",
        body: {
          query: "Test query",
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
      mockSearch.mockRejectedValue("String error");

      const event = {
        action: "query",
        body: {
          query: "Test query",
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
