import { useCallback, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Badge } from '../../components/Badge'
import DataTable from '../../components/DataTable'
import IconButton from '../../components/IconButton'
import Pager from '../../components/Pager'
import table from '../../components/Table.module.css'
import Toolbar from '../../components/Toolbar'
import { useApiData } from '../../hooks/useApiData'
import { useDateFormat } from '../../hooks/useDateFormat'
import { useT } from '../../i18n/I18nContext'
import { listLoginEvents } from './usersApi'

const PAGE_SIZE = 50

export default function LoginHistoryTab() {
  const { t } = useT()
  const formatDate = useDateFormat()
  const [offset, setOffset] = useState(0)
  const { data, error, reload } = useApiData(useCallback(() => listLoginEvents(PAGE_SIZE, offset), [offset]))

  const total = data?.total ?? 0
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + PAGE_SIZE, total)

  return (
    <>
      <Toolbar error={error} end={<IconButton label={t('common.refresh')} icon={RefreshCw} onClick={reload} />}>
        <span className={table.muted}>{t('history.range', { from, to, total })}</span>
      </Toolbar>

      <DataTable
        columns={['history.col.time', 'history.col.username', 'history.col.result', 'history.col.ip', 'history.col.device']}
        items={data?.items ?? null}
        emptyKey="history.empty"
        rowKey={(e) => e.id}
        renderRow={(e) => (
          <>
            <td className={table.muted}>{formatDate(e.createdAt)}</td>
            <td>
              {e.usernameAttempted || '—'}
              {e.displayName && <span className={table.muted}> ({e.displayName})</span>}
            </td>
            <td>
              <Badge tone={e.success ? 'ok' : e.reason === 'cli_reset' ? 'warn' : 'error'}>
                {t(`history.reason.${e.reason}`)}
              </Badge>
            </td>
            <td className={table.muted}>{e.ip ?? '—'}</td>
            <td className={`${table.muted} ${table.ellipsis}`} title={e.userAgent ?? ''}>
              {e.userAgent ?? '—'}
            </td>
          </>
        )}
      />

      <Pager offset={offset} pageSize={PAGE_SIZE} total={total} onChange={setOffset} />
    </>
  )
}
