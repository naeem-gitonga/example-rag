import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock the shared modules before importing
jest.unstable_mockModule("@shared/db/connection", () => ({
  getTable: jest.fn<any>(),
}));

jest.unstable_mockModule("@shared/db/operations", () => ({
  addEntry: jest.fn<any>(),
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
const { addEntry } = await import("@shared/db/operations");
const { getEmbedding } = await import("@shared/services/embedding");
const { ingest } = await import("./ingestion.service");

const mockGetTable = getTable as jest.MockedFunction<typeof getTable>;
const mockAddEntry = addEntry as jest.MockedFunction<typeof addEntry>;
const mockGetEmbedding = getEmbedding as jest.MockedFunction<typeof getEmbedding>;

describe("ingestion.service", () => {
  const mockTable = { add: jest.fn<any>(), search: jest.fn<any>() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTable.mockResolvedValue(mockTable as any);
    mockAddEntry.mockResolvedValue("generated-id-123");
    mockGetEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
  });

  describe("ingest", () => {
    it("should return 400 when entry_date is missing", async () => {
      const result = await ingest({
        text: "some text",
        moods: [],
      } as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "entry_date and text are required",
      });
    });

    it("should return 400 when text is missing", async () => {
      const result = await ingest({
        entry_date: "2024-01-15",
        moods: [],
      } as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "entry_date and text are required",
      });
    });

    it("should successfully ingest an entry", async () => {
      const result = await ingest({
        entry_date: "2024-01-15",
        text: "Today was a good day",
        moods: ["happy", "calm"],
      });

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        id: "generated-id-123",
        message: "Entry ingested successfully",
      });
    });

    it("should call getTable with createIfMissing=true", async () => {
      await ingest({
        entry_date: "2024-01-15",
        text: "Test entry",
        moods: [],
      });

      expect(mockGetTable).toHaveBeenCalledWith(true);
    });

    it("should call getEmbedding with correct URL and text", async () => {
      await ingest({
        entry_date: "2024-01-15",
        text: "Test entry for embedding",
        moods: [],
      });

      expect(mockGetEmbedding).toHaveBeenCalledWith(
        "http://embedding:8001",
        "Test entry for embedding"
      );
    });

    it("should call addEntry with correct parameters", async () => {
      await ingest({
        entry_date: "2024-01-15",
        text: "Four words in text",
        moods: ["happy"],
        entry_id: "custom-entry-id",
        chunk_index: 2,
      });

      expect(mockAddEntry).toHaveBeenCalledWith(mockTable, {
        entryId: "custom-entry-id",
        entryDate: "2024-01-15",
        chunkIndex: 2,
        text: "Four words in text",
        vector: [0.1, 0.2, 0.3],
        moods: ["happy"],
        wordCount: 4,
      });
    });

    it("should use default chunk_index of 0 when not provided", async () => {
      await ingest({
        entry_date: "2024-01-15",
        text: "Test entry",
        moods: [],
      });

      expect(mockAddEntry).toHaveBeenCalledWith(
        mockTable,
        expect.objectContaining({
          chunkIndex: 0,
        })
      );
    });

    it("should use empty moods array when not provided", async () => {
      await ingest({
        entry_date: "2024-01-15",
        text: "Test entry",
      } as any);

      expect(mockAddEntry).toHaveBeenCalledWith(
        mockTable,
        expect.objectContaining({
          moods: [],
        })
      );
    });

    it("should calculate word count correctly", async () => {
      await ingest({
        entry_date: "2024-01-15",
        text: "One two three four five six",
        moods: [],
      });

      expect(mockAddEntry).toHaveBeenCalledWith(
        mockTable,
        expect.objectContaining({
          wordCount: 6,
        })
      );
    });
  });
});
