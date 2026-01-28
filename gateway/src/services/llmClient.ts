/**
 * LLM Service client with SSE streaming support.
 *
 * This client consumes Server-Sent Events from the LLM service and provides
 * an async generator interface for streaming tokens.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}

const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || "http://llm:8004";

/**
 * Stream chat completion tokens from the LLM service.
 *
 * Consumes SSE from LLM service and yields tokens as they arrive.
 * The gateway can forward these tokens to WebSocket clients in real-time.
 *
 * @param request - Chat completion request
 * @yields Token strings as they are generated
 */
export async function* streamChatCompletion(
  request: ChatCompletionRequest
): AsyncGenerator<string, void, unknown> {
  console.log("[LLM] Starting stream request...");

  const response = await fetch(`${LLM_SERVICE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      ...request,
      stream: true,
    }),
  });

  console.log("[LLM] Response status:", response.status);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM service error (${response.status}): ${error}`);
  }

  if (!response.body) {
    throw new Error("No response body from LLM service");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let tokenCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("[LLM] Stream done, total tokens:", tokenCount);
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events (separated by double newlines)
      const events = buffer.split("\n\n");
      buffer = events.pop() || ""; // Keep incomplete event in buffer

      for (const event of events) {
        if (!event.trim()) continue;

        // Parse SSE data lines
        for (const line of event.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            // End of stream
            if (data === "[DONE]") {
              console.log("[LLM] Received [DONE]");
              return;
            }

            try {
              const chunk: StreamChunk = JSON.parse(data);
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                tokenCount++;
                yield content;
              }
            } catch {
              // Skip malformed JSON
              console.warn("Failed to parse SSE chunk:", data);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Non-streaming chat completion.
 *
 * @param request - Chat completion request
 * @returns Complete response content
 */
export async function chatCompletion(
  request: ChatCompletionRequest
): Promise<string> {
  const response = await fetch(`${LLM_SERVICE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...request,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM service error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

/**
 * Check LLM service health.
 */
export async function checkHealth(): Promise<{
  status: string;
  model: string;
  model_loaded: boolean;
}> {
  const response = await fetch(`${LLM_SERVICE_URL}/health`);

  if (!response.ok) {
    throw new Error(`LLM health check failed: ${response.status}`);
  }

  return response.json();
}
