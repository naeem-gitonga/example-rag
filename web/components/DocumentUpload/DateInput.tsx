import styles from './DocumentUpload.module.scss';

export interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function DateInput({ value, onChange, label = 'Entry Date' }: DateInputProps) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.label}>{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.dateInput}
      />
    </div>
  );
}
