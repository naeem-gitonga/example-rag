import { APIGatewayProxyResult } from "aws-lambda";
import { ChatBody, HistoryBody, RagBody, SaveMessageBody } from "@shared/types";
import { RagContext } from "@shared/chat-types";
import { getTable } from "@shared/db/connection";
import { searchSimilar } from "@shared/db/operations";
import { getMongoDb } from "@shared/db/mongo-connection";
import { getOrCreateSession, createMessage, getSessionMessages } from "@shared/db/mongo-operations";
import { getEmbedding } from "@shared/services/embedding";
import { loadConfig } from "@shared/config";

const config = loadConfig();

function buildSystemPrompt(ragContext: RagContext[]): string {
  if (ragContext.length === 0) {
    return `You are a helpful assistant for a personal journal application.
The user is asking a question, but no relevant journal entries were found.
Respond helpfully and suggest they might want to add more journal entries or rephrase their question.`;
  }

  const contextEntries = ragContext
    .map((ctx) => `[${ctx.entry_date}] ${ctx.text_snippet}`)
    .join("\n\n");

  return `You are a helpful assistant for a personal journal application.
Use the following journal entries to answer the user's question.
Be conversational and reference specific details from the entries when relevant.
If the entries don't contain enough information to answer, say so honestly.

Relevant journal entries:
${contextEntries}`;
}

export async function rag(body: RagBody): Promise<APIGatewayProxyResult> {
  if (!body.message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "message is required" }),
    };
  }

  // Get or create session in MongoDB
  const db = await getMongoDb();
  const session = await getOrCreateSession(db, body.sessionId);

  // Save user message
  const userMessage = await createMessage(db, {
    sessionId: session.session_id,
    role: "user",
    content: body.message,
  });

  // Perform RAG search (skip if no data ingested yet)
  let results: Awaited<ReturnType<typeof searchSimilar>> = [];
  try {
    const table = await getTable(false);
    const vector = await getEmbedding(config.embeddingServiceUrl, body.message);
    results = await searchSimilar(table, vector, 3);
    console.log(`[RAG] Query: "${body.message.substring(0, 50)}..." → ${results.length} results`);
    results.forEach((r, i) => console.log(`  [${i}] distance=${r.score.toFixed(3)} date=${r.entry_date}`));
  } catch (error) {
    console.log("No journal entries found, skipping RAG search");
  }

  // Build RAG context from search results
  const ragContext: RagContext[] = results.map((r) => ({
    entry_id: r.entry_id,
    entry_date: r.entry_date,
    text_snippet: r.text,
    score: r.score,
  }));

  // Build system prompt for gateway to use with LLM
  const systemPrompt = buildSystemPrompt(ragContext);

  return {
    statusCode: 200,
    body: JSON.stringify({
      action: "rag",
      session_id: session.session_id,
      user_message_id: userMessage.message_id,
      system_prompt: systemPrompt,
      rag_context: ragContext,
    }),
  };
}

export async function saveMessage(body: SaveMessageBody): Promise<APIGatewayProxyResult> {
  if (!body.sessionId || !body.content) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "sessionId and content are required" }),
    };
  }

  const db = await getMongoDb();

  const message = await createMessage(db, {
    sessionId: body.sessionId,
    role: "assistant",
    content: body.content,
    ragContext: body.ragContext,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      action: "save_message",
      message_id: message.message_id,
      session_id: body.sessionId,
    }),
  };
}

export async function getHistory(body: HistoryBody): Promise<APIGatewayProxyResult> {
  if (!body.sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "sessionId is required" }),
    };
  }

  const db = await getMongoDb();
  const messages = await getSessionMessages(db, body.sessionId, body.limit ?? 100);

  return {
    statusCode: 200,
    body: JSON.stringify({
      action: "history",
      session_id: body.sessionId,
      messages: messages.map((m) => ({
        message_id: m.message_id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
        rag_context: m.rag_context,
      })),
    }),
  };
}
