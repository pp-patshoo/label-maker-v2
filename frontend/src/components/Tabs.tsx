import { useT } from '../i18n/I18nContext'
import type { TranslationKey } from '../i18n/en'
import styles from './Tabs.module.css'

export interface TabItem<T extends string> {
  id: T
  labelKey: TranslationKey
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
}

/** Tab strip only; render the active panel yourself inside an element with role="tabpanel". */
export default function Tabs<T extends string>({ items, value, onChange }: TabsProps<T>) {
  const { t } = useT()
  return (
    <div className={styles.tabs} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          className={styles.tab}
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {t(item.labelKey)}
        </button>
      ))}
    </div>
  )
}
