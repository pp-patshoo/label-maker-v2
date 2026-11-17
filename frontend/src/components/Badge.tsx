import type { ReactNode } from 'react'
import styles from './Badge.module.css'

export type BadgeTone = 'neutral' | 'ok' | 'warn' | 'error' | 'accent'

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  const className = tone === 'neutral' ? styles.badge : `${styles.badge} ${styles[tone]}`
  return <span className={className}>{children}</span>
}

/** Wraps several badges with consistent spacing. */
export function BadgeList({ children }: { children: ReactNode }) {
  return <div className={styles.list}>{children}</div>
}
