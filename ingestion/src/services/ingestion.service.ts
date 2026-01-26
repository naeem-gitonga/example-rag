import { APIGatewayProxyResult } from "aws-lambda";
import { IngestBody } from "@shared/types";
import { getTable } from "@shared/db/connection";
import { addEntry } from "@shared/db/operations";
import { getEmbedding } from "@shared/services/embedding";
import { loadConfig } from "@shared/config";

const config = loadConfig();

export async function ingest(body: IngestBody): Promise<APIGatewayProxyResult> {
  if (!body.entry_date || !body.text) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "entry_date and text are required" }),
    };
  }

  const table = await getTable(true);
  const vector = await getEmbedding(config.embeddingServiceUrl, body.text);
  const wordCount = body.text.split(/\s+/).length;

  const id = await addEntry(table, {
    entryId: body.entry_id,
    entryDate: body.entry_date,
    chunkIndex: body.chunk_index ?? 0,
    text: body.text,
    vector,
    moods: body.moods ?? [],
    wordCount,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ id, message: "Entry ingested successfully" }),
  };
}
