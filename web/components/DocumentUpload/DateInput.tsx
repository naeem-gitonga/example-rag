import styles from './DocumentUpload.module.scss';

const { formGroup, label: labelStyle, dateInput } = styles;

export interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function DateInput({ value, onChange, label = 'Entry Date' }: DateInputProps) {
  return (
    <div className={formGroup}>
      <label className={labelStyle}>{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={dateInput}
      />
    </div>
  );
}
