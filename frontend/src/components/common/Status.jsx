import { useI18n } from '../../i18n/index.jsx'

export function Loading() {
  const { t } = useI18n()
  return (
    <p className="status" role="status">
      {t.loading}
    </p>
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
