import { useT } from '../i18n/I18nContext'
import form from './Form.module.css'
import styles from './Pager.module.css'

interface PagerProps {
  offset: number
  pageSize: number
  total: number
  onChange: (offset: number) => void
}

/** Previous/next buttons for offset-based paging (matches the API's limit/offset). */
export default function Pager({ offset, pageSize, total, onChange }: PagerProps) {
  const { t } = useT()
  return (
    <div className={styles.pager}>
      <button
        type="button"
        className={form.button}
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - pageSize))}
      >
        {t('common.previous')}
      </button>
      <button
        type="button"
        className={form.button}
        disabled={offset + pageSize >= total}
        onClick={() => onChange(offset + pageSize)}
      >
        {t('common.next')}
      </button>
    </div>
  )
}
