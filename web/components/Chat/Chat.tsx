'use client'

import { useChat } from './hooks/useChat'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ConnectionStatus } from './ConnectionStatus'
import styles from './Chat.module.scss'

interface ChatProps {
  wsUrl: string
  sessionId?: string
}

export function Chat({ wsUrl, sessionId }: ChatProps) {
  const {
    messages,
    isLoading,
    error,
    connectionStatus,
    sendMessage,
    clearError,
  } = useChat({ wsUrl, sessionId })

  const isConnected = connectionStatus === 'connected'

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <h2 className={styles.title}>Chat</h2>
        <ConnectionStatus status={connectionStatus} />
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button onClick={clearError} className={styles.dismissButton}>
            Dismiss
          </button>
        </div>
      )}

      <div className={styles.chatBody}>
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      <div className={styles.chatFooter}>
        <MessageInput
          onSend={sendMessage}
          disabled={!isConnected || isLoading}
          placeholder={
            isConnected ? 'Type a message...' : 'Waiting for connection...'
          }
        />
      </div>
    </div>
  )
}
