import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import type { Db } from "mongodb";
import {
  createSession,
  getSession,
  createMessage,
  getOrCreateSession,
} from "./mongo-operations";
import type { ChatSession } from "../chat-types";

function createMockDb() {
  const sessionsData: Map<string, ChatSession> = new Map();
  const messagesData: Map<string, any> = new Map();

  const sessionsCollection = {
    insertOne: jest.fn<any>().mockImplementation(async (doc: ChatSession) => {
      sessionsData.set(doc.session_id, doc);
      return { insertedId: "mock-id" };
    }),
    findOne: jest.fn<any>().mockImplementation(async (query: { session_id: string }) => {
      return sessionsData.get(query.session_id) ?? null;
    }),
    updateOne: jest.fn<any>().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: jest.fn<any>().mockResolvedValue({ deletedCount: 1 }),
    find: jest.fn<any>().mockReturnValue({
      sort: jest.fn<any>().mockReturnThis(),
      limit: jest.fn<any>().mockReturnThis(),
      toArray: jest.fn<any>().mockResolvedValue([]),
    }),
  };

  const messagesCollection = {
    insertOne: jest.fn<any>().mockImplementation(async (doc: any) => {
      messagesData.set(doc.message_id, doc);
      return { insertedId: "mock-id" };
    }),
    findOne: jest.fn<any>().mockImplementation(async (query: { message_id: string }) => {
      return messagesData.get(query.message_id) ?? null;
    }),
    deleteOne: jest.fn<any>().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: jest.fn<any>().mockResolvedValue({ deletedCount: 0 }),
    find: jest.fn<any>().mockReturnValue({
      sort: jest.fn<any>().mockReturnThis(),
      limit: jest.fn<any>().mockReturnThis(),
      toArray: jest.fn<any>().mockResolvedValue([]),
    }),
  };

  return {
    collection: jest.fn<any>().mockImplementation((name: string) => {
      if (name === "sessions") return sessionsCollection;
      if (name === "messages") return messagesCollection;
      throw new Error(`Unknown collection: ${name}`);
    }),
    _sessions: sessionsCollection,
    _messages: messagesCollection,
  } as unknown as Db & { _sessions: typeof sessionsCollection; _messages: typeof messagesCollection };
}

describe("mongo-operations", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("createSession", () => {
    it("creates a session with default values", async () => {
      const session = await createSession(mockDb);

      expect(session.session_id).toBeDefined();
      expect(session.user_id).toBeNull();
      expect(session.title).toBeNull();
      expect(session.created_at).toBeInstanceOf(Date);
      expect(session.updated_at).toBeInstanceOf(Date);
      expect(mockDb.collection).toHaveBeenCalledWith("sessions");
    });

    it("creates a session with custom values", async () => {
      const session = await createSession(mockDb, {
        sessionId: "custom-id",
        userId: "user-123",
        title: "Test Session",
      });

      expect(session.session_id).toBe("custom-id");
      expect(session.user_id).toBe("user-123");
      expect(session.title).toBe("Test Session");
    });
  });

  describe("getSession", () => {
    it("returns null when session not found", async () => {
      const result = await getSession(mockDb, "nonexistent");
      expect(result).toBeNull();
    });

    it("returns session when found", async () => {
      // First create a session
      await createSession(mockDb, { sessionId: "test-id", title: "Test" });

      const result = await getSession(mockDb, "test-id");
      expect(result?.session_id).toBe("test-id");
      expect(result?.title).toBe("Test");
    });
  });

  describe("createMessage", () => {
    it("creates a message and updates session timestamp", async () => {
      const message = await createMessage(mockDb, {
        sessionId: "session-1",
        role: "user",
        content: "Hello",
      });

      expect(message.message_id).toBeDefined();
      expect(message.session_id).toBe("session-1");
      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello");
      expect(message.created_at).toBeInstanceOf(Date);
      expect(mockDb.collection).toHaveBeenCalledWith("messages");
      expect(mockDb.collection).toHaveBeenCalledWith("sessions");
    });

    it("includes RAG context when provided", async () => {
      const ragContext = [
        { entry_id: "e1", entry_date: "2024-01-01", text_snippet: "test", score: 0.9 },
      ];

      const message = await createMessage(mockDb, {
        sessionId: "session-1",
        role: "assistant",
        content: "Response",
        ragContext,
      });

      expect(message.rag_context).toEqual(ragContext);
    });
  });

  describe("getOrCreateSession", () => {
    it("creates new session when sessionId not provided", async () => {
      const session = await getOrCreateSession(mockDb);
      expect(session.session_id).toBeDefined();
    });

    it("returns existing session when found", async () => {
      // First create a session
      const created = await createSession(mockDb, { sessionId: "existing-id", title: "Existing" });

      const session = await getOrCreateSession(mockDb, "existing-id");
      expect(session.session_id).toBe("existing-id");
      expect(session.title).toBe("Existing");
    });

    it("creates new session when sessionId provided but not found", async () => {
      const session = await getOrCreateSession(mockDb, "new-id");
      expect(session.session_id).toBe("new-id");
    });
  });
});
