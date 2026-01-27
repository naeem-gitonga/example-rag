'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from '@shared/chat-types'
import styles from './Chat.module.scss'

const {
  emptyState,
  messageList,
  message,
  messageContent,
  roleLabel,
  messageText,
  ragContext,
  contextLabel,
  contextList,
  contextItem,
  contextDate,
  contextSnippet,
  timestamp,
  assistant,
  typingIndicator,
} = styles

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
      <div className={emptyState}>
        <p>Start a conversation by typing a message below.</p>
      </div>
    )
  }

  return (
    <div className={messageList}>
      {messages.map((msg) => (
        <div
          key={msg.message_id}
          className={`${message} ${styles[msg.role]}`}
        >
          <div className={messageContent}>
            <span className={roleLabel}>
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </span>
            <p className={messageText}>{msg.content}</p>
            {msg.rag_context && msg.rag_context.length > 0 && (
              <div className={ragContext}>
                <span className={contextLabel}>Sources:</span>
                <ul className={contextList}>
                  {msg.rag_context.map((ctx, idx) => (
                    <li key={idx} className={contextItem}>
                      <span className={contextDate}>{ctx.entry_date}</span>
                      <span className={contextSnippet}>{ctx.text_snippet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <span className={timestamp}>
              {formatTime(new Date(msg.created_at))}
            </span>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className={`${message} ${assistant}`}>
          <div className={messageContent}>
            <span className={roleLabel}>Assistant</span>
            <div className={typingIndicator}>
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
