import { useState } from 'react'
import { api } from '../api/client.js'
import { useI18n } from '../i18n/index.jsx'
import { navigate } from '../router.jsx'
import Field from './new/Field.jsx'
import Modal from './common/Modal.jsx'
import { Icon } from './common/Icons.jsx'

/** "I have my slip": find today's ticket from the printed token number (for example MED-001). */
export default function SlipLookup({ open, onClose }) {
  const { t } = useI18n()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!token.trim()) return setError(t.errTokenRequired)
    setBusy(true)
    setError('')
    try {
      const ticket = await api.lookup(token.trim())
      onClose()
      navigate(`/my-turn/${ticket.publicId}`)
    } catch (err) {
      setError(err.status === 404 ? t.tokenNotFound : err.status === 0 ? t.errNetwork : t.errGeneric)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t.slipTitle}>
      <form className="form" onSubmit={submit} noValidate>
        <Field
          label={t.tokenLabel}
          value={token}
          onChange={(e) => {
            setToken(e.target.value.toUpperCase())
            setError('')
          }}
          error={error}
          placeholder="e.g. MED-001, ENT-004"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={12}
        />
        <div className="form__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>
            <Icon name="close" size={16} />
            <span>{t.close}</span>
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            <Icon name="search" size={16} />
            <span>{busy ? t.loading : t.findTicket}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
