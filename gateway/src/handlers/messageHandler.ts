import WebSocket from "ws";
import { invokeLambda } from "../services/lambdaClient.js";

interface IngestMessage {
  action: "ingest";
  text: string;
  entry_date: string;
  moods?: string[];
  entry_id?: string;
  chunk_index?: number;
}

interface QueryMessage {
  action: "query";
  query: string;
  limit?: number;
}

interface HealthMessage {
  action: "health";
  service?: "ingestion" | "query";
}

interface ChatMessage {
  action: "chat";
  content: string;
  session_id?: string;
}

type ClientMessage = IngestMessage | QueryMessage | HealthMessage | ChatMessage;

function isValidMessage(data: unknown): data is ClientMessage {
  if (typeof data !== "object" || data === null) return false;
  const msg = data as Record<string, unknown>;
  return typeof msg.action === "string";
}

export async function handleMessage(
  socket: WebSocket,
  sessionId: string,
  data: WebSocket.RawData
): Promise<void> {
  let message: unknown;

  try {
    const str = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
    message = JSON.parse(str);
  } catch {
    sendError(socket, "Invalid JSON");
    return;
  }

  if (!isValidMessage(message)) {
    sendError(socket, "Invalid message format - action required");
    return;
  }

  console.log(`[session ${sessionId}] action: ${message.action}`);

  try {
    switch (message.action) {
      case "ingest":
        await handleIngest(socket, message);
        break;

      case "query":
        await handleQuery(socket, message);
        break;

      case "health":
        await handleHealth(socket, message);
        break;

      case "chat":
        await handleChat(socket, sessionId, message);
        break;

      default:
        sendError(socket, `Unknown action: ${(message as { action: string }).action}`);
    }
  } catch (error) {
    console.error(`[session ${sessionId}] error:`, error);
    sendError(socket, error instanceof Error ? error.message : "Internal error");
  }
}

async function handleIngest(socket: WebSocket, message: IngestMessage): Promise<void> {
  const response = await invokeLambda("ingestion", {
    action: "ingest",
    body: {
      text: message.text,
      entry_date: message.entry_date,
      moods: message.moods,
      entry_id: message.entry_id,
      chunk_index: message.chunk_index,
    },
  });

  sendResponse(socket, "ingest", response);
}

async function handleQuery(socket: WebSocket, message: QueryMessage): Promise<void> {
  const response = await invokeLambda("query", {
    action: "query",
    body: {
      query: message.query,
      limit: message.limit ?? 5,
    },
  });

  sendResponse(socket, "query", response);
}

async function handleHealth(socket: WebSocket, message: HealthMessage): Promise<void> {
  const service = message.service ?? "ingestion";
  const response = await invokeLambda(service, { action: "health" });
  sendResponse(socket, "health", { service, ...response });
}

async function handleChat(socket: WebSocket, sessionId: string, message: ChatMessage): Promise<void> {
  const response = await invokeLambda("query", {
    action: "chat",
    body: {
      message: message.content,
      sessionId: message.session_id ?? sessionId,
    },
  });

  sendResponse(socket, "chat", response);
}

function sendResponse(socket: WebSocket, action: string, data: unknown): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action, ...data as object }));
  }
}

function sendError(socket: WebSocket, error: string): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ error }));
  }
}
