import { useI18n } from '../../i18n/index.jsx'

export function Loading() {
  const { t } = useI18n()
  return (
    <div className="loading-state">
      <p className="status" role="status">
        {t.loading}
      </p>
      <div className="skeleton skeleton--title" aria-hidden="true" />
      <div className="skeleton skeleton--card" aria-hidden="true" />
      <div className="skeleton skeleton--line" aria-hidden="true" />
    </div>
  )
}

export function ErrorNote({ error, onRetry }) {
  const { t } = useI18n()
  if (!error) return null
  const message = error.status === 0 ? t.errNetwork : error.status === 404 ? t.errNotFound : t.errGeneric
  return (
    <div className="status status--error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={() => onRetry()}>
          <span aria-hidden="true">↻</span> {t.retry}
        </button>
      )}
    </div>
  )
}
