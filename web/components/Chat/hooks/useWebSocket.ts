'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { WebSocketChatMessage } from '@shared/chat-types'
import { ConnectionStatus } from '../types'

interface UseWebSocketOptions {
  url: string
  onMessage?: (message: WebSocketChatMessage) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
  reconnectAttempts?: number
  reconnectInterval?: number
}

interface UseWebSocketReturn {
  status: ConnectionStatus
  send: (message: Record<string, unknown>) => void
  connect: () => void
  disconnect: () => void
}

export function useWebSocket({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnectAttempts = 3,
  reconnectInterval = 3000,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    clearReconnectTimeout()
    setStatus('connecting')

    try {
      const socket = new WebSocket(url)
      socketRef.current = socket

      socket.onopen = () => {
        setStatus('connected')
        reconnectCountRef.current = 0
        onOpen?.()
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketChatMessage
          onMessage?.(data)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      socket.onclose = () => {
        setStatus('disconnected')
        onClose?.()

        // Attempt reconnect
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current += 1
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

      socket.onerror = (error) => {
        setStatus('error')
        onError?.(error)
      }
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      setStatus('error')
    }
  }, [url, onMessage, onOpen, onClose, onError, reconnectAttempts, reconnectInterval, clearReconnectTimeout])

  const disconnect = useCallback(() => {
    clearReconnectTimeout()
    reconnectCountRef.current = reconnectAttempts // Prevent auto-reconnect

    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    setStatus('disconnected')
  }, [clearReconnectTimeout, reconnectAttempts])

  const send = useCallback((message: Record<string, unknown>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { status, send, connect, disconnect }
}
