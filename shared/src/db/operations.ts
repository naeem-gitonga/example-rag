import type { Table } from "@lancedb/lancedb";
import type { JournalEntry, AddEntryParams, SearchResult } from "../types";

export async function addEntry(
  table: Table,
  params: AddEntryParams
): Promise<string> {
  const id = crypto.randomUUID();

  const entry: JournalEntry = {
    id,
    entry_id: params.entryId ?? null,
    entry_date: params.entryDate,
    chunk_index: params.chunkIndex,
    text: params.text,
    vector: params.vector,
    moods: params.moods,
    word_count: params.wordCount,
  };

  await table.add([entry]);

  return id;
}

export async function searchSimilar(
  table: Table,
  queryVector: number[],
  limit: number
): Promise<SearchResult[]> {
  const results = await table
    .search(queryVector)
    .limit(limit)
    .toArray();

  return results.map((row: any) => ({
    id: row.id,
    entry_id: row.entry_id,
    entry_date: row.entry_date,
    text: row.text,
    moods: row.moods ?? [],
    score: row._distance ?? 0,
  }));
}
