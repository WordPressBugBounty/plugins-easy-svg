import DOMPurify from 'dompurify'
import { paintStyle, pointsAway } from './panel/paint-style.js'
import { classPaintFor, classPaintRules, keepFontAwesomeComment } from './panel/class-paint.js'

// The browser's second layer under the server's sanitiser, one rule for Free and Pro, so a draft previews the same in both.
// The svg profile keeps <style>, which restyles the whole admin page, and <image>/<feImage>, which fetch from any host.
// <a> too: a link in a preview navigates away and loses unsaved edits; its drawing stays (KEEP_CONTENT).
export const PURIFY_SVG = Object.freeze({
  USE_PROFILES: Object.freeze({ svg: true, svgFilters: true }),
  FORBID_TAGS: Object.freeze(['style', 'image', 'feImage', 'a']),
})

// A draft renders before the server sees it, so its style attributes get the server's paint-only rule here too.
// Presentation attributes and gradient or pattern links reach other hosts the same way, and a provider's icons never pass the server.
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  const name = String(data.attrName || '').toLowerCase()
  if ((name === 'href' || name === 'xlink:href') && !String(data.attrValue || '').trim().startsWith('#')) {
    data.keepAttr = false
    return
  }
  // A CSS escape such as \75 rl( spells url( where the pattern cannot see it.
  const value = String(data.attrValue || '')
  if (name !== 'style' && (pointsAway(value) || (value.includes('\\') && value.includes('(')))) {
    data.keepAttr = false
    return
  }
  if (name !== 'style') return
  data.attrValue = paintStyle(data.attrValue)
  if (!data.attrValue) data.keepAttr = false
})

// What was taken out comes with the result: DOMPurify.removed belongs to this copy, not to the bundle that asks.
// Colours set by .class rules in a <style> become attributes first, as the server does before <style> goes.
const withClassPaint = (markup) => {
  if (!/<style[\s>]/i.test(markup) || 'undefined' === typeof window || !window.DOMParser) return markup
  const doc = new window.DOMParser().parseFromString(markup, 'image/svg+xml')
  if (doc.getElementsByTagName('parsererror').length) return markup
  const rules = classPaintRules([...doc.getElementsByTagName('style')].map((s) => s.textContent))
  if (!rules.length) return markup
  for (const el of doc.querySelectorAll('[class]')) {
    for (const [prop, value] of classPaintFor(el.getAttribute('class'), rules)) el.setAttribute(prop, value)
  }
  return new window.XMLSerializer().serializeToString(doc)
}

export const purifySvg = (markup) => {
  try {
    const original = String(markup || '')
    const clean = DOMPurify.sanitize(withClassPaint(original), { ...PURIFY_SVG, FORBID_TAGS: [...PURIFY_SVG.FORBID_TAGS] })
    const svg = keepFontAwesomeComment(clean, original)
    // Font Awesome's note returns on save, so it is not named among what goes.
    const kept = svg !== clean
    const removed = [...(DOMPurify.removed || [])].filter((r) => !(kept && '#comment' === r.element?.nodeName && /Font Awesome/.test(r.element.textContent)))
    return { svg, removed }
  } catch {
    return { svg: '', removed: [] }
  }
}

export const sanitizeSvg = (markup) => purifySvg(markup).svg
