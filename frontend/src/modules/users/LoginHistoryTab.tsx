import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { errorKey } from '../../api/client'
import form from '../../components/Form.module.css'
import { useT } from '../../i18n/I18nContext'
import type { TranslationKey } from '../../i18n/en'
import { listLoginEvents } from './usersApi'
import type { LoginEvent } from './usersApi'
import { useDateFormat } from './useDateFormat'
import styles from './Users.module.css'

const PAGE_SIZE = 50

export default function LoginHistoryTab() {
  const { t } = useT()
  const formatDate = useDateFormat()
  const [offset, setOffset] = useState(0)
  const [data, setData] = useState<{ items: LoginEvent[]; total: number } | null>(null)
  const [error, setError] = useState<TranslationKey | null>(null)

  const load = useCallback(async (off: number) => {
    try {
      setData(await listLoginEvents(PAGE_SIZE, off))
      setError(null)
    } catch (err) {
      setError(errorKey(err))
    }
  }, [])

  useEffect(() => {
    void load(offset)
  }, [load, offset])

  const total = data?.total ?? 0
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + PAGE_SIZE, total)

  return (
    <>
      <div className={styles.toolbar}>
        <span className={styles.muted}>{t('history.range', { from, to, total })}</span>
        <div className={styles.toolbarRight}>
          {error && <span className={styles.banner}>{t(error)}</span>}
          <button
            type="button"
            className={styles.iconButton}
            title={t('common.refresh')}
            aria-label={t('common.refresh')}
            onClick={() => void load(offset)}
          >
            <RefreshCw size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('history.col.time')}</th>
              <th>{t('history.col.username')}</th>
              <th>{t('history.col.result')}</th>
              <th>{t('history.col.ip')}</th>
              <th>{t('history.col.device')}</th>
            </tr>
          </thead>
          <tbody>
            {data === null ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  {t('page.loading')}
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  {t('history.empty')}
                </td>
              </tr>
            ) : (
              data.items.map((e) => (
                <tr key={e.id}>
                  <td className={styles.muted}>{formatDate(e.createdAt)}</td>
                  <td>
                    {e.usernameAttempted || '—'}
                    {e.displayName && <span className={styles.muted}> ({e.displayName})</span>}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${e.success ? styles.badgeOk : styles.badgeError}`}>
                      {t(`history.reason.${e.reason}`)}
                    </span>
                  </td>
                  <td className={styles.muted}>{e.ip ?? '—'}</td>
                  <td className={`${styles.muted} ${styles.ellipsis}`} title={e.userAgent ?? ''}>
                    {e.userAgent ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pager}>
        <button
          type="button"
          className={form.button}
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          {t('common.previous')}
        </button>
        <button
          type="button"
          className={form.button}
          disabled={offset + PAGE_SIZE >= total}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          {t('common.next')}
        </button>
      </div>
    </>
  )
}
