import { APIGatewayProxyResult } from "aws-lambda";
import { QueryBody } from "@shared/types";
import { getTable } from "@shared/db/connection";
import { searchSimilar } from "@shared/db/operations";
import { getEmbedding } from "@shared/services/embedding";
import { loadConfig } from "@shared/config";

const config = loadConfig();

export async function search(body: QueryBody): Promise<APIGatewayProxyResult> {
  if (!body.query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "query is required" }),
    };
  }

  const table = await getTable(false);
  const vector = await getEmbedding(config.embeddingServiceUrl, body.query);
  const limit = body.limit ?? 5;

  const results = await searchSimilar(table, vector, limit);

  return {
    statusCode: 200,
    body: JSON.stringify({ results }),
  };
}
