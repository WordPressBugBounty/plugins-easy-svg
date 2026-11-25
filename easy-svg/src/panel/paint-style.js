// The same paint-only rule the server applies (easy_svg_icon_paint_style): a
// pasted SVG with position:fixed and a viewport size covered the whole screen.
const PAINT = new Set([
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'opacity', 'color',
  'stop-color', 'stop-opacity', 'clip-rule', 'mix-blend-mode', 'isolation', 'vector-effect', 'paint-order',
  'shape-rendering', 'display', 'visibility', 'font-family', 'font-size', 'font-weight', 'font-style',
  'letter-spacing', 'text-anchor', 'dominant-baseline',
])
// A url() that is not a fragment fetches from another host the moment the drawing renders.
export const pointsAway = (value) =>
  [...String(value || '').matchAll(/url\s*\(\s*['"]?\s*([^'")\s]*)/gi)].some((m) => !m[1].startsWith('#'))

export const paintStyle = (style) =>
  String(style || '')
    .split(';')
    .map((d) => {
      const at = d.indexOf(':')
      if (at < 0) return ''
      const prop = d.slice(0, at).trim().toLowerCase()
      const value = d.slice(at + 1).trim()
      if (!value || !PAINT.has(prop)) return ''
      if (/[\\<>{}@]|expression\s*\(|javascript:/i.test(value)) return ''
      if (pointsAway(value)) return ''
      return `${prop}:${value}`
    })
    .filter(Boolean)
    .join(';')

