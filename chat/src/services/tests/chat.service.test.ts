import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Mock all dependencies before importing the module under test
jest.unstable_mockModule("@shared/db/connection", () => ({
  getTable: jest.fn<any>(),
}));

jest.unstable_mockModule("@shared/db/operations", () => ({
  searchSimilar: jest.fn<any>(),
}));

jest.unstable_mockModule("@shared/db/mongo-connection", () => ({
  getMongoDb: jest.fn<any>(),
}));

jest.unstable_mockModule("@shared/db/mongo-operations", () => ({
  getOrCreateSession: jest.fn<any>(),
  createMessage: jest.fn<any>(),
  getSessionMessages: jest.fn<any>(),
}));

jest.unstable_mockModule("@shared/services/embedding", () => ({
  getEmbedding: jest.fn<any>(),
}));

jest.unstable_mockModule("@shared/config", () => ({
  loadConfig: jest.fn<any>().mockReturnValue({
    embeddingServiceUrl: "http://embedding:8001",
  }),
}));

// Dynamic imports after mocking
const { getTable } = await import("@shared/db/connection");
const { searchSimilar } = await import("@shared/db/operations");
const { getMongoDb } = await import("@shared/db/mongo-connection");
const { getOrCreateSession, createMessage, getSessionMessages } = await import(
  "@shared/db/mongo-operations"
);
const { getEmbedding } = await import("@shared/services/embedding");
const { rag, saveMessage, getHistory } = await import("../chat.service");

// Type the mocks
const mockGetTable = getTable as jest.MockedFunction<typeof getTable>;
const mockSearchSimilar = searchSimilar as jest.MockedFunction<typeof searchSimilar>;
const mockGetMongoDb = getMongoDb as jest.MockedFunction<typeof getMongoDb>;
const mockGetOrCreateSession = getOrCreateSession as jest.MockedFunction<typeof getOrCreateSession>;
const mockCreateMessage = createMessage as jest.MockedFunction<typeof createMessage>;
const mockGetSessionMessages = getSessionMessages as jest.MockedFunction<typeof getSessionMessages>;
const mockGetEmbedding = getEmbedding as jest.MockedFunction<typeof getEmbedding>;

describe("chat.service", () => {
  const mockDb = {} as any;
  const mockTable = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMongoDb.mockResolvedValue(mockDb);
    mockGetTable.mockResolvedValue(mockTable);
    mockGetEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockGetOrCreateSession.mockResolvedValue({
      session_id: "session-123",
      created_at: new Date(),
      updated_at: new Date(),
    });
    mockCreateMessage.mockResolvedValue({
      message_id: "msg-456",
      session_id: "session-123",
      role: "user",
      content: "test message",
      created_at: new Date(),
    });
    mockSearchSimilar.mockResolvedValue([]);
  });

  describe("rag", () => {
    it("should return 400 when message is missing", async () => {
      const result = await rag({} as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ error: "message is required" });
    });

    it("should return 400 when message is empty string", async () => {
      const result = await rag({ message: "" } as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ error: "message is required" });
    });

    it("should create session and save user message", async () => {
      const result = await rag({
        message: "Hello",
        sessionId: "test-session",
      });

      expect(mockGetOrCreateSession).toHaveBeenCalledWith(mockDb, "test-session");
      expect(mockCreateMessage).toHaveBeenCalledWith(mockDb, {
        sessionId: "session-123",
        role: "user",
        content: "Hello",
      });
      expect(result.statusCode).toBe(200);
    });

    it("should perform RAG search and return context", async () => {
      mockSearchSimilar.mockResolvedValue([
        {
          id: "entry-1",
          entry_id: "entry-1",
          entry_date: "2024-01-15",
          text: "Today I went to the park",
          score: 0.5,
          moods: ["happy"],
        },
      ]);

      const result = await rag({ message: "What did I do?" });
      const body = JSON.parse(result.body);

      expect(mockGetEmbedding).toHaveBeenCalledWith("http://embedding:8001", "What did I do?");
      expect(mockSearchSimilar).toHaveBeenCalledWith(mockTable, [0.1, 0.2, 0.3], 3);
      expect(body.rag_context).toHaveLength(1);
      expect(body.rag_context[0]).toEqual({
        entry_id: "entry-1",
        entry_date: "2024-01-15",
        text_snippet: "Today I went to the park",
        score: 0.5,
      });
    });

    it("should return empty context when no results found", async () => {
      mockSearchSimilar.mockResolvedValue([]);

      const result = await rag({ message: "Random question" });
      const body = JSON.parse(result.body);

      expect(body.rag_context).toEqual([]);
      expect(body.system_prompt).toContain("no relevant journal entries were found");
    });

    it("should handle getTable error gracefully (no data ingested)", async () => {
      mockGetTable.mockRejectedValue(new Error("Table not found"));

      const result = await rag({ message: "Hello" });
      const body = JSON.parse(result.body);

      expect(result.statusCode).toBe(200);
      expect(body.rag_context).toEqual([]);
    });

    it("should build system prompt with journal entries when context exists", async () => {
      mockSearchSimilar.mockResolvedValue([
        {
          id: "1",
          entry_id: "1",
          entry_date: "2024-01-15",
          text: "Had a great day",
          score: 0.3,
          moods: [],
        },
      ]);

      const result = await rag({ message: "How was my day?" });
      const body = JSON.parse(result.body);

      expect(body.system_prompt).toContain("Relevant journal entries:");
      expect(body.system_prompt).toContain("[2024-01-15] Had a great day");
    });

    it("should return session_id and user_message_id", async () => {
      const result = await rag({ message: "Test" });
      const body = JSON.parse(result.body);

      expect(body.session_id).toBe("session-123");
      expect(body.user_message_id).toBe("msg-456");
      expect(body.action).toBe("rag");
    });
  });

  describe("saveMessage", () => {
    it("should return 400 when sessionId is missing", async () => {
      const result = await saveMessage({ content: "Hello" } as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "sessionId and content are required",
      });
    });

    it("should return 400 when content is missing", async () => {
      const result = await saveMessage({ sessionId: "session-123" } as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "sessionId and content are required",
      });
    });

    it("should return 400 when both are missing", async () => {
      const result = await saveMessage({} as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: "sessionId and content are required",
      });
    });

    it("should save assistant message with ragContext", async () => {
      const ragContext = [
        { entry_id: "1", entry_date: "2024-01-15", text_snippet: "test", score: 0.5 },
      ];

      mockCreateMessage.mockResolvedValue({
        message_id: "assistant-msg-789",
        session_id: "session-123",
        role: "assistant",
        content: "Here is my response",
        created_at: new Date(),
        rag_context: ragContext,
      });

      const result = await saveMessage({
        sessionId: "session-123",
        content: "Here is my response",
        ragContext,
      });

      expect(mockCreateMessage).toHaveBeenCalledWith(mockDb, {
        sessionId: "session-123",
        role: "assistant",
        content: "Here is my response",
        ragContext,
      });
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.message_id).toBe("assistant-msg-789");
      expect(body.session_id).toBe("session-123");
      expect(body.action).toBe("save_message");
    });

    it("should save assistant message without ragContext", async () => {
      mockCreateMessage.mockResolvedValue({
        message_id: "msg-999",
        session_id: "session-123",
        role: "assistant",
        content: "Simple response",
        created_at: new Date(),
      });

      const result = await saveMessage({
        sessionId: "session-123",
        content: "Simple response",
      });

      expect(mockCreateMessage).toHaveBeenCalledWith(mockDb, {
        sessionId: "session-123",
        role: "assistant",
        content: "Simple response",
        ragContext: undefined,
      });
      expect(result.statusCode).toBe(200);
    });
  });

  describe("getHistory", () => {
    it("should return 400 when sessionId is missing", async () => {
      const result = await getHistory({} as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ error: "sessionId is required" });
    });

    it("should return messages for session", async () => {
      const mockMessages = [
        {
          message_id: "msg-1",
          session_id: "session-123",
          role: "user" as const,
          content: "Hello",
          created_at: new Date("2024-01-15T10:00:00Z"),
        },
        {
          message_id: "msg-2",
          session_id: "session-123",
          role: "assistant" as const,
          content: "Hi there!",
          created_at: new Date("2024-01-15T10:00:01Z"),
          rag_context: [{ entry_id: "1", entry_date: "2024-01-14", text_snippet: "test", score: 0.5 }],
        },
      ];
      mockGetSessionMessages.mockResolvedValue(mockMessages);

      const result = await getHistory({ sessionId: "session-123" });
      const body = JSON.parse(result.body);

      expect(mockGetSessionMessages).toHaveBeenCalledWith(mockDb, "session-123", 100);
      expect(body.action).toBe("history");
      expect(body.session_id).toBe("session-123");
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].message_id).toBe("msg-1");
      expect(body.messages[1].rag_context).toBeDefined();
    });

    it("should use default limit of 100", async () => {
      mockGetSessionMessages.mockResolvedValue([]);

      await getHistory({ sessionId: "session-123" });

      expect(mockGetSessionMessages).toHaveBeenCalledWith(mockDb, "session-123", 100);
    });

    it("should respect custom limit", async () => {
      mockGetSessionMessages.mockResolvedValue([]);

      await getHistory({ sessionId: "session-123", limit: 50 });

      expect(mockGetSessionMessages).toHaveBeenCalledWith(mockDb, "session-123", 50);
    });

    it("should return empty array when no messages exist", async () => {
      mockGetSessionMessages.mockResolvedValue([]);

      const result = await getHistory({ sessionId: "new-session" });
      const body = JSON.parse(result.body);

      expect(body.messages).toEqual([]);
    });
  });
});
