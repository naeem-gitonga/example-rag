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
  service?: "ingestion" | "chat" | "llm";
}

interface ChatMessage {
  action: "chat";
  content: string;
  session_id?: string;
}

interface HistoryMessage {
  action: "history";
  session_id: string;
  limit?: number;
}

type ClientMessage = IngestMessage | QueryMessage | HealthMessage | ChatMessage | HistoryMessage;

interface RagContext {
  entry_id: string;
  entry_date: string;
  text_snippet: string;
  score: number;
}

interface RagResponse {
  session_id: string;
  user_message_id: string;
  system_prompt: string;
  rag_context: RagContext[];
}

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

      case "history":
        await handleHistory(socket, message);
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
  const response = await invokeLambda("chat", {
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

  // Step 1: Get RAG context from chat service (also saves user message)
  const ragResponse = await invokeLambda("chat", {
    action: "rag",
    body: {
      message: message.content,
      sessionId: chatSessionId,
    },
  });

  const ragData = ragResponse.data as RagResponse;
  const ragContext = ragData.rag_context || [];
  const systemPrompt = ragData.system_prompt;

  console.log(`[chat] RAG context: ${ragContext.length} entries`, ragContext.map(c => c.entry_date));

  // Step 2: Send stream start event
  sendResponse(socket, "chat_stream_start", {
    session_id: chatSessionId,
    rag_context: ragContext,
  });

  // Step 3: Stream LLM response
  const llmMessages: LLMChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message.content },
  ];

  let fullContent = "";

  try {
    let tokenCount = 0;
    for await (const token of streamChatCompletion({ messages: llmMessages })) {
      fullContent += token;
      tokenCount++;

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            action: "chat_stream_token",
            token,
            session_id: chatSessionId,
          })
        );
      }
    }
    console.log(`[chat] Streamed ${tokenCount} tokens`);

    // Step 4: Save assistant message to MongoDB
    await invokeLambda("chat", {
      action: "save_message",
      body: {
        sessionId: chatSessionId,
        content: fullContent,
        ragContext,
      },
    });

    // Step 5: Send stream end event
    console.log(`[chat] Sending stream end with ${ragContext.length} sources`);
    sendResponse(socket, "chat_stream_end", {
      session_id: chatSessionId,
      content: fullContent,
      role: "assistant",
      rag_context: ragContext,
    });
  } catch (error) {
    sendResponse(socket, "chat_stream_error", {
      session_id: chatSessionId,
      error: error instanceof Error ? error.message : "Stream error",
      partial_content: fullContent,
    });
  }
}

async function handleHistory(socket: WebSocket, message: HistoryMessage): Promise<void> {
  const response = await invokeLambda("chat", {
    action: "history",
    body: {
      sessionId: message.session_id,
      limit: message.limit,
    },
  });

  sendResponse(socket, "history", response.data);
}

function sendResponse(socket: WebSocket, action: string, data: unknown): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action, ...data as object }));
  }
}

function sendError(socket: WebSocket, error: string): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "error", error }));
  }
}
