import { useMemo } from 'react'
import { useT } from '../../i18n/I18nContext'

/** Date-time formatter that follows the UI language (Thai uses the Buddhist calendar). */
export function useDateFormat() {
  const { lang } = useT()
  return useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    return (iso: string) => fmt.format(new Date(iso))
  }, [lang])
}
