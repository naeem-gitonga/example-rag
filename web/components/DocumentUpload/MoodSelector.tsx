import { AVAILABLE_MOODS } from './types';
import styles from './DocumentUpload.module.scss';

export interface MoodSelectorProps {
  selectedMoods: string[];
  onToggle: (mood: string) => void;
  label?: string;
}

export function MoodSelector({ selectedMoods, onToggle, label = 'Moods' }: MoodSelectorProps) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.label}>{label}</label>
      <div className={styles.moodSelector}>
        {AVAILABLE_MOODS.map((mood) => (
          <button
            key={mood}
            type="button"
            className={`${styles.moodChip} ${
              selectedMoods.includes(mood) ? styles.selected : ''
            }`}
            onClick={() => onToggle(mood)}
          >
            {mood}
          </button>
        ))}
      </div>
    </div>
  );
}
