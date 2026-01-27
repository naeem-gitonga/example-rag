'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import { TextEntryForm } from './TextEntryForm';
import { FileUploadForm } from './FileUploadForm';
import { InputMode } from './types';
import styles from './DocumentUpload.module.scss';

export default function DocumentUpload() {
  const [inputMode, setInputMode] = useState<InputMode>('text');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          RAG Chat
        </Link>
        <nav className={styles.nav}>
          <Link href="/chat" className={styles.navLink}>
            Chat
          </Link>
          <Link href="/upload" className={styles.navLinkActive}>
            Add Knowledge
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className={styles.main}>
        <ModeToggle mode={inputMode} onChange={setInputMode} />
        {inputMode === 'text' ? <TextEntryForm /> : <FileUploadForm />}
      </main>
    </div>
  );
}

interface ModeToggleProps {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
}

function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className={styles.modeToggle}>
      <button
        className={`${styles.modeButton} ${mode === 'text' ? styles.active : ''}`}
        onClick={() => onChange('text')}
      >
        Write Entry
      </button>
      <button
        className={`${styles.modeButton} ${mode === 'file' ? styles.active : ''}`}
        onClick={() => onChange('file')}
      >
        Upload File
      </button>
    </div>
  );
}
