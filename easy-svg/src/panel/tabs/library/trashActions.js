import { __, _n, sprintf } from '@wordpress/i18n'
import { chunksOf, deleteInChunks, emptyPaged, inChunks, unreadBins } from '../../trash-bins.js'
import { PANEL_ROOT, libraryPath, listOf, TRASH_VIEW, TRASH_PAGE, restoredSaid } from './helpers.js'

// Called once per render of Library, as the handlers were declared there: each closure reads that render's state.
export function trashActions({
  api, bins, choose, clear, confirming, ctx, focusSoon, keep, loadTrash, pickedEntries, pickedIcons,
  reloadCollections, setBusy, setConfirming, setErr, setMoved, setPicked, setSelecting, setStatus,
  setTrashPicked, take, trashAt, view, refsOfIds, hide, show, query,
}) {
  // One id or a selection, a hundred to a request, each answered with the library once.
  // `alongside`: part of a bulk removal whose set half already spoke; its
  // sentence joins that toast instead of replacing it and its Undo.
  async function remove(ids, { alongside = false } = {}) {
    const list = Array.isArray(ids) ? ids : [ids]
    if (!list.length) {
      return
    }
    setBusy(true)
    clear()
    const leaving = refsOfIds(list)
    hide(leaving)
    setConfirming(null)
    // `trashed` is what went to the trash and can come back; a site that keeps no trash answers `trashed: false`.
    // A delete that fails midway still leaves the ones before it done: they keep their message and their Undo.
    const { gone, trashed, fresh, error } = await deleteInChunks(list, (ids) => api.post('/library/delete-many', { ids, limit: keep() }), TRASH_PAGE)
    try {
      if (!gone) {
        setErr(error)
      } else if (trashed.length < gone) {
        const said = sprintf(
          // translators: %d: number of icons removed.
          _n('%d icon removed.', '%d icons removed.', gone, 'easy-svg'),
          gone
        )
        if (alongside || error) {
          setMoved((m) => {
            const before = alongside && m ? m : null
            return { ...(before || { undo: null }), message: [before?.message, said, error].filter(Boolean).join(' '), failed: !!error || !!before?.failed }
          })
        } else {
          setStatus(said)
        }
      } else {
        const said =
          1 === gone
            ? __('The icon was moved to the trash.', 'easy-svg')
            : sprintf(
                // translators: %d: number of icons moved to the trash.
                _n('%d icon was moved to the trash.', '%d icons were moved to the trash.', gone, 'easy-svg'),
                gone
              )
        const back = async () => restoredSaid(await restoreIcons(trashed))
        setMoved((m) => {
          const before = alongside && m ? m : null
          const earlier = before?.undo
          return {
            message: [before?.message, said, error].filter(Boolean).join(' '),
            failed: !!error || !!before?.failed,
            // With a set's half of the removal: both come back, the set's first.
            undo: earlier
              ? async () => {
                  await earlier()
                  return back()
                }
              : back,
            openTrash: ctx.canManage,
          }
        })
      }
    } finally {
      if (fresh) {
        take(fresh)
      } else if (gone) {
        // Stopped without a list: part may be gone, so the library is read before anything shows again.
        try {
          take(await api.get(libraryPath(query.trim())))
        } catch (e) {
          setErr(e.message)
        }
      }
      show(leaving)
      setPicked(new Set())
      setConfirming(null)
      setBusy(false)
    }
  }
  // In the blocks the route takes; each answer is the fresh library.
  async function restoreIcons(ids) {
    const back = { restored: [], missed: [], gone: [] }
    for (const chunk of chunksOf(ids, TRASH_PAGE)) {
      const fresh = await api.post('/library/restore', { ids: chunk, limit: keep() })
      back.restored.push(...(fresh?.restored || []))
      back.missed.push(...(fresh?.missed || []))
      back.gone.push(...(fresh?.gone || []))
      take(fresh)
    }
    if (TRASH_VIEW === view) {
      await loadTrash()
    }
    return back
  }
  // A row that leaves the trash takes the focused button with it: focus goes to the row now in its place, or to the title.
  const trashRows = () => Array.from(PANEL_ROOT.current?.querySelectorAll('[data-trash-view] [data-icon-key], [data-trash-view] [data-trashed-entry]') || [])
  const markTrashRow = () => {
    trashAt.current = trashRows().findIndex((row) => row.contains(window.document.activeElement))
  }
  const focusTrash = () =>
    focusSoon(() => {
      const rows = trashRows()
      return (trashAt.current > -1 && rows[Math.min(trashAt.current, rows.length - 1)]?.querySelector('button')) || PANEL_ROOT.current?.querySelector('[data-trash-title]')
    })
  function openTrash() {
    choose(TRASH_VIEW)
    setMoved(null)
    trashAt.current = -1
    focusTrash()
  }
  // One action in the Trash view: its answer is the toast, and the lists are read again whatever it answered.
  async function inTrash(run, { provider = false } = {}) {
    setBusy(true)
    clear()
    try {
      setMoved(await run())
    } catch (e) {
      setErr(e.message)
    } finally {
      await loadTrash()
      // Awaited: focus goes to the row now in its place, and the row that left is only gone once the bins are read again.
      if (provider) {
        await reloadCollections.current()
      }
      setBusy(false)
      focusTrash()
    }
  }
  function restoreTrashed(ic) {
    return inTrash(async () => restoredSaid(await restoreIcons([ic.id])))
  }
  // Picked provider entries, per bin: each bin is asked in the blocks it takes.
  const byBin = (rows) => {
    const groups = new Map()
    rows.forEach((row) => groups.set(row.bin, [...(groups.get(row.bin) || []), row.entry.id]))
    return [...groups]
  }
  const endTrashPick = () => {
    setTrashPicked(new Set())
    setSelecting(false)
  }
  // The bar's Restore, on icons and sets together; no question, as it loses nothing.
  async function restorePicked() {
    const icons = pickedIcons.map((ic) => ic.id)
    const rows = pickedEntries
    trashAt.current = -1
    await inTrash(
      async () => {
        const parts = []
        let failed = false
        if (icons.length) {
          const said = restoredSaid(await restoreIcons(icons))
          parts.push(said.message)
          failed = said.failed
        }
        // A bin of single icons is counted as icons, any other as sets: "2 sets restored" would be wrong for two icons.
        const back = { icons: 0, sets: 0 }
        const left = { icons: 0, sets: 0 }
        for (const [bin, ids] of byBin(rows)) {
          const done = (await inChunks(ids, bin.max, (chunk) => bin.api.restore(chunk))).count
          back[bin.icons ? 'icons' : 'sets'] += done
          left[bin.icons ? 'icons' : 'sets'] += ids.length - done
        }
        if (back.icons) {
          // translators: %d: number of icons restored from the trash.
          parts.push(sprintf(_n('%d icon restored.', '%d icons restored.', back.icons, 'easy-svg'), back.icons))
        }
        if (back.sets) {
          // translators: %d: number of icon sets restored from the trash.
          parts.push(sprintf(_n('%d set restored.', '%d sets restored.', back.sets, 'easy-svg'), back.sets))
        }
        if (left.icons) {
          parts.push(
            sprintf(
              // translators: %d: number of icons that are still in the trash.
              _n('%d icon could not be restored. It is still in the trash.', '%d icons could not be restored. They are still in the trash.', left.icons, 'easy-svg'),
              left.icons
            )
          )
          failed = true
        }
        if (left.sets) {
          parts.push(
            sprintf(
              // translators: %d: number of icon sets that are still in the trash.
              _n('%d set could not be restored. It is still in the trash.', '%d sets could not be restored. They are still in the trash.', left.sets, 'easy-svg'),
              left.sets
            )
          )
          failed = true
        }
        return { message: parts.join(' '), failed, undo: null }
      },
      { provider: rows.length > 0 }
    )
    endTrashPick()
  }
  function restoreEntry(bin, entry) {
    return inTrash(
      async () => {
        const back = Number((await bin.api.restore([entry.id]))?.count) > 0
        return {
          message: sprintf(
            back
              ? // translators: %s: name of what was restored from the trash, e.g. an icon set.
                __('“%s” is back.', 'easy-svg')
              : // translators: %s: name of what is still in the trash, e.g. an icon set.
                __('“%s” could not be restored. It is still in the trash.', 'easy-svg'),
            entry.label
          ),
          failed: !back,
          undo: null,
        }
      },
      { provider: true }
    )
  }
  // One row, or everything: the library's icons page by page, then each provider's bin in the blocks it takes.
  async function confirmPurge() {
    const what = confirming?.purge
    setConfirming(null)
    if (!what) {
      return
    }
    await inTrash(
      async () => {
        let gone = 0
        let missed = 0
        let unread = 0
        let remain = false
        let error = ''
        if ('icon' === what.kind) {
          const done = await api.post('/library/purge', { ids: [what.item.id] })
          gone += (done?.purged || []).length
          missed += (done?.missed || []).length
        } else if ('picked' === what.kind) {
          for (const chunk of chunksOf(what.icons, TRASH_PAGE)) {
            const done = await api.post('/library/purge', { ids: chunk })
            gone += (done?.purged || []).length
            missed += (done?.missed || []).length
          }
          for (const [bin, ids] of byBin(what.rows)) {
            const done = await inChunks(ids, bin.max, (chunk) => bin.api.purge(chunk))
            gone += done.count
            missed += ids.length - done.count
            error = error || done.error
          }
        } else if ('entry' === what.kind) {
          const done = await inChunks([what.item.id], what.bin.max, (ids) => what.bin.api.purge(ids))
          gone += done.count
          missed += 1 - done.count
          error = done.error
        } else {
          const icons = await emptyPaged(
            async (offset) => listOf(await api.get(`/library/trash?limit=${TRASH_PAGE}&offset=${offset}`)).map((ic) => ic.id),
            (ids) => api.post('/library/purge', { ids }),
            TRASH_PAGE
          )
          gone += icons.gone
          missed += icons.missed
          remain = icons.remain
          // A bin that could not be read has nothing listed to delete; the sentence below says so.
          unread = unreadBins(bins).length
          for (const bin of bins) {
            const ids = bin.entries.map((entry) => entry.id)
            const done = await inChunks(ids, bin.max, (chunk) => bin.api.purge(chunk))
            gone += done.count
            missed += ids.length - done.count
            error = error || done.error
          }
        }
        const parts = [
          sprintf(
            // translators: %d: number of icons or sets deleted from the trash.
            _n('%d item deleted permanently.', '%d items deleted permanently.', gone, 'easy-svg'),
            gone
          ),
        ]
        if (missed) {
          parts.push(
            sprintf(
              // translators: %d: number of icons or sets that are still in the trash.
              _n('%d could not be deleted.', '%d could not be deleted.', missed, 'easy-svg'),
              missed
            )
          )
        }
        if (remain) {
          parts.push(__('Some items are still in the trash. Empty it again to delete them.', 'easy-svg'))
        }
        if (unread) {
          parts.push(__('A part of the trash could not be loaded and was not emptied.', 'easy-svg'))
        }
        if (error) {
          parts.push(error)
        }
        return { message: parts.join(' '), failed: missed > 0 || unread > 0 || remain || !!error, undo: null }
      },
      { provider: 'icon' !== what.kind }
    )
    endTrashPick()
  }
  return { remove, markTrashRow, openTrash, restoreTrashed, restorePicked, restoreEntry, confirmPurge }
}
