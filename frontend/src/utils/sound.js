// Alert sounds made with the Web Audio API, so no audio files need to be shipped.
let ctx = null
let sirenTimer = null

function audio() {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq, start, duration, type = 'sine', volume = 0.25) {
  const c = audio()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, c.currentTime + start)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration)
  osc.connect(gain).connect(c.destination)
  osc.start(c.currentTime + start)
  osc.stop(c.currentTime + start + duration)
}

/** Gentle two-note chime ("your turn is close"). */
export function chime() {
  tone(660, 0, 0.4)
  tone(880, 0.25, 0.6)
}

export function vibrate(pattern = [200, 100, 200]) {
  if (navigator.vibrate) navigator.vibrate(pattern)
}

/** Repeating two-tone siren for urgent staff alerts, until stopSiren(). */
export function startSiren() {
  if (sirenTimer) return
  const beep = () => {
    tone(880, 0, 0.3, 'square', 0.15)
    tone(660, 0.35, 0.3, 'square', 0.15)
  }
  beep()
  sirenTimer = setInterval(beep, 1500)
}

export function stopSiren() {
  clearInterval(sirenTimer)
  sirenTimer = null
}
