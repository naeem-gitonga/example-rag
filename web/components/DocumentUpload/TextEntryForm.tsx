'use client';

import { useTextEntry } from './hooks/useTextEntry';
import { MoodSelector } from './MoodSelector';
import { DateInput } from './DateInput';
import { StatusMessage } from './StatusMessage';
import styles from './DocumentUpload.module.scss';

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
    <div className={styles.textEntryForm}>
      <DateInput value={entryDate} onChange={setEntryDate} />

      <MoodSelector selectedMoods={selectedMoods} onToggle={toggleMood} />

      <div className={styles.formGroup}>
        <label className={styles.label}>Entry Text</label>
        <textarea
          value={entryText}
          onChange={(e) => setEntryText(e.target.value)}
          className={styles.textArea}
          placeholder="Write your journal entry here..."
          rows={8}
        />
      </div>

      <div className={styles.formActions}>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={styles.primaryButton}
        >
          Save Entry
        </button>
      </div>

      <StatusMessage status={submitStatus} />
    </div>
  );
}
