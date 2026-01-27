import { forwardRef } from 'react';
import styles from './DocumentUpload.module.scss';

const {
  dropzone,
  dragging,
  fileInput,
  dropzoneContent,
  dropzoneIcon,
  dropzoneText,
  dropzoneHint,
} = styles;

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
    { isDragging: isDraggingState, onDragOver, onDragLeave, onDrop, onClick, onFileSelect, accept = '.txt,.md' },
    ref
  ) {
    return (
      <div
        className={`${dropzone} ${isDraggingState ? dragging : ''}`}
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
          className={fileInput}
          accept={accept}
        />
        <div className={dropzoneContent}>
          <span className={dropzoneIcon}>📁</span>
          <p className={dropzoneText}>
            Drag and drop files here, or click to select
          </p>
          <p className={dropzoneHint}>Supports TXT, MD files</p>
        </div>
      </div>
    );
  }
);
