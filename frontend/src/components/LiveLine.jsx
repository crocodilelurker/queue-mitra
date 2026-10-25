import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { useDepartments } from '../api/departments.js'
import { useI18n } from '../i18n/index.jsx'

/** "12 people waiting · 7 departments open". Shown only when there is real data. */
export default function LiveLine() {
  const { f } = useI18n()
  const { list } = useDepartments()
  const [waiting, setWaiting] = useState(null)
  const codes = list.map((d) => d.code).join(',')

  useEffect(() => {
    if (!codes) return undefined
    let alive = true
    const withCounts = list.filter((d) => typeof d.waitingCount === 'number')
    if (withCounts.length === list.length) {
      setWaiting(list.reduce((sum, d) => sum + d.waitingCount, 0))
      return undefined
    }
    Promise.allSettled(list.map((d) => api.departmentQueue(d.code))).then((results) => {
      if (!alive) return
      const ok = results.filter((r) => r.status === 'fulfilled')
      setWaiting(ok.length ? ok.reduce((sum, r) => sum + (r.value.waitingCount ?? 0), 0) : null)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes])

  if (!list.length) return null
  const parts = []
  if (waiting !== null) parts.push(waiting === 1 ? f('liveWaitingOne') : f('liveWaiting', { n: waiting }))
  parts.push(list.length === 1 ? f('liveDeptsOne') : f('liveDepts', { n: list.length }))
  return (
    <p className="live-line" aria-live="polite">
      <span className="live-line__dot" aria-hidden="true" />
      {parts.join(' · ')}
    </p>
  )
}
