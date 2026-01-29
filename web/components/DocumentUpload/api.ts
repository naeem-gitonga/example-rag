import { IngestPayload } from './types';

// Use local API route to avoid CORS issues (proxies to Lambda)
const INGESTION_API_URL = '/api/ingest';

export interface SubmitEntryParams {
  entryDate: string;
  text: string;
  topics: string[];
  entryId?: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
}

export async function submitEntry(params: SubmitEntryParams): Promise<ApiResponse> {
  const payload = {
    action: 'ingest',
    body: {
      entry_date: params.entryDate,
      text: params.text,
      topics: params.topics,
      ...(params.entryId && { entry_id: params.entryId }),
    },
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

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function submitFileContent(
  file: File,
  entryDate: string,
  topics: string[]
): Promise<ApiResponse> {
  const isPdf = file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const pdfBase64 = await fileToBase64(file);
    const payload = {
      action: 'ingest_pdf',
      body: {
        entry_date: entryDate,
        pdf_base64: pdfBase64,
        topics,
        entry_id: file.name,
        filename: file.name,
      },
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
      throw new Error(errorData.message || `PDF upload failed: ${response.statusText}`);
    }

    return { success: true };
  }

  // Text files (.txt, .md)
  const text = await file.text();
  return submitEntry({
    entryDate,
    text,
    topics,
    entryId: file.name,
  });
}
