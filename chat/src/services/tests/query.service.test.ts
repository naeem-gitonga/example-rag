import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock the shared modules before importing
jest.unstable_mockModule("@shared/db/connection", () => ({
  getTable: jest.fn<any>(),
}));

jest.unstable_mockModule("@shared/db/operations", () => ({
  searchSimilar: jest.fn<any>(),
}));

jest.unstable_mockModule("@shared/services/embedding", () => ({
  getEmbedding: jest.fn<any>(),
}));

jest.unstable_mockModule("@shared/config", () => ({
  loadConfig: jest.fn().mockReturnValue({
    embeddingServiceUrl: "http://embedding:8001",
  }),
}));

// Dynamic imports after mocking
const { getTable } = await import("@shared/db/connection");
const { searchSimilar } = await import("@shared/db/operations");
const { getEmbedding } = await import("@shared/services/embedding");
const { search } = await import("../query.service");

const mockGetTable = getTable as jest.MockedFunction<typeof getTable>;
const mockSearchSimilar = searchSimilar as jest.MockedFunction<typeof searchSimilar>;
const mockGetEmbedding = getEmbedding as jest.MockedFunction<typeof getEmbedding>;

describe("query.service", () => {
  const mockTable = { add: jest.fn<any>(), search: jest.fn<any>() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTable.mockResolvedValue(mockTable as any);
    mockGetEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockSearchSimilar.mockResolvedValue([
      {
        id: "id1",
        entry_id: "entry1",
        entry_date: "2024-01-15",
        text: "First result",
        topics: ["happy"],
        score: 0.1,
      },
    ]);
  });

  describe("search", () => {
    it("should return 400 when query is missing", async () => {
      const result = await search({} as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "query is required",
      });
    });

    it("should return 400 when query is empty string", async () => {
      const result = await search({ query: "" } as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "query is required",
      });
    });

    it("should successfully search and return results", async () => {
      const result = await search({
        query: "How was my day?",
      });

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        results: [
          {
            id: "id1",
            entry_id: "entry1",
            entry_date: "2024-01-15",
            text: "First result",
            topics: ["happy"],
            score: 0.1,
          },
        ],
      });
    });

    it("should call getTable with createIfMissing=false", async () => {
      await search({ query: "test query" });

      expect(mockGetTable).toHaveBeenCalledWith(false);
    });

    it("should call getEmbedding with correct URL and query", async () => {
      await search({ query: "What happened yesterday?" });

      expect(mockGetEmbedding).toHaveBeenCalledWith(
        "http://embedding:8001",
        "What happened yesterday?"
      );
    });

    it("should call searchSimilar with correct parameters", async () => {
      await search({ query: "test query", limit: 10 });

      expect(mockSearchSimilar).toHaveBeenCalledWith(
        mockTable,
        [0.1, 0.2, 0.3],
        10
      );
    });

    it("should use default limit of 5 when not provided", async () => {
      await search({ query: "test query" });

      expect(mockSearchSimilar).toHaveBeenCalledWith(
        mockTable,
        [0.1, 0.2, 0.3],
        5
      );
    });

    it("should return empty results array when no matches found", async () => {
      mockSearchSimilar.mockResolvedValue([]);

      const result = await search({ query: "no matches" });

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        results: [],
      });
    });

    it("should return multiple results", async () => {
      mockSearchSimilar.mockResolvedValue([
        {
          id: "id1",
          entry_id: "entry1",
          entry_date: "2024-01-15",
          text: "First result",
          topics: ["happy"],
          score: 0.1,
        },
        {
          id: "id2",
          entry_id: "entry2",
          entry_date: "2024-01-14",
          text: "Second result",
          topics: ["calm"],
          score: 0.2,
        },
      ]);

      const result = await search({ query: "test" });

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.results).toHaveLength(2);
    });
  });
});
