'use client'

import Link from 'next/link'
import { Chat } from '@/components/Chat/Chat'
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle'
import styles from './page.module.scss'

const {
  page,
  header,
  logo,
  nav,
  navLinkActive,
  navLink,
  main,
  container,
} = styles

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws'

export default function ChatPage() {
  return (
    <div className={page}>
      <header className={header}>
        <Link href="/" className={logo}>
          RAG Chat
        </Link>
        <nav className={nav}>
          <Link href="/chat" className={navLinkActive}>
            Chat
          </Link>
          <Link href="/upload" className={navLink}>
            Add Knowledge
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className={main}>
        <div className={container}>
          <Chat wsUrl={WS_URL} />
        </div>
      </main>
    </div>
  )
}
