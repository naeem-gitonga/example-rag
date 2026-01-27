'use client'

import { useCallback, useState } from 'react'
import { ChatMessage, WebSocketChatMessage } from '@shared/chat-types'
import { ConnectionStatus } from '../types'
import { useWebSocket } from './useWebSocket'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

interface UseChatOptions {
  wsUrl: string
  sessionId?: string
}

interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  connectionStatus: ConnectionStatus
  sendMessage: (content: string) => void
  clearMessages: () => void
  clearError: () => void
}

export function useChat({ wsUrl, sessionId }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentSessionId = sessionId || generateId()

  const handleMessage = useCallback((data: WebSocketChatMessage) => {
    if (data.error) {
      setError(data.error)
      setIsLoading(false)
      return
    }

    if (data.action === 'chat' && data.role === 'assistant' && data.content) {
      const assistantMessage: ChatMessage = {
        message_id: data.message_id || generateId(),
        session_id: data.session_id || currentSessionId,
        role: 'assistant',
        content: data.content,
        created_at: new Date(),
        rag_context: data.rag_context || null,
      }

      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }
  }, [currentSessionId])

  const handleError = useCallback(() => {
    setError('Connection error')
    setIsLoading(false)
  }, [])

  const { status, send } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    onError: handleError,
  })

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return

    const userMessage: ChatMessage = {
      message_id: generateId(),
      session_id: currentSessionId,
      role: 'user',
      content: content.trim(),
      created_at: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    send({
      action: 'chat',
      session_id: currentSessionId,
      content: content.trim(),
    })
  }, [currentSessionId, send])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    connectionStatus: status,
    sendMessage,
    clearMessages,
    clearError,
  }
}
