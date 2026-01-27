import { APIGatewayProxyEvent } from "aws-lambda";

export interface JournalEntry {
  [key: string]: unknown;
  id: string;
  entry_id: string;  // Empty string if not set (LanceDB doesn't handle null well)
  entry_date: string;
  chunk_index: number;
  text: string;
  vector: number[];
  moods: string[];
  word_count: number;
}

export interface AddEntryParams {
  entryId?: string;
  entryDate: string;
  chunkIndex: number;
  text: string;
  vector: number[];
  moods: string[];
  wordCount: number;
}

export interface SearchResult {
  id: string;
  entry_id: string;
  entry_date: string;
  text: string;
  moods: string[];
  score: number;
}

// Ingestion types
export interface IngestBody {
  action?: string;
  entry_date: string;
  text: string;
  moods: string[];
  entry_id?: string;
  chunk_index?: number;
}

export interface IngestEvent extends Omit<APIGatewayProxyEvent, "body"> {
  action?: string;
  body: string | IngestBody | null;
}

// Query types
export interface QueryBody {
  action?: string;
  query: string;
  limit?: number;
}

export interface QueryEvent extends Omit<APIGatewayProxyEvent, "body"> {
  action?: string;
  body: string | QueryBody | null;
}