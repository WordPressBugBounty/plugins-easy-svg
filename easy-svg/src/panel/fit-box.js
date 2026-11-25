// The square viewBox round what is drawn, half the widest stroke added on every side, so a stroke at the edge is not cut.
export function fitBox(b, stroke) {
  if (!(b.width > 0 && b.height > 0)) {
    return ''
  }
  const pad = Math.max(0, Number(stroke) || 0) / 2
  const side = Math.max(b.width, b.height) + 2 * pad
  const x = b.x - pad - (side - 2 * pad - b.width) / 2
  const y = b.y - pad - (side - 2 * pad - b.height) / 2
  return `${x} ${y} ${side} ${side}`
}
