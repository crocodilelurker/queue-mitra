import qrcode from 'qrcode-generator'

const FONT = "'Inter Variable', Inter, 'Noto Sans', system-ui, sans-serif"

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Draws the OPD slip on a canvas and downloads it as a PNG ("Save as image").
 * slip: { hospital, title, token, tokenLabel, name, rows: [[label, value]], qrValue, qrCaption, footer }
 */
export function saveSlipImage(slip, fileName = 'opd-slip.png') {
  const W = 720
  const pad = 48
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const scale = 2
  // Height grows with the number of rows.
  const H = 760 + slip.rows.length * 74
  canvas.width = W * scale
  canvas.height = H * scale
  ctx.scale(scale, scale)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#0f766e'
  ctx.fillRect(0, 0, W, 12)

  let y = 70
  ctx.fillStyle = '#0b2b2e'
  ctx.font = `700 30px ${FONT}`
  ctx.fillText(slip.hospital, pad, y)
  y += 40
  ctx.fillStyle = '#3d5356'
  ctx.font = `500 24px ${FONT}`
  ctx.fillText(slip.title, pad, y)

  // Token
  y += 30
  ctx.fillStyle = '#fef3c7'
  ctx.strokeStyle = '#b45309'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.roundRect?.(pad, y, W - pad * 2, 170, 18)
  if (!ctx.roundRect) ctx.rect(pad, y, W - pad * 2, 170)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#7c2d12'
  ctx.font = `600 24px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText(slip.tokenLabel, W / 2, y + 44)
  ctx.fillStyle = '#0b2b2e'
  ctx.font = `800 84px ${FONT}`
  ctx.fillText(slip.token, W / 2, y + 136)
  ctx.textAlign = 'left'
  y += 220

  ctx.fillStyle = '#0b2b2e'
  ctx.font = `700 34px ${FONT}`
  ctx.fillText(slip.name, pad, y)
  y += 30

  for (const [label, value] of slip.rows) {
    y += 44
    ctx.fillStyle = '#52686b'
    ctx.font = `500 22px ${FONT}`
    ctx.fillText(label, pad, y)
    ctx.fillStyle = '#0b2b2e'
    ctx.font = `700 26px ${FONT}`
    const lines = wrap(ctx, value, W - pad * 2 - 240)
    lines.slice(0, 2).forEach((line, i) => ctx.fillText(line, pad + 240, y + i * 30))
    y += 30
  }

  // QR code
  if (slip.qrValue) {
    const qr = qrcode(0, 'M')
    qr.addData(slip.qrValue)
    qr.make()
    const n = qr.getModuleCount()
    const size = 220
    const cell = size / n
    const qx = (W - size) / 2
    const qy = y + 30
    ctx.fillStyle = '#000000'
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(qx + c * cell, qy + r * cell, cell + 0.4, cell + 0.4)
    ctx.fillStyle = '#3d5356'
    ctx.font = `500 22px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(slip.qrCaption, W / 2, qy + size + 36)
    if (slip.footer) {
      ctx.font = `500 18px ${FONT}`
      wrap(ctx, slip.footer, W - pad * 2).slice(0, 3).forEach((line, i) => ctx.fillText(line, W / 2, qy + size + 76 + i * 24))
    }
    ctx.textAlign = 'left'
  }

  const link = document.createElement('a')
  link.download = fileName
  link.href = canvas.toDataURL('image/png')
  document.body.appendChild(link)
  link.click()
  link.remove()
}
