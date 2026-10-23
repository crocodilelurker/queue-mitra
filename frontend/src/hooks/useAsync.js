import { useCallback, useEffect, useRef, useState } from 'react'

/** Runs `fn` on mount and whenever `deps` change. Returns { data, error, loading, reload, setData }. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const run = useCallback(async (quiet = false) => {
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fnRef.current()
      setState({ data, error: null, loading: false })
    } catch (error) {
      setState((s) => ({ data: quiet ? s.data : null, error, loading: false }))
    }
  }, [])

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), [])
  return { ...state, reload: run, setData }
}
