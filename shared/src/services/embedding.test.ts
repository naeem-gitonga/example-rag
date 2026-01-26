import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { getEmbedding } from "./embedding";

// Mock global fetch
const mockFetch = jest.fn<any>();
global.fetch = mockFetch as any;

describe("embedding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getEmbedding", () => {
    it("should call embedding service and return embedding", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn<any>().mockResolvedValue({ embedding: mockEmbedding }),
      });

      const result = await getEmbedding("http://embedding:8001", "test text");

      expect(mockFetch).toHaveBeenCalledWith("http://embedding:8001/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "test text" }),
      });
      expect(result).toEqual(mockEmbedding);
    });

    it("should throw error when response is not ok", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: "Service Unavailable",
      });

      await expect(
        getEmbedding("http://embedding:8001", "test text")
      ).rejects.toThrow("Embedding service error: Service Unavailable");
    });

    it("should handle different service URLs", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn<any>().mockResolvedValue({ embedding: [0.1] }),
      });

      await getEmbedding("http://localhost:3000", "text");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/embed",
        expect.any(Object)
      );
    });

    it("should handle empty text", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn<any>().mockResolvedValue({ embedding: [0.0, 0.0, 0.0] }),
      });

      const result = await getEmbedding("http://embedding:8001", "");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://embedding:8001/embed",
        expect.objectContaining({
          body: JSON.stringify({ text: "" }),
        })
      );
      expect(result).toEqual([0.0, 0.0, 0.0]);
    });

    it("should handle long text", async () => {
      const longText = "word ".repeat(1000);
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn<any>().mockResolvedValue({ embedding: [0.5] }),
      });

      await getEmbedding("http://embedding:8001", longText);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://embedding:8001/embed",
        expect.objectContaining({
          body: JSON.stringify({ text: longText }),
        })
      );
    });
  });
});
