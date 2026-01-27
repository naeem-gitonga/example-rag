import type { Db, Collection } from "mongodb";
import type { ChatSession, ChatMessage, RagContext } from "../chat-types";

const SESSIONS_COLLECTION = "sessions";
const MESSAGES_COLLECTION = "messages";

function getSessionsCollection(db: Db): Collection<ChatSession> {
  return db.collection<ChatSession>(SESSIONS_COLLECTION);
}

function getMessagesCollection(db: Db): Collection<ChatMessage> {
  return db.collection<ChatMessage>(MESSAGES_COLLECTION);
}

// Session operations

export interface CreateSessionParams {
  sessionId?: string;
  userId?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown>;
}

export async function createSession(
  db: Db,
  params: CreateSessionParams = {}
): Promise<ChatSession> {
  const collection = getSessionsCollection(db);
  const now = new Date();

  const session: ChatSession = {
    session_id: params.sessionId ?? crypto.randomUUID(),
    user_id: params.userId ?? null,
    title: params.title ?? null,
    created_at: now,
    updated_at: now,
    metadata: params.metadata ?? {},
  };

  await collection.insertOne(session);
  return session;
}

export async function getSession(
  db: Db,
  sessionId: string
): Promise<ChatSession | null> {
  const collection = getSessionsCollection(db);
  return collection.findOne({ session_id: sessionId });
}

export async function updateSessionTitle(
  db: Db,
  sessionId: string,
  title: string
): Promise<boolean> {
  const collection = getSessionsCollection(db);
  const result = await collection.updateOne(
    { session_id: sessionId },
    { $set: { title, updated_at: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function updateSessionTimestamp(
  db: Db,
  sessionId: string
): Promise<boolean> {
  const collection = getSessionsCollection(db);
  const result = await collection.updateOne(
    { session_id: sessionId },
    { $set: { updated_at: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function listSessions(
  db: Db,
  userId?: string | null,
  limit: number = 50
): Promise<ChatSession[]> {
  const collection = getSessionsCollection(db);
  const query = userId ? { user_id: userId } : {};
  return collection
    .find(query)
    .sort({ updated_at: -1 })
    .limit(limit)
    .toArray();
}

export async function deleteSession(
  db: Db,
  sessionId: string
): Promise<boolean> {
  const sessionsCollection = getSessionsCollection(db);
  const messagesCollection = getMessagesCollection(db);

  // Delete all messages in the session
  await messagesCollection.deleteMany({ session_id: sessionId });

  // Delete the session
  const result = await sessionsCollection.deleteOne({ session_id: sessionId });
  return result.deletedCount > 0;
}

// Message operations

export interface CreateMessageParams {
  messageId?: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  ragContext?: RagContext[] | null;
}

export async function createMessage(
  db: Db,
  params: CreateMessageParams
): Promise<ChatMessage> {
  const collection = getMessagesCollection(db);

  const message: ChatMessage = {
    message_id: params.messageId ?? crypto.randomUUID(),
    session_id: params.sessionId,
    role: params.role,
    content: params.content,
    created_at: new Date(),
    rag_context: params.ragContext ?? null,
  };

  await collection.insertOne(message);

  // Update session timestamp
  await updateSessionTimestamp(db, params.sessionId);

  return message;
}

export async function getMessage(
  db: Db,
  messageId: string
): Promise<ChatMessage | null> {
  const collection = getMessagesCollection(db);
  return collection.findOne({ message_id: messageId });
}

export async function getSessionMessages(
  db: Db,
  sessionId: string,
  limit: number = 100
): Promise<ChatMessage[]> {
  const collection = getMessagesCollection(db);
  return collection
    .find({ session_id: sessionId })
    .sort({ created_at: 1 })
    .limit(limit)
    .toArray();
}

export async function deleteMessage(
  db: Db,
  messageId: string
): Promise<boolean> {
  const collection = getMessagesCollection(db);
  const result = await collection.deleteOne({ message_id: messageId });
  return result.deletedCount > 0;
}

// Utility operations

export async function getOrCreateSession(
  db: Db,
  sessionId?: string,
  userId?: string | null
): Promise<ChatSession> {
  if (sessionId) {
    const existing = await getSession(db, sessionId);
    if (existing) {
      return existing;
    }
  }

  return createSession(db, {
    sessionId,
    userId,
  });
}
