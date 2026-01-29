import { useState } from 'react';
import { DEFAULT_TOPICS } from './types';
import styles from './DocumentUpload.module.scss';

const {
  formGroup,
  label: labelStyle,
  topicSelector,
  topicChip,
  selected,
  customTopicInput,
  customTopicInputWrapper,
  addTopicButton,
} = styles;

export interface TopicSelectorProps {
  selectedTopics: string[];
  onToggle: (topic: string) => void;
  customTopics?: string[];
  onAddCustomTopic?: (topic: string) => void;
  label?: string;
}

export function TopicSelector({
  selectedTopics,
  onToggle,
  customTopics = [],
  onAddCustomTopic,
  label = 'Topics',
}: TopicSelectorProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddCustomTopic = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && onAddCustomTopic) {
      onAddCustomTopic(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomTopic();
    }
  };

  const allTopics = [...DEFAULT_TOPICS, ...customTopics];

  return (
    <div className={formGroup}>
      <label className={labelStyle}>{label}</label>
      <div className={topicSelector}>
        {allTopics.map((topic) => (
          <button
            key={topic}
            type="button"
            className={`${topicChip} ${selectedTopics.includes(topic) ? selected : ''}`}
            onClick={() => onToggle(topic)}
          >
            {topic}
          </button>
        ))}
      </div>
      {onAddCustomTopic && (
        <div className={customTopicInputWrapper}>
          <input
            type="text"
            className={customTopicInput}
            placeholder="Add custom topic..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className={addTopicButton}
            onClick={handleAddCustomTopic}
            disabled={!inputValue.trim()}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
