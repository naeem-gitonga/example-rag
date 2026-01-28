import { jest, describe, it, expect } from "@jest/globals";

// Test cold start database connection failure (lines 9-10)
// This must be in a separate file because initConnection runs at module load time

jest.unstable_mockModule("@shared/db/connection", () => ({
  initConnection: jest.fn<any>().mockRejectedValue(new Error("Connection timeout")),
  getTable: jest.fn<any>(),
}));

jest.unstable_mockModule("./services/query.service", () => ({
  search: jest.fn<any>(),
}));

jest.unstable_mockModule("./services/chat.service", () => ({
  rag: jest.fn<any>(),
  saveMessage: jest.fn<any>(),
  getHistory: jest.fn<any>(),
}));

// Capture console.error
const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

// Import after mocking - this triggers the cold start initialization
const { handler } = await import("./handler");

describe("handler cold start", () => {
  it("should log error and continue when database connection fails on cold start", async () => {
    // The error should have been logged during module import
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to initialize database connection on cold start:",
      expect.any(Error)
    );

    // Handler should still work (health check doesn't need DB)
    const result = await handler({
      action: "health",
      body: null,
    } as any);

    expect(result.statusCode).toBe(200);
  });
});
