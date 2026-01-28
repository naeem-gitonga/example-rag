'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import { TextEntryForm } from './TextEntryForm';
import { FileUploadForm } from './FileUploadForm';
import { InputMode } from './types';
import styles from './DocumentUpload.module.scss';

const {
  container,
  header,
  logo,
  nav,
  navLink,
  navLinkActive,
  main,
  modeToggle,
  modeButton,
  active,
} = styles;

export default function DocumentUpload() {
  const [inputMode, setInputMode] = useState<InputMode>('text');

  return (
    <div className={container}>
      <header className={header}>
        <Link href="/" className={logo}>
          RAG Chat
        </Link>
        <nav className={nav}>
          <Link href="/chat" className={navLink}>
            Chat
          </Link>
          <Link href="/upload" className={navLinkActive}>
            Add Knowledge
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className={main}>
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
    <div className={modeToggle}>
      <button
        className={`${modeButton} ${mode === 'text' ? active : ''}`}
        onClick={() => onChange('text')}
      >
        Write Entry
      </button>
      <button
        className={`${modeButton} ${mode === 'file' ? active : ''}`}
        onClick={() => onChange('file')}
      >
        Upload File
      </button>
    </div>
  );
}
