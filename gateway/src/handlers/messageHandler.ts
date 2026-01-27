import WebSocket from "ws";
import { invokeLambda } from "../services/lambdaClient.js";
import { streamChatCompletion, type ChatMessage as LLMChatMessage } from "../services/llmClient.js";

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
  service?: "ingestion" | "query" | "llm";
}

interface ChatMessage {
  action: "chat";
  content: string;
  session_id?: string;
  stream?: boolean;
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

  if (service === "llm") {
    // Check LLM service health directly
    try {
      const { checkHealth } = await import("../services/llmClient.js");
      const health = await checkHealth();
      sendResponse(socket, "health", { service: "llm", statusCode: 200, data: health });
    } catch (error) {
      sendResponse(socket, "health", {
        service: "llm",
        statusCode: 503,
        data: { error: error instanceof Error ? error.message : "LLM service unavailable" },
      });
    }
    return;
  }

  const response = await invokeLambda(service, { action: "health" });
  sendResponse(socket, "health", { service, ...response });
}

async function handleChat(socket: WebSocket, sessionId: string, message: ChatMessage): Promise<void> {
  const chatSessionId = message.session_id ?? sessionId;
  const shouldStream = message.stream !== false; // Default to streaming

  // Step 1: Get RAG context from query service
  const ragResponse = await invokeLambda("query", {
    action: "chat",
    body: {
      message: message.content,
      sessionId: chatSessionId,
    },
  });

  // Extract RAG context from response
  const ragData = ragResponse.data as { rag_context?: unknown[] } | undefined;
  const ragContext = ragData?.rag_context || [];

  // Step 2: Build messages for LLM with RAG context
  const systemPrompt = buildSystemPrompt(ragContext);
  const llmMessages: LLMChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message.content },
  ];

  // Step 3: Stream or generate LLM response
  if (shouldStream) {
    await streamLLMResponse(socket, chatSessionId, llmMessages, ragContext);
  } else {
    await nonStreamingLLMResponse(socket, chatSessionId, llmMessages, ragContext);
  }
}

/**
 * Build system prompt with RAG context.
 */
function buildSystemPrompt(ragContext: unknown[]): string {
  const basePrompt = `You are a helpful assistant that answers questions about the user's journal entries.
Use the provided context from their journal to give personalized, relevant responses.
If the context doesn't contain relevant information, say so honestly.`;

  if (ragContext.length === 0) {
    return basePrompt + "\n\nNo relevant journal entries were found for this query.";
  }

  const contextStr = ragContext
    .map((ctx: unknown, i: number) => {
      const entry = ctx as { entry_date?: string; text_snippet?: string; score?: number };
      return `[${i + 1}] Date: ${entry.entry_date || "Unknown"}\n${entry.text_snippet || ""}`;
    })
    .join("\n\n");

  return `${basePrompt}\n\nRelevant journal entries:\n${contextStr}`;
}

/**
 * Stream LLM response tokens to WebSocket client.
 *
 * This is where SSE from LLM service gets proxied to WebSocket.
 * Each token is sent as a separate WebSocket message for real-time "typing" effect.
 */
async function streamLLMResponse(
  socket: WebSocket,
  sessionId: string,
  messages: LLMChatMessage[],
  ragContext: unknown[]
): Promise<void> {
  // Send stream start event
  sendResponse(socket, "chat_stream_start", {
    session_id: sessionId,
    rag_context: ragContext,
  });

  let fullContent = "";

  try {
    // Stream tokens from LLM service to WebSocket
    for await (const token of streamChatCompletion({ messages })) {
      fullContent += token;

      // Send each token to the client
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            action: "chat_stream_token",
            token,
            session_id: sessionId,
          })
        );
      }
    }

    // Send stream end event with full content
    sendResponse(socket, "chat_stream_end", {
      session_id: sessionId,
      content: fullContent,
      role: "assistant",
      rag_context: ragContext,
    });
  } catch (error) {
    // Send error event
    sendResponse(socket, "chat_stream_error", {
      session_id: sessionId,
      error: error instanceof Error ? error.message : "Stream error",
      partial_content: fullContent,
    });
  }
}

/**
 * Non-streaming LLM response (for clients that prefer complete responses).
 */
async function nonStreamingLLMResponse(
  socket: WebSocket,
  sessionId: string,
  messages: LLMChatMessage[],
  ragContext: unknown[]
): Promise<void> {
  const { chatCompletion } = await import("../services/llmClient.js");
  const content = await chatCompletion({ messages });

  sendResponse(socket, "chat", {
    session_id: sessionId,
    content,
    role: "assistant",
    rag_context: ragContext,
  });
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
