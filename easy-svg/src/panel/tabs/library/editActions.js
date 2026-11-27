import { __, _n, sprintf } from '@wordpress/i18n'
import { settleEach } from '../../load-guard.js'
import { callForms, copyText, nameOf, refOf } from './helpers.js'

// Called once per render of Library, as the handlers were declared there: each closure reads that render's state.
export function editActions({
  act, allPicked, api, clear, copyTargetsOf, copyTo, ctx, keep, moveTarget, moveTo, moving, pickEvery, recentSets,
  reloadCollections, remember, setBusy, setConfirming, setCopyHelp, setDetails, setDraftName, setErr,
  setMoveNaming, setMoveQuery, setMoveTarget, setMoved, setMoving, setPicked, setRecentSets, setStatus, shown,
  take, targets, libraryTarget,
}) {
  function openDetails(ic, focus = null) {
    remember()
    setDraftName(nameOf(ic))
    setDetails({ id: ic.id, focus })
  }
  function closeDetails() {
    setDetails(null)
  }
  // One icon or the selection, into a set chosen in the move dialog.
  function openMove(list, copier = null) {
    setMoving({
      // With a copier the dialog copies into the set; the source keeps its icons.
      copy: copier,
      refs: list.map(refOf),
      copies: list.every((ic) => !ic.source),
      from: 1 === list.length ? list[0].collection : null,
      library: copier ? null : libraryTarget(list),
    })
    setMoveTarget('')
    setMoveQuery('')
    setMoveNaming(null)
  }
  function confirmMove() {
    const collection = [moving?.library, ...targets].find((c) => c && c.id === moveTarget)
    const refs = moving?.refs || []
    setMoving(null)
    closeDetails()
    const copying = moving?.copy
    const into = copying ? copyTargetsOf(copying).find((c) => c.id === moveTarget) : null
    // A copy never turns into a move, even when its set is gone by now.
    if (copying) {
      if (into) {
        copyTo(copying, into.id, refs)
      }
      return
    }
    if (collection) {
      const next = [collection.id, ...recentSets.filter((id) => id !== collection.id)].slice(0, 3)
      setRecentSets(next)
      try {
        window.localStorage.setItem('easy-svg:recent-sets', JSON.stringify(next))
      } catch {
        // Storage refused: the list simply starts empty next time.
      }
      moveTo(collection, refs)
    }
  }
  // One job per source: a provider that fails leaves the others done, and only those are undone.
  async function runSwitch(list, off) {
    const library = list.filter((ic) => !ic.source)
    const groups = new Map()
    list.filter((ic) => ic.canSwitch).forEach((ic) => groups.set(ic.source, [...(groups.get(ic.source) || []), ic]))
    const jobs = [
      ...(library.length ? [{ items: library, run: async () => take(await api.post('/library/off', { ids: library.map((ic) => ic.id), off, limit: keep() })) }] : []),
      ...[...groups].map(([collection, items]) => ({ items, run: () => collection.provider.switchIcons({ refs: items.map(refOf), off, collection }) })),
    ]
    const { done, failed } = await settleEach(jobs)
    const doneItems = done.flatMap((j) => j.items)
    return { done: doneItems, failed, asked: jobs.reduce((sum, j) => sum + j.items.length, 0) }
  }
  // "n of m" when part of a switch failed, with the reason after it.
  const partialSwitch = (n, m, off, why) =>
    `${off
      ? sprintf(
          // translators: 1: number of icons switched off, 2: number of icons asked for.
          _n('%1$d of %2$d icon switched off.', '%1$d of %2$d icons switched off.', m, 'easy-svg'),
          n,
          m
        )
      : sprintf(
          // translators: 1: number of icons switched on, 2: number of icons asked for.
          _n('%1$d of %2$d icon switched on.', '%1$d of %2$d icons switched on.', m, 'easy-svg'),
          n,
          m
        )} ${why}`
  const whyNot = (failed) => failed[0]?.error?.message || __('Some icons could not be switched.', 'easy-svg')
  // Switched-off icons stay drawn where used but are no longer offered in the editor.
  async function switchIcons(list, off) {
    setBusy(true)
    setErr('')
    try {
      const { done: doneItems, failed, asked: m } = await runSwitch(list, off)
      const n = doneItems.length
      // Nothing switched is an error; part switched is a red line that keeps its Undo.
      if (failed.length && !n) {
        setErr(whyNot(failed))
      }
      setMoved(
        n
          ? {
              failed: failed.length > 0,
              message: failed.length
                ? partialSwitch(n, m, off, whyNot(failed))
                : off
                  ? sprintf(
                      // translators: %d: number of icons switched off.
                      _n('%d icon switched off.', '%d icons switched off.', n, 'easy-svg'),
                      n
                    )
                  : sprintf(
                      // translators: %d: number of icons switched on.
                      _n('%d icon switched on.', '%d icons switched on.', n, 'easy-svg'),
                      n
                    ),
              // Run inside undoMove, which holds busy and reads the collections after.
              undo: async () => {
                const back = await runSwitch(doneItems, !off)
                return back.failed.length
                  ? { message: partialSwitch(back.done.length, back.asked, !off, whyNot(back.failed)), failed: true }
                  : { message: __('Undone.', 'easy-svg') }
              },
            }
          : null
      )
    } finally {
      reloadCollections.current()
      setBusy(false)
    }
  }
  function removeIcon(ic, fromDetails = false) {
    if (!fromDetails) {
      remember()
    }
    closeDetails()
    // Every delete asks first, a set's icon too, though Undo could bring it back.
    setConfirming(ic.canRemove ? { id: ic.id, setIcon: ic } : { id: ic.id })
  }
  // Every page of the view, ticked or cleared at once.
  function toggleAll() {
    if (allPicked) {
      setPicked(new Set())
      return
    }
    pickEvery()
  }
  function togglePicked(id, on) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (on) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }
  async function rename(id, value) {
    const next = value.trim()
    if (!next) {
      return
    }
    const tile = shown.find((ic) => ic.id === id)
    if (tile?.canRename) {
      if (next !== nameOf(tile)) {
        await act(() => tile.source.provider.relabel({ ref: refOf(tile), label: next, collection: tile.source }))
      }
      return
    }
    setBusy(true)
    clear()
    try {
      take(await api.post('/library/rename', { id, label: next, limit: keep() }))
      setStatus(__('Icon renamed.', 'easy-svg'))
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function copyCall(ic, form = 'php') {
    // A collection's icon is called by its full address; a library icon by
    // its slug, which is what the free collection answers to.
    const chosen = callForms(ic, ctx.iconBlock).find((f) => f.id === form && !f.disabled) || callForms(ic, false)[0]
    if (!chosen) return
    const text = chosen.text
    clear()
    if (await copyText(text)) {
      setStatus(
        // translators: %s: the PHP call that renders the icon, e.g. easy_svg_icon( 'heart' ).
        sprintf(__('Copied %s to the clipboard.', 'easy-svg'), text)
      )
      return
    }
    // Neither way copied: the text is handed over to be copied by hand rather than leave a dead button.
    setCopyHelp(text)
  }
  return {
    openDetails, closeDetails, openMove, confirmMove, switchIcons, removeIcon, toggleAll, togglePicked, rename,
    copyCall,
  }
}
