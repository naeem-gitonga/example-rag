'use client'

import { ConnectionStatus as Status } from './types'
import styles from './Chat.module.scss'

const { connectionStatus, statusDot, statusLabel } = styles

interface ConnectionStatusProps {
  status: Status
}

const statusLabels: Record<Status, string> = {
  connecting: 'Connecting...',
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Connection Error',
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <div className={`${connectionStatus} ${styles[status]}`}>
      <span className={statusDot} />
      <span className={statusLabel}>{statusLabels[status]}</span>
    </div>
  )
}
