'use client';

import { useFileUpload } from './hooks/useFileUpload';
import { TopicSelector } from './TopicSelector';
import { DateInput } from './DateInput';
import { DropZone } from './DropZone';
import { FileList } from './FileList';
import styles from './DocumentUpload.module.scss';

const { fileUploadForm, formRow } = styles;

export function FileUploadForm() {
  const {
    files,
    uploadStatuses,
    isDragging,
    fileDate,
    setFileDate,
    fileTopics,
    toggleTopic,
    customTopics,
    addCustomTopic,
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
    <div className={fileUploadForm}>
      <div className={formRow}>
        <DateInput
          value={fileDate}
          onChange={setFileDate}
          label="Entry Date (for all files)"
        />
      </div>

      <TopicSelector
        selectedTopics={fileTopics}
        onToggle={toggleTopic}
        customTopics={customTopics}
        onAddCustomTopic={addCustomTopic}
        label="Topics (for all files)"
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
