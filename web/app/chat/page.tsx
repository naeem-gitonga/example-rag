'use client'

import Link from 'next/link'
import { Chat } from '@/components/Chat/Chat'
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle'
import styles from './page.module.scss'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws'

export default function ChatPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          RAG Chat
        </Link>
        <nav className={styles.nav}>
          <Link href="/chat" className={styles.navLinkActive}>
            Chat
          </Link>
          <Link href="/upload" className={styles.navLink}>
            Add Knowledge
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <Chat wsUrl={WS_URL} />
        </div>
      </main>
    </div>
  )
}
