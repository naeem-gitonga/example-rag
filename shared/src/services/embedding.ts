interface EmbedResponse {
  embeddings: number[][];
  dimension: number;
  normalized: boolean;
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

  const data: EmbedResponse = await response.json();
  // The API returns embeddings as array of arrays; we want the first one
  return data.embeddings[0];
}
