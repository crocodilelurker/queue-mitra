import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useDepartments } from '../api/departments.js'
import Layout from '../components/Layout.jsx'
import MicButton from '../components/MicButton.jsx'
import { Icon } from '../components/common/Icons.jsx'
import { useI18n } from '../i18n/index.jsx'
import { navigate } from '../router.jsx'
import { lastTicket, rememberTicket } from '../utils/patientStore.js'

// QR scanning needs the browser's BarcodeDetector and a camera; the button is hidden everywhere else.
const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window && Boolean(navigator.mediaDevices?.getUserMedia)

// The slip's QR code holds .../my-turn/<publicId>
function publicIdFromQr(text) {
  const m = String(text).match(/my-turn\/([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

function Scanner({ onFound, onClose }) {
  const { t } = useI18n()
  const videoRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let stream = null
    let stopped = false
    let timer = null
    const start = async () => {
      try {
        const formats = (await window.BarcodeDetector.getSupportedFormats?.()) || ['qr_code']
        if (!formats.includes('qr_code')) throw new Error('no qr')
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (stopped) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const scan = async () => {
          if (stopped) return
          try {
            const codes = await detector.detect(videoRef.current)
            const id = codes.map((c) => publicIdFromQr(c.rawValue)).find(Boolean)
            if (id) return onFound(id)
          } catch {
            /* frame not ready */
          }
          timer = setTimeout(scan, 300)
        }
        scan()
      } catch {
        setFailed(true)
      }
    }
    start()
    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [onFound])

  return (
    <section className="scanner" aria-label={t.scanQr}>
      {failed ? (
        <p className="status status--error" role="alert">
          {t.scanFailed}
        </p>
      ) : (
        <>
          <video ref={videoRef} className="scanner__video" muted playsInline />
          <p className="muted">{t.scanHint}</p>
        </>
      )}
      <button type="button" className="btn btn--ghost btn--block" onClick={onClose}>
        <Icon name="close" size={22} />
        <span>{t.close}</span>
      </button>
    </section>
  )
}

/** "I have my slip": type the token number or scan the slip's QR code, then open My turn. */
export default function SlipFinder() {
  const { t, f } = useI18n()
  const { list } = useDepartments()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const recent = lastTicket()
  const example = `${list[0]?.code || 'OPD'}-012`

  const open = (publicId) => navigate(`/my-turn/${publicId}`)

  const submit = async (e) => {
    e.preventDefault()
    const value = token.trim().toUpperCase()
    if (!value) return setError(t.errTokenRequired)
    setBusy(true)
    setError('')
    try {
      const ticket = await api.lookup(value)
      rememberTicket(ticket)
      open(ticket.publicId)
    } catch (err) {
      setError(err.status === 404 ? t.tokenNotFound : err.status === 0 ? t.errNetwork : t.errGeneric)
      setBusy(false)
    }
  }

  return (
    <Layout className="main--form">
      <h1 className="page-title">{t.cardSlip}</h1>
      <p className="lead">{t.slipFinderLead}</p>

      {recent && (
        <button type="button" className="btn btn--secondary btn--block" onClick={() => open(recent.publicId)}>
          <Icon name="ticket" size={22} />
          <span>{f('openRecent', { token: recent.tokenNumber })}</span>
        </button>
      )}

      {scanning ? (
        <Scanner onFound={open} onClose={() => setScanning(false)} />
      ) : (
        <form className="question" onSubmit={submit} noValidate>
          <label className="question__label" htmlFor="token">
            {t.tokenLabel}
          </label>
          <p className="question__hint" id="token-hint">
            {f('tokenHint', { example })}
          </p>
          <input
            id="token"
            className={`field__control field__control--big field__control--token${error ? ' field__control--error' : ''}`}
            value={token}
            onChange={(e) => {
              setToken(e.target.value.toUpperCase().replace(/\s+/g, ''))
              setError('')
            }}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck="false"
            maxLength={14}
            placeholder={example}
            aria-describedby={`token-hint${error ? ' token-err' : ''}`}
            aria-invalid={error ? 'true' : undefined}
          />
          {error && (
            <p className="field__error" id="token-err" role="alert">
              <Icon name="alert" size={18} />
              <span>{error}</span>
            </p>
          )}
          <MicButton onText={(s) => setToken(s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^([A-Z]+)(\d+)$/, '$1-$2'))} className="btn--block" />
          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            <Icon name="search" size={22} />
            <span>{busy ? t.loading : t.findTicket}</span>
          </button>
          {canScan && (
            <button type="button" className="btn btn--outline btn--block" onClick={() => setScanning(true)}>
              <Icon name="scan" size={22} />
              <span>{t.scanQr}</span>
            </button>
          )}
        </form>
      )}
    </Layout>
  )
}
