import { useState, useCallback } from 'react';
import { UploadStatus } from '../types';
import { submitEntry } from '../api';
import { useCustomTopics } from './useCustomTopics';

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export interface UseTextEntryReturn {
  entryText: string;
  setEntryText: (text: string) => void;
  entryDate: string;
  setEntryDate: (date: string) => void;
  selectedTopics: string[];
  toggleTopic: (topic: string) => void;
  customTopics: string[];
  addCustomTopic: (topic: string) => void;
  submitStatus: UploadStatus | null;
  submit: () => Promise<void>;
  canSubmit: boolean;
}

export function useTextEntry(): UseTextEntryReturn {
  const [entryText, setEntryText] = useState('');
  const [entryDate, setEntryDate] = useState(getTodayDate);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [submitStatus, setSubmitStatus] = useState<UploadStatus | null>(null);
  const { customTopics, addCustomTopic } = useCustomTopics();

  const toggleTopic = useCallback((topic: string) => {
    setSelectedTopics((current) =>
      current.includes(topic)
        ? current.filter((t) => t !== topic)
        : [...current, topic]
    );
  }, []);

  const submit = useCallback(async () => {
    if (!entryText.trim()) return;

    setSubmitStatus({
      name: 'Text Entry',
      status: 'uploading',
    });

    try {
      await submitEntry({
        entryDate,
        text: entryText,
        topics: selectedTopics,
      });

      setSubmitStatus({
        name: 'Text Entry',
        status: 'success',
        message: 'Entry saved successfully',
      });

      setEntryText('');
      setSelectedTopics([]);
    } catch (error) {
      setSubmitStatus({
        name: 'Text Entry',
        status: 'error',
        message: error instanceof Error ? error.message : 'Submit failed',
      });
    }
  }, [entryText, entryDate, selectedTopics]);

  return {
    entryText,
    setEntryText,
    entryDate,
    setEntryDate,
    selectedTopics,
    toggleTopic,
    customTopics,
    addCustomTopic,
    submitStatus,
    submit,
    canSubmit: entryText.trim().length > 0,
  };
}
