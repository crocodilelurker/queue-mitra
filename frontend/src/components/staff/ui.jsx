import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { Icon } from '../common/Icons.jsx'
import './staff.css'

/* ---------------------------------------------------------------------------
   Small UI kit for the staff console. Plain components, no dependencies.
   --------------------------------------------------------------------------- */

export function Button({ variant, size, icon, iconRight, busy, block, children, className = '', type = 'button', ...props }) {
  const cls = ['sx-btn', variant && `sx-btn--${variant}`, size && `sx-btn--${size}`, block && 'sx-btn--block', !children && 'sx-btn--icon', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button type={type} className={cls} disabled={busy || props.disabled} aria-busy={busy || undefined} {...props}>
      {busy ? <span className="sx-spinner" aria-hidden="true" /> : icon && <Icon name={icon} size={size === 'sm' ? 15 : 18} />}
      {children}
      {iconRight && !busy && <Icon name={iconRight} size={size === 'sm' ? 15 : 18} />}
    </button>
  )
}

export function Field({ label, hint, error, optional, children, id: givenId }) {
  const autoId = useId()
  const id = givenId || autoId
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  const child = typeof children === 'function' ? children({ id, 'aria-describedby': [hintId, errId].filter(Boolean).join(' ') || undefined, 'aria-invalid': error ? 'true' : undefined }) : children
  return (
    <div className="sx-field">
      {label && (
        <label className="sx-field__label" htmlFor={id}>
          {label} {optional && <em>(optional)</em>}
        </label>
      )}
      {child}
      {hint && !error && (
        <span className="sx-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="sx-field__error" id={errId}>
          <Icon name="alert" size={14} /> {error}
        </span>
      )}
    </div>
  )
}

/** Labelled input. Pass `error` for an inline message. */
export function TextField({ label, hint, error, optional, className = '', id, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={id}>
      {(a11y) => <input className={`sx-input ${className}`} {...a11y} {...props} />}
    </Field>
  )
}

export function SelectField({ label, hint, error, optional, children, id, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={id}>
      {(a11y) => (
        <select className="sx-select" {...a11y} {...props}>
          {children}
        </select>
      )}
    </Field>
  )
}

export function PasswordField({ label, hint, error, optional, className = '', id, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} hint={hint} error={error} optional={optional} id={id}>
      {(a11y) => (
        <div className="sx-input-wrap">
          <input className={`sx-input ${className}`} type={show ? 'text' : 'password'} {...a11y} {...props} />
          <Button
            variant="ghost"
            size="sm"
            className="sx-input-wrap__btn"
            icon={show ? 'eye-off' : 'eye'}
            aria-label={show ? 'Hide password' : 'Show password'}
            onClick={() => setShow((v) => !v)}
          />
        </div>
      )}
    </Field>
  )
}

export function Card({ title, icon, actions, children, footer, className = '', bodyClass = 'sx-card__body', as: Tag = 'section', ...props }) {
  return (
    <Tag className={`sx-card ${className}`} {...props}>
      {(title || actions) && (
        <header className="sx-card__head">
          {title && (
            <h2>
              {icon && <Icon name={icon} size={18} />}
              {title}
            </h2>
          )}
          {actions && <div className="sx-row">{actions}</div>}
        </header>
      )}
      {bodyClass ? <div className={bodyClass}>{children}</div> : children}
      {footer && <footer className="sx-card__foot">{footer}</footer>}
    </Tag>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="sx-page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="sx-page-head__actions">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, hint, icon, alert }) {
  return (
    <div className={`sx-stat${alert ? ' sx-stat--alert' : ''}`}>
      <span className="sx-stat__label">
        {icon && <Icon name={icon} size={15} />}
        {label}
      </span>
      <span className="sx-stat__value">{value}</span>
      {hint && <span className="sx-stat__hint">{hint}</span>}
    </div>
  )
}

export function Chip({ tone, icon, children, dot }) {
  return (
    <span className={`sx-chip${tone ? ` sx-chip--${tone}` : ''}`}>
      {dot && <span className="sx-chip__dot" aria-hidden="true" />}
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  )
}

export const CROWD = {
  green: { tone: 'green', word: 'Normal' },
  amber: { tone: 'amber', word: 'Busy' },
  red: { tone: 'red', word: 'Overcrowded' },
}

/** Crowd level: always a word next to the colour. */
export function CrowdBadge({ level = 'green', waiting, seats }) {
  const c = CROWD[level] || CROWD.green
  return (
    <Chip tone={c.tone} dot>
      {c.word}
      {waiting !== undefined && seats ? ` · ${waiting}/${seats} seats` : ''}
    </Chip>
  )
}

export function crowdFor(waiting, seats) {
  const ratio = seats ? waiting / seats : 0
  return ratio > 1 ? 'red' : ratio >= 0.7 ? 'amber' : 'green'
}

export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="sx-skel" aria-hidden="true" style={{ height, width, ...style }} />
}

export function SkeletonCards({ count = 3, height = 140 }) {
  return (
    <div className="sx-grid sx-grid--3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} style={{ borderRadius: 12 }} />
      ))}
    </div>
  )
}

export function EmptyState({ icon = 'sparkles', title, children, action, compact }) {
  return (
    <div className={`sx-empty${compact ? ' sx-empty--compact' : ''}`}>
      <span className="sx-empty__icon" aria-hidden="true">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function errorText(error) {
  if (!error) return ''
  if (error.status === 0) return 'Cannot reach the server. Check the connection and try again.'
  if (error.status === 429) return 'Too many attempts. Please wait a minute and try again.'
  if (error.message && error.message !== 'error') return error.message
  return 'Something went wrong. Please try again.'
}

export function InlineError({ error, onRetry, children }) {
  if (!error && !children) return null
  return (
    <div className="sx-alert sx-alert--error" role="alert">
      <Icon name="alert" size={18} />
      <div className="sx-alert__body">{children || errorText(error)}</div>
      {onRetry && (
        <Button size="sm" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Notice({ tone = 'info', icon = 'help', children }) {
  return (
    <div className={`sx-alert sx-alert--${tone}`}>
      <Icon name={icon} size={18} />
      <div className="sx-alert__body">{children}</div>
    </div>
  )
}

/** Accessible dialog on <dialog>: focus trap and Esc come from the browser. */
export function Dialog({ open, onClose, title, children, footer, wide }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`sx-dialog sx${wide ? ' sx-dialog--wide' : ''}`}
      style={{ minHeight: 0 }}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <>
          <header className="sx-dialog__head">
            <h2 id={titleId}>{title}</h2>
            <Button variant="ghost" size="sm" icon="close" aria-label="Close" onClick={onClose} />
          </header>
          <div className="sx-dialog__body">{children}</div>
          {footer && <footer className="sx-dialog__foot">{footer}</footer>}
        </>
      )}
    </dialog>
  )
}

/**
 * Confirm dialog. Usage: const confirm = useConfirm(); if (await confirm({ title, message, confirmLabel, danger })) ...
 */
const ConfirmContext = createContext(null)
const ToastContext = createContext(null)

export function StaffUIProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null)
  const [toasts, setToasts] = useState([])

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setConfirmState({ ...opts, resolve })
      }),
    []
  )
  const close = (value) => {
    confirmState?.resolve(value)
    setConfirmState(null)
  }

  const toast = useCallback((message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      <ToastContext.Provider value={toast}>
        {children}
        <Dialog
          open={Boolean(confirmState)}
          onClose={() => close(false)}
          title={confirmState?.title}
          footer={
            <>
              <Button onClick={() => close(false)}>{confirmState?.cancelLabel || 'Cancel'}</Button>
              <Button variant={confirmState?.danger ? 'danger-solid' : 'primary'} icon={confirmState?.icon || (confirmState?.danger ? 'trash' : 'check')} onClick={() => close(true)} autoFocus>
                {confirmState?.confirmLabel || 'Confirm'}
              </Button>
            </>
          }
        >
          <p>{confirmState?.message}</p>
        </Dialog>
        <div className="sx-toasts sx" style={{ minHeight: 0, background: 'none' }} role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`sx-toast sx-toast--${t.tone}`}>
              <Icon name={t.tone === 'error' ? 'alert' : 'check-circle'} size={18} />
              <p>{t.message}</p>
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext) || ((o) => Promise.resolve(window.confirm(o.message || o.title)))
export const useToast = () => useContext(ToastContext) || (() => {})

/* ---------------------------------------------------------------------------
   Helpers
   --------------------------------------------------------------------------- */

export function minutesSince(date, now = Date.now()) {
  if (!date) return 0
  return Math.max(0, Math.round((now - new Date(date).getTime()) / 60000))
}

export function formatWait(min) {
  if (min === null || min === undefined) return '—'
  if (min < 1) return 'under a minute'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function aboutWait(min) {
  if (!min) return 'No wait'
  return `about ${formatWait(min)}`
}

export function clockTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

export const ROLE_LABEL = { superadmin: 'Hospital owner', admin: 'Administrator', doctor: 'Doctor', staff: 'Counter staff' }

export const LANG_LABEL = { en: 'English', hi: 'हिन्दी Hindi', te: 'తెలుగు Telugu', ta: 'தமிழ் Tamil' }
export const LANG_SHORT = { en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil' }
export const GENDER_LABEL = { male: 'Male', female: 'Female', other: 'Other' }

export function initials(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || '?'
  )
}

/** Re-render every `ms` so relative times ("2 min ago") stay fresh. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

const DEPT_ICONS = { med: 'med', chd: 'chd', wom: 'wom', ort: 'ort', ent: 'ent', eye: 'eye', skn: 'skn' }
const KNOWN_ICONS = new Set(['stethoscope', 'child', 'woman', 'bone', 'ear', 'eye', 'skin', 'pulse', 'activity', 'hospital', 'pill', 'flask', 'bed', 'droplet', 'doctor'])
/** Icon for a department: catalog code first, then the catalog's icon name, then a stethoscope. */
export function deptIcon(d = {}) {
  return DEPT_ICONS[(d.code || d.departmentCode || '').toLowerCase()] || (KNOWN_ICONS.has(d.icon) ? d.icon : 'stethoscope')
}

/** Doctor status as words (never colour alone). */
export function doctorStatusText(status = {}) {
  const s = status.state || 'offline'
  if (s === 'available') return 'Available'
  if (s === 'on_break') return status.until ? `On break until ${clockTime(status.until)}` : 'On break'
  if (s === 'running_late') return `Running late by ${status.delayMinutes || 0} min`
  return 'Not on duty'
}
export function doctorStatusTone(status = {}) {
  const s = status.state || 'offline'
  return s === 'available' ? 'green' : s === 'on_break' ? 'amber' : s === 'running_late' ? 'amber' : undefined
}
export function DoctorStatusChip({ status }) {
  const s = status?.state || 'offline'
  return (
    <Chip tone={doctorStatusTone(status)} icon={s === 'on_break' ? 'coffee' : s === 'running_late' ? 'clock' : s === 'available' ? 'check' : undefined}>
      {doctorStatusText(status)}
    </Chip>
  )
}
