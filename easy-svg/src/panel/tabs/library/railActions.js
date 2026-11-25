import { arrayMove } from '@dnd-kit/sortable'
import { placeInOrder, sortIdOf } from '../../rail-sort.jsx'
import { __, sprintf } from '@wordpress/i18n'

// Called once per render of Library, as the handlers were declared there: each closure reads that render's state.
export function railActions({
  collections, neighbour, orderChain, orderSaved, orderSeq, railAnchor, setCollections, setEntries, setErr,
  setOrderSaid, setRailPick, setStatus, sortOwn, sortedById, view,
}) {
  // Shift: every set from the anchor to this one, in the rail's order.
  // Cmd/Ctrl: this one in or out. The set on show counts as picked at the start.
  function pickInRail(id, how) {
    const order = setEntries.items.map((e) => e.id)
    setRailPick((cur) => {
      const next = new Set(cur)
      if (!next.size && collections.some((c) => c.id === view && !c.readonly)) {
        next.add(view)
      }
      if ('range' === how) {
        const from = order.indexOf(railAnchor.current ?? view)
        const to = order.indexOf(id)
        if (from < 0 || to < 0) {
          next.add(id)
        } else {
          next.clear()
          order.slice(Math.min(from, to), Math.max(from, to) + 1).forEach((x) => next.add(x))
        }
      } else if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  // A set dropped among its provider's sets: shown there at once, then saved;
  // a refusal puts the list back and says why.
  function reorderSets(activeId, overId) {
    const from = sortedById(activeId)
    const to = sortedById(overId)
    if (!from || !to || from === to || from.provider !== to.provider) {
      return
    }
    const own = (c) => sortOwn(c) && c.provider === from.provider
    const before = collections.filter(own).map((c) => c.id)
    saveOrder(from, own, before, arrayMove(before, before.indexOf(from.id), before.indexOf(to.id)))
  }
  function moveSet(c, step) {
    const to = neighbour(c, step)
    if (to) {
      reorderSets(sortIdOf(c), sortIdOf(to))
    }
  }
  function saveOrder(from, own, before, ids) {
    setCollections((list) => placeInOrder(list, own, ids))
    setErr('')
    if (!orderSaved.current) {
      orderSaved.current = before
    }
    const seq = ++orderSeq.current
    const sets = ids.map((id) => collections.find((c) => c.id === id))
    // Only the latest save may speak or roll back: an older one is already overtaken.
    orderChain.current = orderChain.current
      .then(() => from.provider.reorder({ ids, collections: sets }))
      .then(
        (done) => {
          orderSaved.current = ids
          if (seq === orderSeq.current) {
            orderSaved.current = null
            // Said once the server has kept it, so a screen reader never hears a move that is undone.
            setOrderSaid(
              sprintf(
                // translators: 1: the set's name; 2: its new position, counted from the top; 3: how many sets can be ordered.
                __('%1$s moved to position %2$d of %3$d.', 'easy-svg'),
                from.label || from.id,
                ids.indexOf(from.id) + 1,
                ids.length
              )
            )
            if (done?.message) {
              setStatus(done.message)
            }
          }
        },
        (e) => {
          if (seq === orderSeq.current) {
            const back = orderSaved.current || before
            orderSaved.current = null
            setCollections((list) => placeInOrder(list, own, back))
            setErr(e?.message || __('The new order could not be saved.', 'easy-svg'))
            setOrderSaid(
              sprintf(
                // translators: 1: the set's name; 2: its position again, counted from the top.
                __('The order could not be saved. %1$s is back at position %2$d.', 'easy-svg'),
                from.label || from.id,
                back.indexOf(from.id) + 1
              )
            )
          }
        }
      )
  }
  return { pickInRail, reorderSets, moveSet }
}
