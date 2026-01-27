import { AVAILABLE_MOODS } from './types';
import styles from './DocumentUpload.module.scss';

const {
  formGroup,
  label: labelStyle,
  moodSelector,
  moodChip,
  selected,
} = styles;

export interface MoodSelectorProps {
  selectedMoods: string[];
  onToggle: (mood: string) => void;
  label?: string;
}

export function MoodSelector({ selectedMoods, onToggle, label = 'Moods' }: MoodSelectorProps) {
  return (
    <div className={formGroup}>
      <label className={labelStyle}>{label}</label>
      <div className={moodSelector}>
        {AVAILABLE_MOODS.map((mood) => (
          <button
            key={mood}
            type="button"
            className={`${moodChip} ${selectedMoods.includes(mood) ? selected : ''}`}
            onClick={() => onToggle(mood)}
          >
            {mood}
          </button>
        ))}
      </div>
    </div>
  );
}
