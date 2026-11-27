// What the library decides, apart from React, so tests/library-logic.mjs runs it as the screen does.

// An icon's address as a block names it: a set's own ref, or the library's.
export const refOf = (ic) => ic.ref || `easy-svg/${ic.slug}`

// Icons in use first, the switched-off ones after them; each keeps its order. The library is paged by the server, so as it answered.
const onFirst = (list) => [...list.filter((ic) => !ic.off), ...list.filter((ic) => ic.off)]

// No rail entry shows every icon at once; a search does, across the library and every set.
export function gridView({ picked, query, sets }) {
  if (sets && query.trim()) {
    return 'all'
  }
  return 'all' === picked ? 'library' : picked
}

// Icons moved onto a set leave the grid at once; the move's answer brings them back where they belong.
export function shownIcons({ view, icons, collectionTiles, landed }) {
  if ('library' === view) {
    return icons || []
  }
  if ('all' === view) {
    return [...(icons || []), ...onFirst(collectionTiles.filter((ic) => !landed.has(refOf(ic))))]
  }
  return onFirst(collectionTiles.filter((ic) => ic.collection === view && !landed.has(refOf(ic))))
}

// A read-only source keeps its icons, and a set dropped onto itself moves nothing, so neither leaves the grid.
export function landedRefs({ refs, target, collectionTiles }) {
  const locked = new Set(collectionTiles.filter((ic) => ic.source?.readonly).map(refOf))
  return new Set(refs.filter((ref) => !locked.has(ref) && !ref.startsWith(`${target.id}/`)))
}

// What is moving or being deleted is off the page before the server answers.
export function onScreen(items, landed) {
  return landed.size ? items.filter((ic) => !landed.has(refOf(ic))) : items
}

export function unland(landed, refs) {
  if (!refs.some((ref) => landed.has(ref))) {
    return landed
  }
  const left = new Set(landed)
  refs.forEach((ref) => left.delete(ref))
  return left
}

// What did not really leave its place: no row says it moved. Without rows nothing is known, so all of it.
export function notMoved({ going, rows }) {
  if (!Array.isArray(rows) || !rows.length) {
    return going
  }
  const moved = new Set(rows.filter((r) => 'moved' === r?.state).map((r) => r.ref))
  return going.filter((ref) => !moved.has(ref))
}

// The add-on that takes these set icons into the library: it has to say it can, and library icons are there already.
export function libraryMoverOf(tiles) {
  const own = tiles.filter((ic) => ic.source && !ic.source.readonly)
  const p = own[0]?.source.provider
  const all = tiles.every((ic) => ic.source) && own.every((ic) => ic.source.provider === p)
  return all && p?.movesToLibrary && 'function' === typeof p.move ? p : null
}

// Any set's icons, own or read only, may also be copied there and stay where they are.
export function libraryCopierOf(tiles) {
  const p = tiles[0]?.source?.provider
  return p && 'function' === typeof p.copy && tiles.every((ic) => ic.source?.provider === p) ? p : null
}

// No fly-back: an icon over a set, or let go on one, stays where the pointer left it.
export function dropAnimation({ dropOver, droppedOnSet }) {
  return dropOver || droppedOnSet ? null : { duration: 200, easing: 'ease-out' }
}

// Found fresh, so a rename shows at once; a moved icon is followed to its new address, and kept while that set loads.
export function detailIcon({ details, pool, seen }) {
  const found = details
    ? (details.follow && pool.find((ic) => ic.source?.id === details.follow.set && ic.slug === details.follow.slug)) || pool.find((ic) => ic.id === details.id) || null
    : null
  return { found, icon: found || (details?.follow ? seen : null) }
}

// One page of the grid: the library's icons first, a batch at a time, then the sets' own tiles.
export function pageWindow({ all, page, perPage, shown, total, view }) {
  const libraryCount = 'all' === view || 'library' === view ? Math.max(total, all.length) : 0
  const extra = 'library' === view ? [] : shown.slice('all' === view ? all.length : 0)
  const pageCount = Math.max(1, Math.ceil((libraryCount + extra.length) / perPage))
  const onPage = Math.min(page, pageCount)
  const pageStart = (onPage - 1) * perPage
  const pageEnd = pageStart + perPage
  return {
    libraryCount,
    extra,
    pageCount,
    onPage,
    // The page reaches past what was fetched: the screen asks for the next batch.
    needMore: Math.min(pageEnd, libraryCount) > all.length,
    pageItems: [
      ...all.slice(pageStart, Math.min(pageEnd, libraryCount)),
      ...extra.slice(Math.max(0, pageStart - libraryCount), Math.max(0, pageEnd - libraryCount)),
    ],
  }
}

// Empty, with the upload area in place of Edit and the tools: a search never counts as empty.
export function emptyHere({ shown, query, searching, intoSet, view }) {
  return !shown.length && !query.trim() && !searching && (!!intoSet || 'library' === view || 'all' === view)
}

// Select all reaches every icon of the view, not only the page shown: library icons fetched for it come first, as on screen.
export function everyIcon({ shown, loaded, fetched }) {
  return fetched ? [...fetched, ...shown.slice(loaded)] : shown
}

// Ticked when every icon of the view is, those not fetched yet included: a full page alone is not all.
export function allPickedIn({ shown, picked, viewTotal }) {
  return shown.length > 0 && shown.length >= viewTotal && shown.every((ic) => picked.has(ic.id))
}

// A provider that takes fewer refs a request answers the rest with over_limit: those go again in the next turn, never as failed.
export async function sendInTurns({ refs, size, send, progress }) {
  const queue = [...refs]
  const answers = []
  let sent = 0
  let failure = null
  let stalled = false
  while (queue.length) {
    // From the second turn on too: an older provider makes turns of a pick that fit in one.
    if (refs.length > size || answers.length) {
      progress?.(sent, refs.length)
    }
    const batch = queue.splice(0, size)
    let done
    try {
      done = await send(batch)
    } catch (e) {
      failure = e
      break
    }
    answers.push(done)
    const over = new Set((done?.rows ?? []).filter((r) => 'over_limit' === r?.state).map((r) => String(r.ref)))
    const again = batch.filter((ref) => over.has(ref))
    sent += batch.length - again.length
    // A turn that took nothing would ask forever.
    if (again.length === batch.length) {
      stalled = true
      break
    }
    queue.unshift(...again)
  }
  return { answers, sent, failure, stalled, resent: answers.some((d) => (d?.rows ?? []).some((r) => 'over_limit' === r?.state)) }
}

// A move the add-on reported row by row is applied here, so the whole index is not read again; null asks for the read.
export function relocated(collections, rows) {
  // A partial row leaves the icon in both places, which the read shows best.
  if (!Array.isArray(rows) || rows.some((r) => !['moved', 'exists', 'copied'].includes(r?.state))) {
    return null
  }
  let list = collections
  for (const row of rows.filter((r) => 'moved' === r.state || 'copied' === r.state)) {
    const [fromId] = String(row.ref).split('/')
    const [toId, ...rest] = String(row.to_ref || '').split('/')
    const from = list.find((c) => c.id === fromId)
    const icon = from?.icons.find((ic) => ic.ref === row.ref)
    const to = list.find((c) => c.id === toId)
    if (!icon || !to) {
      return null
    }
    const slug = rest.join('/')
    const moved = { ...icon, ref: row.to_ref, slug, key: row.to_ref }
    list = list.map((c) => {
      if (c.id === fromId && 'moved' === row.state) {
        return { ...c, icons: c.icons.filter((ic) => ic.ref !== row.ref) }
      }
      if (c.id === toId && !c.icons.some((ic) => ic.ref === row.to_ref)) {
        return { ...c, icons: [...c.icons, moved] }
      }
      return c
    })
  }
  return list
}
