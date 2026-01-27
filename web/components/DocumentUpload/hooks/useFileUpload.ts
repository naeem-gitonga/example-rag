import { useState, useCallback, useRef } from 'react';
import { UploadStatus } from '../types';
import { submitFileContent } from '../api';

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export interface UseFileUploadReturn {
  files: File[];
  uploadStatuses: UploadStatus[];
  isDragging: boolean;
  fileDate: string;
  setFileDate: (date: string) => void;
  fileMoods: string[];
  toggleMood: (mood: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
  uploadAll: () => Promise<void>;
  clearCompleted: () => void;
  openFileDialog: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileMoods, setFileMoods] = useState<string[]>([]);
  const [fileDate, setFileDate] = useState(getTodayDate);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleMood = useCallback((mood: string) => {
    setFileMoods((current) =>
      current.includes(mood)
        ? current.filter((m) => m !== mood)
        : [...current, mood]
    );
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setUploadStatuses((prev) => [
      ...prev,
      ...newFiles.map((file) => ({
        name: file.name,
        status: 'pending' as const,
      })),
    ]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  }, [addFiles]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadStatuses((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadAll = useCallback(async () => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      setUploadStatuses((prev) =>
        prev.map((status, index) =>
          index === i ? { ...status, status: 'uploading' } : status
        )
      );

      try {
        await submitFileContent(file, fileDate, fileMoods);

        setUploadStatuses((prev) =>
          prev.map((status, index) =>
            index === i
              ? { ...status, status: 'success', message: 'Uploaded successfully' }
              : status
          )
        );
      } catch (error) {
        setUploadStatuses((prev) =>
          prev.map((status, index) =>
            index === i
              ? {
                  ...status,
                  status: 'error',
                  message: error instanceof Error ? error.message : 'Upload failed',
                }
              : status
          )
        );
      }
    }
  }, [files, fileDate, fileMoods]);

  const clearCompleted = useCallback(() => {
    const pendingIndices = uploadStatuses
      .map((status, index) => (status.status === 'pending' ? index : -1))
      .filter((index) => index !== -1);

    setFiles((prev) => prev.filter((_, index) => pendingIndices.includes(index)));
    setUploadStatuses((prev) =>
      prev.filter((_, index) => pendingIndices.includes(index))
    );
  }, [uploadStatuses]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
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
  };
}
