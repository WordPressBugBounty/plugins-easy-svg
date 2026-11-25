import { createContext, forwardRef, useContext, useLayoutEffect, useRef } from 'react'
import { Box } from '@chakra-ui/react'
import { closestCenter, pointerWithin } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { LuGripVertical } from 'react-icons/lu'
import { __ } from '@wordpress/i18n'

// Set rows sort in the icon drags' own DndContext: a nested one would take
// the row's drop target from the icons. `set:` ids take icon drops, `sort:` the order.
const SORT = 'sort:'
export const sortIdOf = (c) => `${SORT}${c.id}`
export const isSortId = (id) => String(id).startsWith(SORT)

// An icon lands on the set under the pointer; a set row on the nearest row of
// its own provider, never on another add-on's sets.
export function railCollide(byId) {
  return (args) => {
    if (!isSortId(args.active.id)) {
      return pointerWithin({ ...args, droppableContainers: args.droppableContainers.filter((d) => String(d.id).startsWith('set:')) })
    }
    const from = byId(args.active.id)
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((d) => isSortId(d.id) && byId(d.id)?.provider === from?.provider),
    })
  }
}

// The provider's writable sets in the order of ids; the rest of the list stays put.
export function placeInOrder(list, own, ids) {
  const mine = list.filter(own)
  const byId = new Map(mine.map((c) => [c.id, c]))
  const queue = [...ids.map((id) => byId.get(id)).filter(Boolean), ...mine.filter((c) => !ids.includes(c.id))]
  let k = 0
  return list.map((c) => (own(c) ? queue[k++] : c))
}

const RowSort = createContext(null)

// A set row that also moves in the order: the row is what travels, the handle
// is the only place that starts it, so a click or an icon drop is unchanged.
export const SortRow = forwardRef(function SortRow({ sortId, disabled, as: Row, ...rest }, ref) {
  const sort = useSortable({ id: sortId, disabled })
  const node = useRef(null)
  const both = (el) => {
    node.current = el
    sort.setNodeRef(el)
    if ('function' === typeof ref) {
      ref(el)
    } else if (ref) {
      ref.current = el
    }
  }
  const t = sort.transform
  const move = t && (t.x || t.y) ? `translate3d(${Math.round(t.x)}px, ${Math.round(t.y)}px, 0)` : ''
  // Written on the node: the listbox item sets its own style and would drop ours.
  useLayoutEffect(() => {
    if (node.current) {
      node.current.style.transform = move
      node.current.style.transition = move || sort.isSorting ? sort.transition || '' : ''
    }
  }, [move, sort.transition, sort.isSorting])
  return (
    <RowSort.Provider value={sort}>
      <Row ref={both} data-dragging={sort.isDragging ? '' : undefined} position="relative" zIndex={sort.isDragging ? '3' : undefined} {...rest} />
    </RowSort.Provider>
  )
})

// The grip is for the pointer only: a button inside a listbox option is out of a
// screen reader's reach (WCAG 4.1.2). Keys move a set with Alt and the arrows.
export function SetHandle() {
  const sort = useContext(RowSort)
  if (!sort) {
    return null
  }
  return (
    <Box
      as="span"
      data-set-handle
      ref={sort.setActivatorNodeRef}
      aria-hidden="true"
      title={__('Reorder set', 'easy-svg')}
      // In the row's start padding, full row height: the name keeps its room.
      position="absolute"
      insetInlineStart="0"
      top="0"
      h="full"
      // 24px wide: the WCAG minimum to aim at, and no more of the row than that.
      w="6"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      borderRadius="forge"
      color="ui.muted"
      cursor={sort.isDragging ? 'grabbing' : 'grab'}
      touchAction="none"
      _hover={{ bg: 'ui.ghostHover' }}
      // A long press lifts the set: no iOS callout or text selection first.
      css={{ '& svg': { width: '4', height: '4' }, WebkitTouchCallout: 'none', userSelect: 'none' }}
      onPointerDown={(e) => {
        sort.listeners?.onPointerDown?.(e)
        // Not the row's press: the rail would take it as a pick.
        e.stopPropagation()
      }}
      // A finger goes to the touch sensor; the pointer sensor leaves touch alone.
      onTouchStart={(e) => {
        sort.listeners?.onTouchStart?.(e)
        e.stopPropagation()
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <LuGripVertical />
    </Box>
  )
}
