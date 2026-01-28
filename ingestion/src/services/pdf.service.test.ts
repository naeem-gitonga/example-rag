import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Create mock instance methods for pdf-parse v2 API
const mockGetInfo = jest.fn<any>();
const mockGetText = jest.fn<any>();

// Mock PDFParse class matching v2 API
const MockPDFParse = jest.fn().mockImplementation(() => ({
  getInfo: mockGetInfo,
  getText: mockGetText,
}));

// Mock pdf-parse before importing
jest.unstable_mockModule("pdf-parse", () => ({
  PDFParse: MockPDFParse,
}));

const { parsePdf } = await import("./pdf.service");

describe("pdf.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInfo.mockResolvedValue({ total: 1 });
    mockGetText.mockResolvedValue({ text: "Default page text" });
  });

  describe("parsePdf", () => {
    it("should parse PDF and return text and page count", async () => {
      mockGetInfo.mockResolvedValue({ total: 3 });
      mockGetText.mockResolvedValue({ text: "Page 1 text\nPage 2 text\nPage 3 text" });

      const result = await parsePdf("JVBERi0xLjQ=");

      expect(result.text).toBe("Page 1 text\nPage 2 text\nPage 3 text");
      expect(result.numPages).toBe(3);
    });

    it("should convert base64 to buffer before parsing", async () => {
      mockGetInfo.mockResolvedValue({ total: 1 });
      mockGetText.mockResolvedValue({ text: "Test content" });

      await parsePdf("SGVsbG8gV29ybGQ="); // "Hello World" in base64

      expect(MockPDFParse).toHaveBeenCalledWith({ data: expect.any(Buffer) });
      const calledOptions = MockPDFParse.mock.calls[0][0] as { data: Buffer };
      expect(calledOptions.data.toString()).toBe("Hello World");
    });

    it("should handle empty PDF text", async () => {
      mockGetInfo.mockResolvedValue({ total: 1 });
      mockGetText.mockResolvedValue({ text: "   \n\n  " });

      const result = await parsePdf("JVBERi0xLjQ=");

      expect(result.text).toBe("");
      expect(result.numPages).toBe(1);
    });

    it("should propagate errors from pdf-parse getInfo", async () => {
      mockGetInfo.mockRejectedValue(new Error("Invalid PDF structure"));

      await expect(parsePdf("invalid-base64")).rejects.toThrow("Invalid PDF structure");
    });

    it("should call getInfo and getText", async () => {
      mockGetInfo.mockResolvedValue({ total: 1 });
      mockGetText.mockResolvedValue({ text: "Content" });

      await parsePdf("JVBERi0xLjQ=");

      expect(mockGetInfo).toHaveBeenCalled();
      expect(mockGetText).toHaveBeenCalled();
    });

    it("should return total pages from getInfo", async () => {
      mockGetInfo.mockResolvedValue({ total: 5 });
      mockGetText.mockResolvedValue({ text: "Page content" });

      const result = await parsePdf("JVBERi0xLjQ=");

      expect(result.numPages).toBe(5);
    });
  });
});
