'use client';

import { useTextEntry } from './hooks/useTextEntry';
import { MoodSelector } from './MoodSelector';
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
    selectedMoods,
    toggleMood,
    submitStatus,
    submit,
    canSubmit,
  } = useTextEntry();

  return (
    <div className={textEntryForm}>
      <DateInput value={entryDate} onChange={setEntryDate} />

      <MoodSelector selectedMoods={selectedMoods} onToggle={toggleMood} />

      <div className={formGroup}>
        <label className={label}>Entry Text</label>
        <textarea
          value={entryText}
          onChange={(e) => setEntryText(e.target.value)}
          className={textArea}
          placeholder="Write your journal entry here..."
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
