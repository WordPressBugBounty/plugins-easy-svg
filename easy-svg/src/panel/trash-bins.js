// A provider's own trash, shown in the library's one Trash view beside the library's icons (optional `trashBin`).

// Null unless the bin can be read, restored from and emptied: half a bin would offer a button that does nothing.
export function binOf(provider) {
  const bin = provider && provider.trashBin
  if (!bin || 'function' !== typeof bin.load || 'function' !== typeof bin.restore || 'function' !== typeof bin.purge) {
    return null
  }
  return bin
}

const entryOf = (row) => ({
  id: row.id,
  label: String(row.label || row.id),
  detail: 'string' === typeof row.detail ? row.detail : '',
  trashedAt: 'string' === typeof row.trashedAt ? row.trashedAt : '',
})

// Every bin asked at once. One that fails is kept and marked, so its section can say so while the others list.
export function loadBins(providers, signal) {
  return Promise.all(
    providers
      .filter((p) => binOf(p))
      .map((p) => {
        const api = binOf(p)
        const bin = { id: p.id, title: String(api.title || p.id), max: Math.max(1, Math.floor(Number(api.max)) || 1), icons: 'icons' === api.kind, api, entries: [], failed: false }
        return Promise.resolve()
          .then(() => api.load({ signal }))
          .then(
            (rows) => ({ ...bin, entries: (Array.isArray(rows) ? rows : []).filter((r) => r && (r.id || 0 === r.id)).map(entryOf) }),
            () => ({ ...bin, failed: true })
          )
      })
  )
}

export function binTotal(bins) {
  return bins.reduce((n, bin) => n + bin.entries.length, 0)
}

// A bin of kind 'icons' holds single icons; any other holds sets. The sentences count each under its own word.
export function binCounts(bins) {
  const icons = bins.filter((bin) => bin.icons).reduce((n, bin) => n + bin.entries.length, 0)
  return { icons, sets: binTotal(bins) - icons }
}

// Several remove() answers of a provider as one toast: every sentence, each Undo in reverse, and Open trash when
// one of them says its icons went to the provider's bin.
export function joinRemoved(answers, { fallback = '', undone = '' } = {}) {
  const undos = answers.map((answer) => answer && answer.undo).filter((undo) => 'function' === typeof undo)
  return {
    message: answers.map((answer) => (answer && answer.message) || fallback).join(' '),
    undo: undos.length
      ? async () => {
          for (const undo of undos.slice().reverse()) {
            await undo()
          }
          return { message: undone }
        }
      : null,
    openTrash: answers.some((answer) => !!(answer && answer.openTrash)),
  }
}

export function chunksOf(ids, max) {
  const size = Math.max(1, Math.floor(Number(max)) || 1)
  const out = []
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size))
  }
  return out
}

// One call per chunk, in turn. A call that fails ends the run: what was counted before it stays counted.
export async function inChunks(ids, max, run) {
  let count = 0
  for (const chunk of chunksOf(ids, max)) {
    try {
      const answer = await run(chunk)
      count += Math.max(0, Math.min(chunk.length, Number(answer && answer.count) || 0))
    } catch (e) {
      return { count, error: (e && e.message) || '', failed: true }
    }
  }
  return { count, error: '', failed: false }
}

// A bin that failed to load has no entries to purge: Empty trash names it instead of passing it by.
export function unreadBins(bins) {
  return bins.filter((bin) => bin.failed)
}

// The library's trash, a page at a time until it answers empty. A page that lost nothing is stepped over, so icons that
// will not go never hide the ones behind them; an id refused in several rounds is counted once. At the bound one more
// look says whether icons remain, so the message never passes a full trash for an empty one.
export async function emptyPaged(list, purge, pageSize, rounds = 100) {
  let gone = 0
  let offset = 0
  let emptied = false
  const stuck = new Set()
  for (let round = 0; round < rounds; round++) {
    const ids = await list(offset)
    if (!ids.length) {
      emptied = true
      break
    }
    const done = await purge(ids)
    const purged = ((done && done.purged) || []).length
    gone += purged
    ;((done && done.missed) || []).forEach((id) => stuck.add(id))
    if (!purged) {
      offset += pageSize
    }
  }
  const remain = !emptied && (await list(offset)).length > 0
  return { gone, missed: stuck.size, remain }
}

// One delete per id, in turn. The first that fails ends the run; what went before it is kept, so its Undo is not lost.
export async function deleteEach(ids, run) {
  const out = { gone: 0, trashed: [], fresh: null, error: '' }
  for (const id of ids) {
    try {
      const answer = await run(id)
      out.fresh = answer
      out.gone++
      if (answer && true === answer.trashed) {
        out.trashed.push(id)
      }
    } catch (e) {
      out.error = (e && e.message) || ''
      break
    }
  }
  return out
}

// A selection in the blocks the route takes, one request each. A block that fails or misses an icon ends the run;
// what went before it is kept, so its Undo is not lost.
export async function deleteInChunks(ids, run, size) {
  const out = { gone: 0, trashed: [], fresh: null, error: '' }
  for (const chunk of chunksOf(ids, size)) {
    try {
      const answer = await run(chunk)
      out.fresh = answer
      out.trashed.push(...((answer && answer.trashed) || []))
      out.gone += ['trashed', 'deleted', 'gone'].reduce((n, key) => n + ((answer && answer[key]) || []).length, 0)
      if (answer && answer.missed && answer.missed.length) {
        out.error = answer.message || ''
        break
      }
    } catch (e) {
      out.error = (e && e.message) || ''
      break
    }
  }
  return out
}

// A next page behind the list: the server rounds an offset down to a whole page, so an icon may come twice.
export function appendUnique(list, more) {
  const seen = new Set(list.map((item) => item.id))
  return [...list, ...more.filter((item) => !seen.has(item.id))]
}
