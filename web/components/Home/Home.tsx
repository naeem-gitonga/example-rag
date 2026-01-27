'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import styles from './Home.module.scss';

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>RAG Chat</h1>
        <nav className={styles.nav}>
          <Link href="/chat" className={styles.navLink}>
            Chat
          </Link>
          <Link href="/upload" className={styles.navLink}>
            Add Knowledge
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h2 className={styles.heroTitle}>
            Chat with Your Data
            <br />
            <span className={styles.heroAccent}>Powered by RAG</span>
          </h2>
          <p className={styles.heroDescription}>
            An AI assistant that knows your documents. Ask questions in natural
            language and get accurate answers grounded in your own knowledge base.
          </p>
          <div className={styles.heroActions}>
            <Link href="/chat" className={styles.primaryButton}>
              Start Chatting
            </Link>
            <Link href="/upload" className={styles.secondaryButton}>
              Add Knowledge
            </Link>
          </div>
        </section>

        <section className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>💬</div>
            <h3 className={styles.featureTitle}>Natural Conversation</h3>
            <p className={styles.featureDescription}>
              Chat naturally like you would with any AI assistant. Ask follow-up
              questions and have real conversations.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>📚</div>
            <h3 className={styles.featureTitle}>Your Knowledge Base</h3>
            <p className={styles.featureDescription}>
              Add your own documents, notes, and data. The AI references your
              content to provide relevant, accurate answers.
            </p>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>🎯</div>
            <h3 className={styles.featureTitle}>Grounded Responses</h3>
            <p className={styles.featureDescription}>
              Answers are backed by your documents, reducing hallucinations and
              ensuring responses you can trust.
            </p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>GTNG, Inc {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
