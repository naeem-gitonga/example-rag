export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
}

interface ChatCompletionChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function getChatCompletion(
  llmServiceUrl: string,
  messages: ChatMessage[],
  options: Omit<ChatCompletionRequest, "messages"> = {},
  fetchDep = fetch
): Promise<string> {
  const response = await fetchDep(`${llmServiceUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      max_tokens: options.max_tokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM service error: ${response.status} - ${errorText}`);
  }

  const data: ChatCompletionResponse = await response.json();
  return data.choices[0]?.message?.content ?? "";
}
