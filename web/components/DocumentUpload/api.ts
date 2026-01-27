import { IngestPayload } from './types';

const INGESTION_API_URL = process.env.NEXT_PUBLIC_INGESTION_API_URL || 'http://localhost:8002';

export interface SubmitEntryParams {
  entryDate: string;
  text: string;
  moods: string[];
  entryId?: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
}

export async function submitEntry(params: SubmitEntryParams): Promise<ApiResponse> {
  const payload: IngestPayload = {
    action: 'ingest',
    entry_date: params.entryDate,
    text: params.text,
    moods: params.moods,
    ...(params.entryId && { entry_id: params.entryId }),
  };

  const response = await fetch(INGESTION_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Submit failed: ${response.statusText}`);
  }

  return { success: true };
}

export async function submitFileContent(
  file: File,
  entryDate: string,
  moods: string[]
): Promise<ApiResponse> {
  const text = await file.text();
  return submitEntry({
    entryDate,
    text,
    moods,
    entryId: file.name,
  });
}
