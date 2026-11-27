import { paintStyle } from './paint-style.js'

// The server's steps (includes/icons.php) for the preview, so a pasted drawing looks as it will be stored.

// easy_svg_css_without_at_blocks: every @-block goes with its nested rules; braces are counted.
export const cssWithoutAtBlocks = (css) => {
  let out = ''
  let depth = 0
  let skip = false
  for (const c of String(css || '')) {
    if (!skip && c === '@' && depth === 0) skip = true
    if (c === '{') {
      depth++
    } else if (c === '}') {
      depth = Math.max(0, depth - 1)
      if (skip && depth === 0) {
        skip = false
        continue
      }
    } else if (skip && c === ';' && depth === 0) {
      skip = false
      continue
    }
    if (!skip) out += c
  }
  return out
}

// A presentation attribute takes no !important, as on the server.
const withoutImportant = (paint) =>
  paint
    .split(';')
    .map((d) => d.replace(/\s*!\s*important\s*$/i, ''))
    .join(';')

// easy_svg_icon_inline_class_paint: only `.a, .b { paint }` rules, in sheet order, through the paint filter.
export const classPaintRules = (sheets) => {
  const rules = []
  for (const sheet of sheets) {
    const css = cssWithoutAtBlocks(String(sheet || '').replace(/\/\*[\s\S]*?\*\//g, ''))
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const paint = withoutImportant(paintStyle(body))
      if (!paint) continue
      for (const selector of selectors.split(',')) {
        const m = selector.match(/^\s*\.(-?[A-Za-z_][\w-]*)\s*$/)
        if (m) rules.push([m[1], paint])
      }
    }
  }
  return rules
}

// The attributes one element gets; mix-blend-mode and isolation stay off, as the server drops them from class rules.
export const classPaintFor = (classNames, rules) => {
  const names = new Set(String(classNames || '').trim().split(/\s+/))
  const attrs = []
  for (const [name, paint] of rules) {
    if (!names.has(name)) continue
    for (const d of paint.split(';')) {
      const at = d.indexOf(':')
      const prop = d.slice(0, at)
      if (at < 0 || prop === 'mix-blend-mode' || prop === 'isolation') continue
      attrs.push([prop, d.slice(at + 1)])
    }
  }
  return attrs
}

// easy_svg_keep_fontawesome_comment: rebuilt from fixed words and the numbers found, never copied from the paste.
const FA = /<!--!\s*Font Awesome ([A-Z][a-z]{2,7}\+?) (\d{1,3}\.\d{1,3}\.\d{1,3}) by @fontawesome(?:(?!-->)[\s\S])*?(?:Copyright (\d{4}) Fonticons|-->)/
export const fontAwesomeComment = (original) => {
  const m = String(original || '').match(FA)
  if (!m) return ''
  const licence = m[1] === 'Free'
    ? 'https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)'
    : 'https://fontawesome.com/license (Commercial License)'
  const year = m[3] ? ` ${m[3]}` : ''
  return `<!--! Font Awesome ${m[1]} ${m[2]} by @fontawesome - https://fontawesome.com License - ${licence} Copyright${year} Fonticons, Inc. -->`
}

export const keepFontAwesomeComment = (clean, original) => {
  const comment = fontAwesomeComment(original)
  if (!comment || String(clean).includes('<!--! Font Awesome')) return String(clean)
  return String(clean).replace(/<svg\b(?:[^>"']|"[^"]*"|'[^']*')*(?<!\/)>/, (tag) => tag + comment)
}
