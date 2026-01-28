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

jest.unstable_mockModule("./pdf.service", () => ({
  parsePdf: jest.fn<any>(),
}));

// Dynamic imports after mocking
const { getTable } = await import("@shared/db/connection");
const { addEntry } = await import("@shared/db/operations");
const { getEmbedding } = await import("@shared/services/embedding");
const { parsePdf } = await import("./pdf.service");
const { ingest, ingestPdf } = await import("./ingestion.service");

const mockGetTable = getTable as jest.MockedFunction<typeof getTable>;
const mockAddEntry = addEntry as jest.MockedFunction<typeof addEntry>;
const mockGetEmbedding = getEmbedding as jest.MockedFunction<typeof getEmbedding>;
const mockParsePdf = parsePdf as jest.MockedFunction<typeof parsePdf>;

describe("ingestion.service", () => {
  const mockTable = { add: jest.fn<any>(), search: jest.fn<any>() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTable.mockResolvedValue(mockTable as any);
    mockAddEntry.mockResolvedValue("generated-id-123");
    mockGetEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockParsePdf.mockResolvedValue({ text: "Extracted PDF text content", numPages: 2 });
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

  describe("ingestPdf", () => {
    it("should return 400 when entry_date is missing", async () => {
      const result = await ingestPdf({
        pdf_base64: "JVBERi0xLjQ=",
        moods: [],
      } as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "entry_date and pdf_base64 are required",
      });
    });

    it("should return 400 when pdf_base64 is missing", async () => {
      const result = await ingestPdf({
        entry_date: "2024-01-15",
        moods: [],
      } as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "entry_date and pdf_base64 are required",
      });
    });

    it("should return 400 when PDF contains no text", async () => {
      mockParsePdf.mockResolvedValue({ text: "   ", numPages: 1 });

      const result = await ingestPdf({
        entry_date: "2024-01-15",
        pdf_base64: "JVBERi0xLjQ=",
        moods: [],
      });

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "PDF contains no extractable text",
      });
    });

    it("should successfully ingest a PDF", async () => {
      const result = await ingestPdf({
        entry_date: "2024-01-15",
        pdf_base64: "JVBERi0xLjQ=",
        moods: ["focused"],
        filename: "document.pdf",
      });

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.id).toBe("generated-id-123");
      expect(body.message).toBe("PDF ingested successfully");
      expect(body.pages).toBe(2);
      expect(body.characters).toBe(26);
    });

    it("should call parsePdf with the base64 data", async () => {
      await ingestPdf({
        entry_date: "2024-01-15",
        pdf_base64: "JVBERi0xLjQ=",
        moods: [],
      });

      expect(mockParsePdf).toHaveBeenCalledWith("JVBERi0xLjQ=");
    });

    it("should call getEmbedding with extracted text", async () => {
      await ingestPdf({
        entry_date: "2024-01-15",
        pdf_base64: "JVBERi0xLjQ=",
        moods: [],
      });

      expect(mockGetEmbedding).toHaveBeenCalledWith(
        "http://embedding:8001",
        "Extracted PDF text content"
      );
    });

    it("should call addEntry with correct parameters", async () => {
      await ingestPdf({
        entry_date: "2024-01-15",
        pdf_base64: "JVBERi0xLjQ=",
        moods: ["focused"],
        entry_id: "custom-id",
        filename: "report.pdf",
      });

      expect(mockAddEntry).toHaveBeenCalledWith(mockTable, {
        entryId: "custom-id",
        entryDate: "2024-01-15",
        chunkIndex: 0,
        text: "Extracted PDF text content",
        vector: [0.1, 0.2, 0.3],
        moods: ["focused"],
        wordCount: 4,
      });
    });

    it("should use filename as entryId when entry_id not provided", async () => {
      await ingestPdf({
        entry_date: "2024-01-15",
        pdf_base64: "JVBERi0xLjQ=",
        moods: [],
        filename: "my-document.pdf",
      });

      expect(mockAddEntry).toHaveBeenCalledWith(
        mockTable,
        expect.objectContaining({
          entryId: "my-document.pdf",
        })
      );
    });

    it("should use empty moods array when not provided", async () => {
      await ingestPdf({
        entry_date: "2024-01-15",
        pdf_base64: "JVBERi0xLjQ=",
      } as any);

      expect(mockAddEntry).toHaveBeenCalledWith(
        mockTable,
        expect.objectContaining({
          moods: [],
        })
      );
    });
  });
});
