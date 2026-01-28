'use client'

import { useEffect, useRef, useState } from 'react'
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
  contextHeader,
  contextLabel,
  contextCaret,
  contextList,
  contextItem,
  contextDate,
  contextSnippet,
  timestamp,
  assistant,
  typingIndicator,
  streamingText,
  expanded,
} = styles

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  streamingContent?: string
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export function MessageList({ messages, isLoading, streamingContent }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())

  const toggleSources = (messageId: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  // Only auto-scroll if user is near the bottom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Always scroll during streaming (user initiated)
  useEffect(() => {
    if (streamingContent || isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isLoading]) // Only on isLoading change, not every token

  if (messages.length === 0 && !isLoading && !streamingContent) {
    return (
      <div className={emptyState}>
        <p>Start a conversation by typing a message below.</p>
      </div>
    )
  }

  return (
    <div className={messageList} ref={containerRef}>
      {messages.map((msg) => (
        <div
          key={msg.message_id}
          className={`${message} ${styles[msg.role]}`}
        >
          <div className={messageContent}>
            <span className={roleLabel}>
              {msg.role === 'user' ? 'Me' : 'Assistant'}
            </span>
            <p className={messageText}>{msg.content}</p>
            {msg.rag_context && msg.rag_context.length > 0 && (
              <div className={ragContext}>
                <button
                  className={`${contextHeader} ${expandedSources.has(msg.message_id) ? expanded : ''}`}
                  onClick={() => toggleSources(msg.message_id)}
                  type="button"
                >
                  <span className={contextCaret}>&#9656;</span>
                  <span className={contextLabel}>Sources ({msg.rag_context.length})</span>
                </button>
                {expandedSources.has(msg.message_id) && (
                  <ul className={contextList}>
                    {msg.rag_context.map((ctx, idx) => (
                      <li key={idx} className={contextItem}>
                        <span className={contextDate}>{ctx.entry_date}</span>
                        <span className={contextSnippet}>{ctx.text_snippet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <span className={timestamp}>
              {formatTime(new Date(msg.created_at))}
            </span>
          </div>
        </div>
      ))}
      {(isLoading || streamingContent) && (
        <div className={`${message} ${assistant}`}>
          <div className={messageContent}>
            <span className={roleLabel}>Assistant</span>
            {streamingContent ? (
              <p className={`${messageText} ${streamingText}`}>{streamingContent}</p>
            ) : (
              <div className={typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
