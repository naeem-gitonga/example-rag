import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'customTopics';

export interface UseCustomTopicsReturn {
  customTopics: string[];
  addCustomTopic: (topic: string) => void;
  removeCustomTopic: (topic: string) => void;
}

export function useCustomTopics(): UseCustomTopicsReturn {
  const [customTopics, setCustomTopics] = useState<string[]>([]);

  // Load custom topics from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomTopics(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save custom topics to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customTopics));
    } catch {
      // Ignore localStorage errors
    }
  }, [customTopics]);

  const addCustomTopic = useCallback((topic: string) => {
    const trimmed = topic.trim().toLowerCase();
    if (trimmed && !customTopics.includes(trimmed)) {
      setCustomTopics((prev) => [...prev, trimmed]);
    }
  }, [customTopics]);

  const removeCustomTopic = useCallback((topic: string) => {
    setCustomTopics((prev) => prev.filter((t) => t !== topic));
  }, []);

  return {
    customTopics,
    addCustomTopic,
    removeCustomTopic,
  };
}
