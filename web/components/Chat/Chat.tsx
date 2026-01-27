'use client'

import { useChat } from './hooks/useChat'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ConnectionStatus } from './ConnectionStatus'
import styles from './Chat.module.scss'

const {
  chatContainer,
  chatHeader,
  title,
  errorBanner,
  dismissButton,
  chatBody,
  chatFooter,
} = styles

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
    <div className={chatContainer}>
      <div className={chatHeader}>
        <h2 className={title}>Chat</h2>
        <ConnectionStatus status={connectionStatus} />
      </div>

      {error && (
        <div className={errorBanner}>
          <span>{error}</span>
          <button onClick={clearError} className={dismissButton}>
            Dismiss
          </button>
        </div>
      )}

      <div className={chatBody}>
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      <div className={chatFooter}>
        <MessageInput
          onSend={sendMessage}
          disabled={!isConnected}
          placeholder={
            isConnected ? 'Type a message...' : 'Waiting for connection...'
          }
        />
      </div>
    </div>
  )
}
