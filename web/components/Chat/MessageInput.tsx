'use client'

import { useState, useCallback, useRef, KeyboardEvent, ChangeEvent } from 'react'
import styles from './Chat.module.scss'

interface MessageInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  const handleSubmit = useCallback(() => {
    if (input.trim() && !disabled) {
      onSend(input)
      setInput('')
      inputRef.current?.focus()
    }
  }, [input, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className={styles.inputContainer}>
      <textarea
        ref={inputRef}
        className={styles.messageInput}
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label="Message input"
      />
      <button
        className={styles.sendButton}
        onClick={handleSubmit}
        disabled={disabled || !input.trim()}
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  )
}
