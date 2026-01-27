export type InputMode = 'text' | 'file';

export type UploadStatusType = 'pending' | 'uploading' | 'success' | 'error';

export interface UploadStatus {
  name: string;
  status: UploadStatusType;
  message?: string;
}

export const AVAILABLE_MOODS = [
  'happy',
  'sad',
  'anxious',
  'calm',
  'excited',
  'frustrated',
  'grateful',
  'hopeful',
  'tired',
  'motivated',
] as const;

export type Mood = (typeof AVAILABLE_MOODS)[number];

export interface IngestPayload {
  action: 'ingest';
  entry_date: string;
  text: string;
  moods: string[];
  entry_id?: string;
}
