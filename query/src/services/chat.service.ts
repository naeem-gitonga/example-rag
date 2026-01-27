import { APIGatewayProxyResult } from "aws-lambda";
import { ChatBody } from "@shared/types";
import { RagContext } from "@shared/chat-types";
import { getTable } from "@shared/db/connection";
import { searchSimilar } from "@shared/db/operations";
import { getEmbedding } from "@shared/services/embedding";
import { loadConfig } from "@shared/config";

const config = loadConfig();

export async function chat(body: ChatBody): Promise<APIGatewayProxyResult> {
  if (!body.message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "message is required" }),
    };
  }

  const sessionId = body.sessionId || generateSessionId();

  // Perform RAG search
  const table = await getTable(false);
  const vector = await getEmbedding(config.embeddingServiceUrl, body.message);
  const results = await searchSimilar(table, vector, 3);

  // Build RAG context from search results
  const ragContext: RagContext[] = results.map((r) => ({
    entry_id: r.entry_id,
    entry_date: r.entry_date,
    text_snippet: r.text,
    score: r.score,
  }));

  // TODO: Call LLM service with context
  // For now, return a placeholder response with RAG context
  const content = ragContext.length > 0
    ? `Based on your journal entries, I found ${ragContext.length} relevant entries. LLM integration pending.`
    : "I couldn't find any relevant entries in your journal.";

  return {
    statusCode: 200,
    body: JSON.stringify({
      action: "chat",
      session_id: sessionId,
      message_id: generateMessageId(),
      role: "assistant",
      content,
      rag_context: ragContext,
    }),
  };
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
