import { UploadStatus } from './types';
import styles from './DocumentUpload.module.scss';

export interface FileListProps {
  files: File[];
  statuses: UploadStatus[];
  onRemove: (index: number) => void;
  onUploadAll: () => void;
  onClearCompleted: () => void;
}

export function FileList({
  files,
  statuses,
  onRemove,
  onUploadAll,
  onClearCompleted,
}: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className={styles.fileList}>
      <div className={styles.fileListHeader}>
        <h2>Selected Files ({files.length})</h2>
        <div className={styles.fileListActions}>
          <button onClick={onClearCompleted} className={styles.secondaryButton}>
            Clear Completed
          </button>
          <button onClick={onUploadAll} className={styles.primaryButton}>
            Upload All
          </button>
        </div>
      </div>

      <ul className={styles.files}>
        {files.map((file, index) => (
          <FileListItem
            key={`${file.name}-${index}`}
            file={file}
            status={statuses[index]}
            onRemove={() => onRemove(index)}
          />
        ))}
      </ul>
    </div>
  );
}

interface FileListItemProps {
  file: File;
  status: UploadStatus | undefined;
  onRemove: () => void;
}

function FileListItem({ file, status, onRemove }: FileListItemProps) {
  return (
    <li className={styles.fileItem}>
      <div className={styles.fileInfo}>
        <span className={styles.fileName}>{file.name}</span>
        <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
      </div>
      <div className={styles.fileStatus}>
        {status?.status === 'pending' && (
          <span className={styles.statusPending}>Pending</span>
        )}
        {status?.status === 'uploading' && (
          <span className={styles.statusUploading}>Uploading...</span>
        )}
        {status?.status === 'success' && (
          <span className={styles.statusSuccess}>Uploaded</span>
        )}
        {status?.status === 'error' && (
          <span className={styles.statusError}>{status.message}</span>
        )}
        {status?.status === 'pending' && (
          <button onClick={onRemove} className={styles.removeButton}>
            Remove
          </button>
        )}
      </div>
    </li>
  );
}
