// Drawings on demand, so a set of 30,000 is searchable whole without its megabytes of markup in the browser.

// The tiles that still need a drawing, by the provider that can draw them.
// A ref already asked for is not asked again, answered or not.
export function missingMarkup(tiles, asked) {
  const need = new Map()
  for (const ic of tiles) {
    const provider = ic.source?.provider
    if (ic.content || 'function' !== typeof provider?.markup || asked.has(ic.ref)) {
      continue
    }
    need.set(provider, [...(need.get(provider) || []), ic.ref])
  }
  return need
}

// The collections with the drawings folded in. Only the collections and icons
// that change are new objects; with nothing to fold in, the same array back.
export function withMarkup(collections, got) {
  if (!got || 0 === Object.keys(got).length) {
    return collections
  }
  let changed = false
  const next = collections.map((c) => {
    if (!c.icons.some((ic) => !ic.content && got[ic.ref])) {
      return c
    }
    changed = true
    return { ...c, icons: c.icons.map((ic) => (!ic.content && got[ic.ref] ? { ...ic, content: got[ic.ref] } : ic)) }
  })
  return changed ? next : collections
}
