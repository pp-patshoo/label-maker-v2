import type { ReactNode } from 'react'
import { useT } from '../i18n/I18nContext'
import type { TranslationKey } from '../i18n/en'
import styles from './Table.module.css'

interface DataTableProps<T> {
  columns: TranslationKey[]
  /** null while loading */
  items: T[] | null
  emptyKey: TranslationKey
  rowKey: (item: T) => string | number
  /** Return the row's <td> cells. Cell helper classes (muted, ellipsis, actions) are in Table.module.css. */
  renderRow: (item: T) => ReactNode
}

export default function DataTable<T>({ columns, items, emptyKey, rowKey, renderRow }: DataTableProps<T>) {
  const { t } = useT()
  const message = items === null ? t('page.loading') : items.length === 0 ? t(emptyKey) : null

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((key) => (
              <th key={key}>{t(key)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {message !== null ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyRow}>
                {message}
              </td>
            </tr>
          ) : (
            items?.map((item) => <tr key={rowKey(item)}>{renderRow(item)}</tr>)
          )}
        </tbody>
      </table>
    </div>
  )
}
