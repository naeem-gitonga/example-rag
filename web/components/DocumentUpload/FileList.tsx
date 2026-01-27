import { UploadStatus } from './types';
import styles from './DocumentUpload.module.scss';

const {
  fileList,
  fileListHeader,
  fileListActions,
  secondaryButton,
  primaryButton,
  files: filesStyle,
  fileItem,
  fileInfo,
  fileName,
  fileSize,
  fileStatus,
  statusPending,
  statusUploading,
  statusSuccess,
  statusError,
  removeButton,
} = styles;

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
    <div className={fileList}>
      <div className={fileListHeader}>
        <h2>Selected Files ({files.length})</h2>
        <div className={fileListActions}>
          <button onClick={onClearCompleted} className={secondaryButton}>
            Clear Completed
          </button>
          <button onClick={onUploadAll} className={primaryButton}>
            Upload All
          </button>
        </div>
      </div>

      <ul className={filesStyle}>
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
    <li className={fileItem}>
      <div className={fileInfo}>
        <span className={fileName}>{file.name}</span>
        <span className={fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
      </div>
      <div className={fileStatus}>
        {status?.status === 'pending' && (
          <span className={statusPending}>Pending</span>
        )}
        {status?.status === 'uploading' && (
          <span className={statusUploading}>Uploading...</span>
        )}
        {status?.status === 'success' && (
          <span className={statusSuccess}>Uploaded</span>
        )}
        {status?.status === 'error' && (
          <span className={statusError}>{status.message}</span>
        )}
        {status?.status === 'pending' && (
          <button onClick={onRemove} className={removeButton}>
            Remove
          </button>
        )}
      </div>
    </li>
  );
}
