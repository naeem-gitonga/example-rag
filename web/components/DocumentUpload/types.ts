export type InputMode = 'text' | 'file';

export type UploadStatusType = 'pending' | 'uploading' | 'success' | 'error';

export interface UploadStatus {
  name: string;
  status: UploadStatusType;
  message?: string;
}

export const DEFAULT_TOPICS = [
  'science',
  'physics',
  'art',
  'music',
  'painting',
  'technology',
  'security',
  'politics',
] as const;

export type Topic = (typeof DEFAULT_TOPICS)[number];

export interface IngestPayload {
  action: 'ingest';
  entry_date: string;
  text: string;
  topics: string[];
  entry_id?: string;
}
