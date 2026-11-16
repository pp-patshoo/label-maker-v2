import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useT } from '../i18n/I18nContext'
import styles from './Dialog.module.css'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Modal built on the native <dialog> element (focus trap, Esc, backdrop handled by the browser). */
export default function Dialog({ open, title, onClose, children }: DialogProps) {
  const { t } = useT()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      {open && (
        <>
          <div className={styles.header}>
            <h2 id="dialog-title" className={styles.title}>
              {title}
            </h2>
            <button type="button" className={styles.close} onClick={onClose} aria-label={t('common.close')}>
              <X size={16} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <div className={styles.body}>{children}</div>
        </>
      )}
    </dialog>
  )
}
