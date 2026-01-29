import { APIGatewayProxyResult } from "aws-lambda";
import { IngestBody, IngestPdfBody } from "@shared/types";
import { getTable } from "@shared/db/connection";
import { addEntry } from "@shared/db/operations";
import { getEmbedding } from "@shared/services/embedding";
import { loadConfig } from "@shared/config";
import { parsePdf } from "./pdf.service";

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
    topics: body.topics ?? [],
    wordCount,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ id, message: "Entry ingested successfully" }),
  };
}

export async function ingestPdf(body: IngestPdfBody): Promise<APIGatewayProxyResult> {
  if (!body.entry_date || !body.pdf_base64) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "entry_date and pdf_base64 are required" }),
    };
  }

  // Parse PDF to extract text
  const { text, numPages } = await parsePdf(body.pdf_base64);

  if (!text.trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "PDF contains no extractable text" }),
    };
  }

  console.log(`[PDF] Parsed ${numPages} pages, ${text.length} characters`);

  const table = await getTable(true);
  const vector = await getEmbedding(config.embeddingServiceUrl, text);
  const wordCount = text.split(/\s+/).length;

  const id = await addEntry(table, {
    entryId: body.entry_id || body.filename,
    entryDate: body.entry_date,
    chunkIndex: 0,
    text,
    vector,
    topics: body.topics ?? [],
    wordCount,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      id,
      message: "PDF ingested successfully",
      pages: numPages,
      characters: text.length,
    }),
  };
}
