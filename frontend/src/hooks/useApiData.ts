import { useCallback, useEffect, useState } from 'react'
import { errorKey } from '../api/client'
import type { TranslationKey } from '../i18n/en'

interface ApiDataState<T> {
  data: T | null
  error: TranslationKey | null
}

/**
 * Loads data from the API and reloads whenever `loader` changes.
 * `loader` must be stable: wrap it in useCallback with the values it depends on (e.g. page offset).
 * Keeps the last good data on error so the table doesn't flash empty.
 */
export function useApiData<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<ApiDataState<T>>({ data: null, error: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    loader().then(
      (data) => {
        if (!cancelled) setState({ data, error: null })
      },
      (err: unknown) => {
        if (!cancelled) setState((s) => ({ data: s.data, error: errorKey(err) }))
      },
    )
    return () => {
      cancelled = true
    }
  }, [loader, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { data: state.data, error: state.error, reload }
}
