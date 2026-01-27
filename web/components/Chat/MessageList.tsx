'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from '@shared/chat-types'
import styles from './Chat.module.scss'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={styles.emptyState}>
        <p>Start a conversation by typing a message below.</p>
      </div>
    )
  }

  return (
    <div className={styles.messageList}>
      {messages.map((message) => (
        <div
          key={message.message_id}
          className={`${styles.message} ${styles[message.role]}`}
        >
          <div className={styles.messageContent}>
            <span className={styles.roleLabel}>
              {message.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <p className={styles.messageText}>{message.content}</p>
            {message.rag_context && message.rag_context.length > 0 && (
              <div className={styles.ragContext}>
                <span className={styles.contextLabel}>Sources:</span>
                <ul className={styles.contextList}>
                  {message.rag_context.map((ctx, idx) => (
                    <li key={idx} className={styles.contextItem}>
                      <span className={styles.contextDate}>{ctx.entry_date}</span>
                      <span className={styles.contextSnippet}>{ctx.text_snippet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <span className={styles.timestamp}>
              {formatTime(new Date(message.created_at))}
            </span>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className={`${styles.message} ${styles.assistant}`}>
          <div className={styles.messageContent}>
            <span className={styles.roleLabel}>Assistant</span>
            <div className={styles.typingIndicator}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
