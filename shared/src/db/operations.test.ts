import { jest, describe, it, expect } from "@jest/globals";
import { addEntry, searchSimilar } from "./operations";
import type { AddEntryParams } from "../types";

describe("operations", () => {
  describe("addEntry", () => {
    it("should add entry to table and return id", async () => {
      const mockTable = {
        add: jest.fn<(data: any[]) => Promise<void>>().mockResolvedValue(undefined),
      };

      const params: AddEntryParams = {
        entryDate: "2024-01-15",
        chunkIndex: 0,
        text: "Test document entry",
        vector: [0.1, 0.2, 0.3],
        topics: ["happy", "calm"],
        wordCount: 3,
      };

      const id = await addEntry(mockTable as any, params);

      expect(mockTable.add).toHaveBeenCalledTimes(1);
      expect(mockTable.add).toHaveBeenCalledWith([
        expect.objectContaining({
          id: expect.any(String),
          entry_id: "",
          entry_date: "2024-01-15",
          chunk_index: 0,
          text: "Test document entry",
          vector: [0.1, 0.2, 0.3],
          topics: ["happy", "calm"],
          word_count: 3,
        }),
      ]);
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("should use entryId when provided", async () => {
      const mockTable = {
        add: jest.fn<(data: any[]) => Promise<void>>().mockResolvedValue(undefined),
      };

      const params: AddEntryParams = {
        entryId: "custom-entry-id",
        entryDate: "2024-01-15",
        chunkIndex: 1,
        text: "Another entry",
        vector: [0.4, 0.5, 0.6],
        topics: ["anxious"],
        wordCount: 2,
      };

      await addEntry(mockTable as any, params);

      expect(mockTable.add).toHaveBeenCalledWith([
        expect.objectContaining({
          entry_id: "custom-entry-id",
          chunk_index: 1,
        }),
      ]);
    });

    it("should generate unique ids for each entry", async () => {
      const mockTable = {
        add: jest.fn<(data: any[]) => Promise<void>>().mockResolvedValue(undefined),
      };

      const params: AddEntryParams = {
        entryDate: "2024-01-15",
        chunkIndex: 0,
        text: "Test",
        vector: [0.1],
        topics: [],
        wordCount: 1,
      };

      const id1 = await addEntry(mockTable as any, params);
      const id2 = await addEntry(mockTable as any, params);

      expect(id1).not.toBe(id2);
    });
  });

  describe("searchSimilar", () => {
    it("should search table and return formatted results", async () => {
      const mockResults = [
        {
          id: "id1",
          entry_id: "entry1",
          entry_date: "2024-01-15",
          text: "First result",
          topics: ["happy"],
          _distance: 0.1,
        },
        {
          id: "id2",
          entry_id: null,
          entry_date: "2024-01-14",
          text: "Second result",
          topics: ["sad", "tired"],
          _distance: 0.2,
        },
      ];

      const mockSearch = {
        limit: jest.fn<any>().mockReturnThis(),
        toArray: jest.fn<any>().mockResolvedValue(mockResults),
      };

      const mockTable = {
        search: jest.fn<any>().mockReturnValue(mockSearch),
      };

      const queryVector = [0.1, 0.2, 0.3];
      const results = await searchSimilar(mockTable as any, queryVector, 5);

      expect(mockTable.search).toHaveBeenCalledWith(queryVector);
      expect(mockSearch.limit).toHaveBeenCalledWith(5);
      expect(results).toEqual([
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
          entry_id: null,
          entry_date: "2024-01-14",
          text: "Second result",
          topics: ["sad", "tired"],
          score: 0.2,
        },
      ]);
    });

    it("should handle missing topics with empty array", async () => {
      const mockResults = [
        {
          id: "id1",
          entry_id: null,
          entry_date: "2024-01-15",
          text: "No topics",
          topics: undefined,
          _distance: 0.5,
        },
      ];

      const mockSearch = {
        limit: jest.fn<any>().mockReturnThis(),
        toArray: jest.fn<any>().mockResolvedValue(mockResults),
      };

      const mockTable = {
        search: jest.fn<any>().mockReturnValue(mockSearch),
      };

      const results = await searchSimilar(mockTable as any, [0.1], 1);

      expect(results[0].topics).toEqual([]);
    });

    it("should handle missing _distance with 0", async () => {
      const mockResults = [
        {
          id: "id1",
          entry_id: null,
          entry_date: "2024-01-15",
          text: "No distance",
          topics: [],
        },
      ];

      const mockSearch = {
        limit: jest.fn<any>().mockReturnThis(),
        toArray: jest.fn<any>().mockResolvedValue(mockResults),
      };

      const mockTable = {
        search: jest.fn<any>().mockReturnValue(mockSearch),
      };

      const results = await searchSimilar(mockTable as any, [0.1], 1);

      expect(results[0].score).toBe(0);
    });

    it("should return empty array when no results", async () => {
      const mockSearch = {
        limit: jest.fn<any>().mockReturnThis(),
        toArray: jest.fn<any>().mockResolvedValue([]),
      };

      const mockTable = {
        search: jest.fn<any>().mockReturnValue(mockSearch),
      };

      const results = await searchSimilar(mockTable as any, [0.1], 5);

      expect(results).toEqual([]);
    });
  });
});
