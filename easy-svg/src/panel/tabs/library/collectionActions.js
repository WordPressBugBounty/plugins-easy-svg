import { __, _n, sprintf } from '@wordpress/i18n'
import { binOf, joinRemoved } from '../../trash-bins.js'
import { COPY_BATCH, MOVE_BATCH, refOf, countedLine, reasonOf, libraryPath } from './helpers.js'
import { relocated, sendInTurns } from './library-logic.js'

// Called once per render of Library, as the handlers were declared there: each closure reads that render's state.
export function collectionActions({
  api, askList, busy, collectionTiles, collections, confirmIds, confirming, ctx, exportTooMany, exporter,
  focusSoon, giveBack, moved, pickedLibrary, pickedTiles, query, queryRef, reloadCollections, remember,
  removable, remove, renamer, rule, ruleRename, setBusy, setConfirming, setErr, setMoved, setPicked, setRule,
  setRuleRename, setStatus, setView, setWorking, take, view, setCollections, collectionsNow, setLanded,
}) {
  async function moveTo(collection, refs) {
    // A read-only icon is copied, never moved: a mixed pick moves the rest and says so.
    const locked = new Set(collectionTiles.filter((ic) => ic.source?.readonly).map(refOf))
    const kept = refs.filter((ref) => locked.has(ref)).length
    const keptLine = kept
      ? sprintf(
          // translators: %d: number of read-only icons that were not moved.
          _n('%d read-only icon stayed where it is.', '%d read-only icons stayed where they are.', kept, 'easy-svg'),
          kept
        )
      : ''
    const going = refs.filter((ref) => !locked.has(ref) && !ref.startsWith(`${collection?.id}/`))
    if (!collection) {
      return
    }
    if (!going.length) {
      if (kept) {
        setStatus(keptLine)
      }
      return
    }
    setBusy(true)
    setErr('')
    // A provider takes a bounded batch, so a big selection goes in turns; the
    // way back undoes them newest first.
    const said = []
    const undos = []
    // What the add-on says it did, batch by batch; without counts the line
    // falls back to what the refs suggest.
    const tally = { moved: 0, copied: 0, exists: 0, counted: false }
    // Every row the add-on reported, or null once one batch reported none.
    let rows = []
    // Refs in the batches that went through, and why the next one did not.
    let sent = 0
    let failure = null
    try {
      for (let i = 0; i < going.length; i += MOVE_BATCH) {
        const batch = going.slice(i, i + MOVE_BATCH)
        if (going.length > MOVE_BATCH) {
          setWorking({ verb: 'move', done: i, total: going.length })
        }
        const done = await collection.provider.move({ refs: batch, to: collection.id })
        sent += batch.length
        rows = rows && Array.isArray(done?.rows) ? [...rows, ...done.rows] : null
        said.push(done?.message || __('Moved.', 'easy-svg'))
        if ('function' === typeof done?.undo) {
          undos.push(done.undo)
        }
        if ('number' === typeof done?.moved) {
          tally.counted = true
          tally.moved += done.moved
          tally.copied += done.copied || 0
          tally.exists += done.exists || 0
        }
      }
    } catch (e) {
      failure = e
    } finally {
      // Nothing done is an error; part done is a red line that keeps its Undo.
      if (failure && !said.length) {
        setErr(reasonOf(failure))
      }
      const line = tally.counted
        ? countedLine(tally)
        : going.every((ref) => ref.startsWith('easy-svg/'))
          ? sprintf(
              // translators: %d: number of icons copied into a set.
              _n('%d icon copied.', '%d icons copied.', sent, 'easy-svg'),
              sent
            )
          : sprintf(
              // translators: %d: number of icons moved.
              _n('%d icon moved.', '%d icons moved.', sent, 'easy-svg'),
              sent
            )
      setMoved(
        said.length
          ? {
              // One short line that says whether the icon was copied or moved; the add-on's details would make it a paragraph.
              message: [line, failure ? reasonOf(failure) : '', keptLine].filter(Boolean).join(' '),
              failed: !!failure,
              undo: undos.length
                ? async () => {
                    const back = []
                    for (const undo of undos.slice().reverse()) {
                      back.push((await undo())?.message || __('Undone.', 'easy-svg'))
                    }
                    return { message: back.join(' ') }
                  }
                : null,
            }
          : null
      )
      if (said.length) {
        setPicked(new Set())
      }
      // Applied in place when every row is known; otherwise, and after a failure, the index is read again.
      const local = !failure && !going.some((ref) => ref.startsWith('easy-svg/')) ? relocated(collectionsNow.current, rows) : null
      if (local) {
        setCollections(local)
        // The tiles hidden at the drop are gone from their set now; a later move back must show them again.
        setLanded((was) => {
          const left = new Set(was)
          rows.forEach((r) => left.delete(r.ref))
          return left
        })
      } else {
        reloadCollections.current()
      }
      // A library icon moved into a set leaves the library: its list is read again, or the tile stays behind.
      if (said.length && going.some((ref) => ref.startsWith('easy-svg/'))) {
        const term = queryRef.current.trim()
        const isLatest = askList()
        api.get(libraryPath(term)).then((res) => isLatest() && take(res, !!term)).catch((e) => setErr(reasonOf(e)))
      }
      setWorking(null)
      setBusy(false)
    }
  }
  // A read-only source is copied through the provider's copy(), never moved.
  const copierOf = (list) => {
    const p = list[0]?.source?.provider
    return list.length && 'function' === typeof p?.copy && list.every((ic) => ic.source?.readonly && ic.source.provider === p) ? p : null
  }
  const copyTargetsOf = (p) => collections.filter((c) => !c.readonly && c.provider === p)
  async function copyTo(provider, to, refs) {
    // One change at a time: a menu entry can still be chosen while one runs.
    if (!provider || !refs.length || busy) {
      return
    }
    setBusy(true)
    setErr('')
    const said = []
    const undos = []
    let sent = 0
    let failure = null
    // The copy worked but the list could not be read again: said apart, not a failed copy.
    let stale = false
    const staleLine = __('Copied, but the list could not be reloaded.', 'easy-svg')
    // A library copy is a new library icon: the list is read again, after the copy and after its undo.
    const relist = async () => {
      if ('easy-svg' !== to) {
        return
      }
      const term = queryRef.current.trim()
      const isLatest = askList()
      const res = await api.get(libraryPath(term))
      if (isLatest()) {
        take(res, !!term)
      }
    }
    // A copy touches no page, so it goes in turns of COPY_BATCH; what an older add-on leaves out goes again.
    let resent = null
    try {
      const turns = await sendInTurns({
        refs,
        size: COPY_BATCH,
        send: (batch) => provider.copy({ refs: batch, to }),
        progress: (done, total) => setWorking({ verb: 'copy', done, total }),
      })
      turns.answers.forEach((done) => {
        said.push(done?.message || __('Copied.', 'easy-svg'))
        if ('function' === typeof done?.undo) {
          undos.push(done.undo)
        }
      })
      sent = turns.sent
      failure = turns.failure || (turns.stalled ? new Error(__('The add-on took none of these icons. Try again.', 'easy-svg')) : null)
      // Each turn's own line would say icons were left out that went in the next one: the rows are counted instead.
      if (turns.resent) {
        const rows = turns.answers.flatMap((done) => done?.rows ?? [])
        resent = countedLine({
          moved: 0,
          copied: rows.filter((r) => 'copied' === r?.state).length,
          exists: rows.filter((r) => 'exists' === r?.state).length,
        })
      }
    } catch (e) {
      failure = e
    } finally {
      setWorking(null)
      // Read again whenever something was copied, a partial copy too.
      if (said.length) {
        try {
          await relist()
        } catch {
          stale = true
        }
      }
      // Nothing copied is an error; part copied is a red line that keeps its Undo.
      if (failure && !said.length) {
        setErr(reasonOf(failure))
      }
      setMoved(
        said.length
          ? {
              message: failure
                ? `${sprintf(
                    // translators: 1: number of icons copied, 2: number of icons asked for.
                    _n('%1$d of %2$d icon copied.', '%1$d of %2$d icons copied.', refs.length, 'easy-svg'),
                    sent,
                    refs.length
                  )} ${reasonOf(failure)}${stale ? ` ${staleLine}` : ''}`
                : stale
                  ? staleLine
                  : resent || said.join(' '),
              failed: !!failure,
              undo: undos.length
                ? async () => {
                    const back = []
                    for (const undo of undos.slice().reverse()) {
                      back.push((await undo())?.message || __('Undone.', 'easy-svg'))
                    }
                    stale = false
                    try {
                      await relist()
                    } catch {
                      stale = true
                    }
                    reloadCollections.current()
                    return { message: stale ? `${back.join(' ')} ${__('The list could not be reloaded.', 'easy-svg')}` : back.join(' ') }
                  }
                : null,
            }
          : null
      )
      if (said.length) {
        setPicked(new Set())
      }
      reloadCollections.current()
      setBusy(false)
    }
  }
  // Per collection and in the batches a move takes, so a provider that asks
  // what each icon is still called from is never handed more than it answers.
  async function removeFromSets(tiles) {
    const groups = new Map()
    tiles.forEach((ic) => groups.set(ic.source, [...(groups.get(ic.source) || []), refOf(ic)]))
    const answers = []
    const done = await act(async () => {
      const total = [...groups.values()].reduce((sum, refs) => sum + refs.length, 0)
      let gone = 0
      for (const [collection, refs] of groups) {
        for (let i = 0; i < refs.length; i += MOVE_BATCH) {
          if (total > MOVE_BATCH) {
            setWorking({ verb: 'remove', done: gone, total })
          }
          gone += Math.min(MOVE_BATCH, refs.length - i)
          answers.push(await collection.provider.remove({ refs: refs.slice(i, i + MOVE_BATCH), collection }))
        }
      }
      const said = joinRemoved(answers, { fallback: __('Removed.', 'easy-svg'), undone: __('Undone.', 'easy-svg') })
      return { ...said, openTrash: ctx.canManage && said.openTrash }
    })
    if (done) {
      setPicked(new Set())
    }
    return done
  }
  // A pick is asked about once, whatever it holds.
  function removePicked() {
    remember()
    setConfirming({ bulk: true })
  }
  async function confirmRemove() {
    if (confirming?.setIcon) {
      const ic = confirming.setIcon
      setConfirming(null)
      await act(() => ic.source.provider.remove({ refs: [refOf(ic)], collection: ic.source }))
      focusSoon(giveBack)
      return
    }
    if (!confirming?.bulk) {
      await remove(confirmIds)
      return
    }
    const sets = removable
    const library = pickedLibrary
    if (sets.length && !(await removeFromSets(sets))) {
      setConfirming(null)
      return
    }
    await remove(library, { alongside: sets.length > 0 })
    setConfirming(null)
  }
  async function exportPicked() {
    if (!exporter || !pickedTiles.length || exportTooMany) {
      return
    }
    await act(() => exporter.exportIcons({ refs: pickedTiles.map(refOf) }))
  }
  // A sidebar action: its answer is said where a move's is, Undo included.
  async function act(run) {
    setBusy(true)
    setErr('')
    try {
      const done = await run()
      setMoved({ message: done?.message || __('Done.', 'easy-svg'), undo: 'function' === typeof done?.undo ? done.undo : null, openTrash: !!done?.openTrash })
      reloadCollections.current()
      return done
    } catch (e) {
      setErr(e.message)
      return null
    } finally {
      setWorking(null)
      setBusy(false)
    }
  }
  function openRuleRename(list) {
    remember()
    setRule({ find: '', replace: '', prefix: '', suffix: '' })
    setRuleRename({ refs: list.map(refOf), plan: null, error: '' })
  }
  async function applyRuleRename() {
    const { refs } = ruleRename
    setRuleRename(null)
    await act(async () => {
      await renamer.renameApply({ refs, rule })
      take(await api.get(libraryPath(query.trim())))
      const n = refs.length
      return {
        message: sprintf(
          // translators: %d: number of icons renamed.
          _n('%d icon renamed.', '%d icons renamed.', n, 'easy-svg'),
          n
        ),
      }
    })
  }
  async function runHint(hint) {
    setBusy(true)
    setErr('')
    try {
      await hint.action.run()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  async function trashCollection(collection) {
    // The provider's own sentence, which says where the set went; the library's only when it gives none.
    const done = await act(async () => {
      const answer = await collection.provider.trash({ id: collection.id, collection })
      return {
        ...answer,
        message:
          ('string' === typeof answer?.message && answer.message.trim()) ||
          sprintf(
            // translators: %s: name of the set.
            __('“%s” deleted.', 'easy-svg'),
            collection.label || collection.id
          ),
        // Only where the Trash view lists this provider's sets; otherwise the button would lead to a view without it.
        openTrash: ctx.canManage && !!binOf(collection.provider),
      }
    })
    if (done && view === collection.id) {
      setView('library')
    }
  }

  // Enter keeps the name, Escape drops it; leaving the field drops it too, so a
  // half-typed name never becomes a set by accident.
  // Labelled with its own buttons, because Enter alone is not discoverable.
  async function undoMove() {
    const undo = moved?.undo
    if (!undo) {
      return
    }
    setBusy(true)
    try {
      const back = await undo()
      setMoved({
        message: back?.message || __('Undone.', 'easy-svg'),
        failed: !!back?.failed,
        undo: 'function' === typeof back?.undo ? back.undo : null,
        actionLabel: back?.actionLabel,
      })
      reloadCollections.current()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  return {
    moveTo, copierOf, copyTargetsOf, copyTo, removePicked, confirmRemove, exportPicked, act, openRuleRename,
    applyRuleRename, runHint, trashCollection, undoMove,
  }
}
