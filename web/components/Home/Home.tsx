'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import styles from './Home.module.scss';

const {
  container,
  header,
  logo,
  nav,
  navLink,
  main,
  hero,
  heroTitle,
  heroAccent,
  heroDescription,
  heroActions,
  primaryButton,
  secondaryButton,
  features,
  feature,
  featureIcon,
  featureTitle,
  featureDescription,
  footer,
} = styles;

export default function Home() {
  return (
    <div className={container}>
      <header className={header}>
        <h1 className={logo}>RAG Chat</h1>
        <nav className={nav}>
          <Link href="/chat" className={navLink}>
            Chat
          </Link>
          <Link href="/upload" className={navLink}>
            Add Knowledge
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className={main}>
        <section className={hero}>
          <h2 className={heroTitle}>
            Chat with Your Data
            <br />
            <span className={heroAccent}>Powered by RAG</span>
          </h2>
          <p className={heroDescription}>
            An AI assistant that knows your documents. Ask questions in natural
            language and get accurate answers grounded in your own knowledge base.
          </p>
          <div className={heroActions}>
            <Link href="/chat" className={primaryButton}>
              Start Chatting
            </Link>
            <Link href="/upload" className={secondaryButton}>
              Add Knowledge
            </Link>
          </div>
        </section>

        <section className={features}>
          <div className={feature}>
            <div className={featureIcon}>💬</div>
            <h3 className={featureTitle}>Natural Conversation</h3>
            <p className={featureDescription}>
              Chat naturally like you would with any AI assistant. Ask follow-up
              questions and have real conversations.
            </p>
          </div>

          <div className={feature}>
            <div className={featureIcon}>📚</div>
            <h3 className={featureTitle}>Your Knowledge Base</h3>
            <p className={featureDescription}>
              Add your own documents, notes, and data. The AI references your
              content to provide relevant, accurate answers.
            </p>
          </div>

          <div className={feature}>
            <div className={featureIcon}>🎯</div>
            <h3 className={featureTitle}>Grounded Responses</h3>
            <p className={featureDescription}>
              Answers are backed by your documents, reducing hallucinations and
              ensuring responses you can trust.
            </p>
          </div>
        </section>
      </main>

      <footer className={footer}>
        <p>GTNG, Inc {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
