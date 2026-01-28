'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatMessage, RagContext } from '@shared/chat-types'
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
  streamingContent: string
  error: string | null
  connectionStatus: ConnectionStatus
  sendMessage: (content: string) => void
  clearMessages: () => void
  clearError: () => void
}

interface StreamMessage {
  action: string
  session_id?: string
  message_id?: string
  content?: string
  token?: string
  role?: string
  rag_context?: RagContext[]
  error?: string
}

export function useChat({ wsUrl, sessionId }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const currentSessionId = sessionId || generateId()
  const streamingContextRef = useRef<RagContext[] | null>(null)

  // Use refs for smooth streaming updates
  const streamingBufferRef = useRef('')
  const rafIdRef = useRef<number | null>(null)

  // Flush streaming buffer to state at 60fps
  const flushStreamingBuffer = useCallback(() => {
    if (streamingBufferRef.current !== '') {
      setStreamingContent(streamingBufferRef.current)
    }
    rafIdRef.current = null
  }, [])

  const scheduleStreamingUpdate = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushStreamingBuffer)
    }
  }, [flushStreamingBuffer])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  const handleMessage = useCallback((data: StreamMessage) => {
    if (data.error) {
      setError(data.error)
      setIsLoading(false)
      setStreamingContent('')
      streamingBufferRef.current = ''
      return
    }

    switch (data.action) {
      case 'chat_stream_start':
        // Store RAG context for later, reset streaming content
        streamingContextRef.current = data.rag_context || null
        streamingBufferRef.current = ''
        setStreamingContent('')
        break

      case 'chat_stream_token':
        // Append token to buffer and schedule update
        streamingBufferRef.current += data.token || ''
        scheduleStreamingUpdate()
        break

      case 'chat_stream_end':
        // Cancel any pending RAF
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }

        // Finalize message
        if (data.content) {
          const assistantMessage: ChatMessage = {
            message_id: data.message_id || generateId(),
            session_id: data.session_id || currentSessionId,
            role: 'assistant',
            content: data.content,
            created_at: new Date(),
            rag_context: data.rag_context || streamingContextRef.current || null,
          }
          setMessages((prev) => [...prev, assistantMessage])
        }
        streamingBufferRef.current = ''
        setStreamingContent('')
        setIsLoading(false)
        streamingContextRef.current = null
        break

      case 'chat_stream_error':
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }
        setError(data.error || 'Stream error')
        streamingBufferRef.current = ''
        setStreamingContent('')
        setIsLoading(false)
        streamingContextRef.current = null
        break

      // Fallback for non-streaming response
      case 'chat':
        if (data.role === 'assistant' && data.content) {
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
        break
    }
  }, [currentSessionId, scheduleStreamingUpdate])

  const handleOpen = useCallback(() => {
    setError(null)
  }, [])

  const handleError = useCallback(() => {
    setError('Connection error')
    setIsLoading(false)
    streamingBufferRef.current = ''
    setStreamingContent('')
  }, [])

  const { status, send } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    onOpen: handleOpen,
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
    streamingBufferRef.current = ''
    setStreamingContent('')
    setError(null)

    send({
      action: 'chat',
      session_id: currentSessionId,
      content: content.trim(),
    })
  }, [currentSessionId, send])

  const clearMessages = useCallback(() => {
    setMessages([])
    streamingBufferRef.current = ''
    setStreamingContent('')
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    streamingContent,
    error,
    connectionStatus: status,
    sendMessage,
    clearMessages,
    clearError,
  }
}
