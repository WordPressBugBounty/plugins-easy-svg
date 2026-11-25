const escapeName = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// A grid shows the same drawing many times in one document: each copy gets ids of its own, as easy_svg_scope_icon_ids() does on the page.
// The scope is the caller's and stable (React's useId), so a re-render keeps the same markup.
export const scopeSvgIds = (svg, scope) => {
  const markup = String(svg || '')
  const prefix = String(scope || '').replace(/[^A-Za-z0-9_-]/g, '')
  const start = markup.search(/<svg(?![\w])/i)
  const end = markup.toLowerCase().lastIndexOf('</svg>')
  if (!prefix || start < 0 || end < start) return markup
  const stop = end + 6
  let region = markup.slice(start, stop)
  const ids = [...new Set([...region.matchAll(/<[^>]*?\sid\s*=\s*(["'])([A-Za-z_][\w.:-]*)\1/g)].map((m) => m[2]))]
  if (!ids.length) return markup
  const map = new Map(ids.map((id) => [id, `${prefix}-${id}`]))
  const names = ids.map(escapeName).join('|')
  const href = new RegExp(`^(\\s*#)(${names})(\\s*)$`)
  const url = new RegExp(`(url\\(\\s*(?:["']|&quot;|&#0*39;)?\\s*#)(${names})(?=\\s*(?:["']|&quot;|&#0*39;)?\\s*\\))`, 'gi')
  region = region.replace(/<[^>]+>/g, (tag) =>
    tag.replace(/(\s)([\w:.-]+)(\s*=\s*)("[^"]*"|'[^']*')/g, (_all, space, name, eq, quoted) => {
      const attr = name.toLowerCase()
      let value = quoted.slice(1, -1)
      if (attr === 'id') value = map.get(value) ?? value
      else if (attr === 'href' || attr === 'xlink:href') value = value.replace(href, (_m, a, id, b) => a + map.get(id) + b)
      else if (attr === 'aria-labelledby' || attr === 'aria-describedby') value = value.trim().split(/\s+/).map((t) => map.get(t) ?? t).join(' ')
      value = value.replace(url, (_m, head, id) => head + map.get(id))
      return space + name + eq + quoted[0] + value + quoted[0]
    }),
  )
  return markup.slice(0, start) + region + markup.slice(stop)
}
