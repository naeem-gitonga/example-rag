import { forwardRef } from 'react';
import styles from './DocumentUpload.module.scss';

export interface DropZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
}

export const DropZone = forwardRef<HTMLInputElement, DropZoneProps>(
  function DropZone(
    { isDragging, onDragOver, onDragLeave, onDrop, onClick, onFileSelect, accept = '.txt,.md' },
    ref
  ) {
    return (
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
      >
        <input
          ref={ref}
          type="file"
          multiple
          onChange={onFileSelect}
          className={styles.fileInput}
          accept={accept}
        />
        <div className={styles.dropzoneContent}>
          <span className={styles.dropzoneIcon}>📁</span>
          <p className={styles.dropzoneText}>
            Drag and drop files here, or click to select
          </p>
          <p className={styles.dropzoneHint}>Supports TXT, MD files</p>
        </div>
      </div>
    );
  }
);
