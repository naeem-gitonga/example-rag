interface EmbeddingResponse {
  embedding: number[];
}

export async function getEmbedding(
  embeddingServiceUrl: string,
  text: string,
  fetchDep = fetch
): Promise<number[]> {
  const response = await fetchDep(`${embeddingServiceUrl}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Embedding service error: ${response.statusText}`);
  }

  const data: EmbeddingResponse = await response.json();
  return data.embedding;
}
