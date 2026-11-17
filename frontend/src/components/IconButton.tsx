import type { LucideIcon } from 'lucide-react'
import styles from './IconButton.module.css'

interface IconButtonProps {
  /** Already translated; used for the tooltip and aria-label. */
  label: string
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
  size?: number
}

export default function IconButton({ label, icon: Icon, onClick, disabled = false, size = 16 }: IconButtonProps) {
  return (
    <button type="button" className={styles.button} title={label} aria-label={label} onClick={onClick} disabled={disabled}>
      <Icon size={size} strokeWidth={1.5} />
    </button>
  )
}
