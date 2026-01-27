'use client'

import { ConnectionStatus as Status } from './types'
import styles from './Chat.module.scss'

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
    <div className={`${styles.connectionStatus} ${styles[status]}`}>
      <span className={styles.statusDot} />
      <span className={styles.statusLabel}>{statusLabels[status]}</span>
    </div>
  )
}
