'use client';

import { useFileUpload } from './hooks/useFileUpload';
import { MoodSelector } from './MoodSelector';
import { DateInput } from './DateInput';
import { DropZone } from './DropZone';
import { FileList } from './FileList';
import styles from './DocumentUpload.module.scss';

export function FileUploadForm() {
  const {
    files,
    uploadStatuses,
    isDragging,
    fileDate,
    setFileDate,
    fileMoods,
    toggleMood,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removeFile,
    uploadAll,
    clearCompleted,
    openFileDialog,
  } = useFileUpload();

  return (
    <div className={styles.fileUploadForm}>
      <div className={styles.formRow}>
        <DateInput
          value={fileDate}
          onChange={setFileDate}
          label="Entry Date (for all files)"
        />
      </div>

      <MoodSelector
        selectedMoods={fileMoods}
        onToggle={toggleMood}
        label="Moods (for all files)"
      />

      <DropZone
        ref={fileInputRef}
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        onFileSelect={handleFileSelect}
      />

      <FileList
        files={files}
        statuses={uploadStatuses}
        onRemove={removeFile}
        onUploadAll={uploadAll}
        onClearCompleted={clearCompleted}
      />
    </div>
  );
}
