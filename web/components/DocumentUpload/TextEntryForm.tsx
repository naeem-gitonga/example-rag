'use client';

import { useTextEntry } from './hooks/useTextEntry';
import { TopicSelector } from './TopicSelector';
import { DateInput } from './DateInput';
import { StatusMessage } from './StatusMessage';
import styles from './DocumentUpload.module.scss';

const {
  textEntryForm,
  formGroup,
  label,
  textArea,
  formActions,
  primaryButton,
} = styles;

export function TextEntryForm() {
  const {
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
    canSubmit,
  } = useTextEntry();

  return (
    <div className={textEntryForm}>
      <DateInput value={entryDate} onChange={setEntryDate} />

      <TopicSelector
        selectedTopics={selectedTopics}
        onToggle={toggleTopic}
        customTopics={customTopics}
        onAddCustomTopic={addCustomTopic}
      />

      <div className={formGroup}>
        <label className={label}>Entry Text</label>
        <textarea
          value={entryText}
          onChange={(e) => setEntryText(e.target.value)}
          className={textArea}
          placeholder="Enter your content here..."
          rows={8}
        />
      </div>

      <div className={formActions}>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={primaryButton}
        >
          Save Entry
        </button>
      </div>

      <StatusMessage status={submitStatus} />
    </div>
  );
}
