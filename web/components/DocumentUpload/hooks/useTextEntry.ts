import { useState, useCallback } from 'react';
import { UploadStatus } from '../types';
import { submitEntry } from '../api';

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export interface UseTextEntryReturn {
  entryText: string;
  setEntryText: (text: string) => void;
  entryDate: string;
  setEntryDate: (date: string) => void;
  selectedMoods: string[];
  toggleMood: (mood: string) => void;
  submitStatus: UploadStatus | null;
  submit: () => Promise<void>;
  canSubmit: boolean;
}

export function useTextEntry(): UseTextEntryReturn {
  const [entryText, setEntryText] = useState('');
  const [entryDate, setEntryDate] = useState(getTodayDate);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [submitStatus, setSubmitStatus] = useState<UploadStatus | null>(null);

  const toggleMood = useCallback((mood: string) => {
    setSelectedMoods((current) =>
      current.includes(mood)
        ? current.filter((m) => m !== mood)
        : [...current, mood]
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
        moods: selectedMoods,
      });

      setSubmitStatus({
        name: 'Text Entry',
        status: 'success',
        message: 'Entry saved successfully',
      });

      setEntryText('');
      setSelectedMoods([]);
    } catch (error) {
      setSubmitStatus({
        name: 'Text Entry',
        status: 'error',
        message: error instanceof Error ? error.message : 'Submit failed',
      });
    }
  }, [entryText, entryDate, selectedMoods]);

  return {
    entryText,
    setEntryText,
    entryDate,
    setEntryDate,
    selectedMoods,
    toggleMood,
    submitStatus,
    submit,
    canSubmit: entryText.trim().length > 0,
  };
}
