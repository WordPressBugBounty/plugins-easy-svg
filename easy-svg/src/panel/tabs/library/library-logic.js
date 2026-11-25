// What the library decides, apart from React, so tests/library-logic.mjs runs it as the screen does.

// An icon's address as a block names it: a set's own ref, or the library's.
export const refOf = (ic) => ic.ref || `easy-svg/${ic.slug}`

// Icons in use first, the switched-off ones after them; each keeps its order. The library is paged by the server, so as it answered.
const onFirst = (list) => [...list.filter((ic) => !ic.off), ...list.filter((ic) => ic.off)]

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

// Empty, with the upload area in place of Edit and the tools: All icons counts like the library, a search never does.
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
