import { UploadStatus } from './types';
import styles from './DocumentUpload.module.scss';

const { statusMessage } = styles;

export interface StatusMessageProps {
  status: UploadStatus | null;
}

export function StatusMessage({ status }: StatusMessageProps) {
  if (!status) return null;

  return (
    <div className={`${statusMessage} ${styles[status.status]}`}>
      {status.status === 'uploading' && 'Saving...'}
      {status.status === 'success' && status.message}
      {status.status === 'error' && status.message}
    </div>
  );
}
