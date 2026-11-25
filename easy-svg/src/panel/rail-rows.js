// Export is Pro: with no exporter registered the library row has no menu, so the free plugin offers no export.
export function libraryMenuKind(exporter) {
  return exporter ? 'library' : ''
}

// The rail's rows with a thousand sets: built once per set object, so a set that did not change keeps its entry and its memoised row is not drawn again.
export function railEntries(collections, cache, make) {
  const names = new Map()
  for (const c of collections) {
    const name = c.label || c.id
    names.set(name, (names.get(name) || 0) + 1)
  }
  return collections.map((c) => {
    // Two sets of one name are told apart by their address.
    const twin = names.get(c.label || c.id) > 1
    const kept = cache.get(c)
    if (kept && kept.twin === twin) {
      return kept
    }
    const entry = make(c, twin)
    cache.set(c, entry)
    return entry
  })
}

// Where a read-only collection comes from, for the second line under its name when a set of the same name sits beside it.
export function twinFrom(c) {
  return c?.readonly && c.origin?.name && 'set' !== c.origin.kind ? String(c.origin.name) : ''
}

// Each sortable set's neighbours among its own provider's sets, in one pass instead of a scan of every set per row.
export function railNeighbours(collections, sortOwn) {
  const last = new Map()
  const near = new Map()
  for (const c of collections) {
    if (!sortOwn(c)) {
      continue
    }
    const before = last.get(c.provider) || null
    near.set(c, [before, null])
    if (before) {
      near.get(before)[1] = c
    }
    last.set(c.provider, c)
  }
  return near
}
