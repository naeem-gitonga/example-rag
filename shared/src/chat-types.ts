// Chat types (MongoDB schema aligned)
// These types are safe to import in browser environments

export interface RagContext {
  entry_id: string;
  entry_date: string;
  text_snippet: string;
  score: number;
}

export interface ChatMessage {
  message_id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: Date;
  rag_context?: RagContext[] | null;
}

export interface ChatSession {
  session_id: string;
  user_id?: string | null;
  title?: string | null;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, unknown>;
}

// WebSocket message types
export type ChatAction = "chat" | "query" | "ingest" | "health" | "error";

export interface WebSocketChatMessage {
  action: ChatAction;
  session_id?: string;
  message_id?: string;
  content?: string;
  role?: "user" | "assistant";
  rag_context?: RagContext[];
  error?: string;
}
