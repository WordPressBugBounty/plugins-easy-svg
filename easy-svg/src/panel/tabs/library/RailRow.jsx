import { createElement, forwardRef, memo } from 'react'
import { Badge, Box, Listbox, Menu, VisuallyHidden, Text } from '@chakra-ui/react'
import { useDroppable } from '@dnd-kit/core'
import { SetHandle, SortRow } from '../../rail-sort.jsx'
import { __, sprintf } from '@wordpress/i18n'
import { LockGlyph, isLocked, originGlyph, originLine, readOnlyWord } from '../../origin.js'
import { MENU_FIXED, MoreGlyph, FolderGlyph } from './helpers.js'
import { twinFrom } from '../../rail-rows.js'

// A set in the list that an icon can be dropped on.
const DropItem = forwardRef(function DropItem({ dropId, children, ...rest }, ref) {
  const drop = useDroppable({ id: dropId || 'none', disabled: !dropId })
  const both = (el) => {
    drop.setNodeRef(el)
    if ('function' === typeof ref) {
      ref(el)
    } else if (ref) {
      ref.current = el
    }
  }
  return (
    <Listbox.Item ref={both} transition="background-color .15s ease" {...rest}>
      {children}
    </Listbox.Item>
  )
})

// Links in a row like WordPress post statuses; a set entry also takes a dropped icon.
export function entryOf(c, twin) {
  return {
    id: c.id,
    label: c.label || c.id,
    twin,
    count: c.icons.length,
    readonly: !!c.readonly,
    collection: c,
    // Origin and lock come from the provider; without them the folder and readonly apply.
    icon: c?.origin ? createElement(originGlyph(c.origin)) : undefined,
    locked: isLocked(c),
    originName: c.origin?.name || '',
    from: twinFrom(c),
    said: [c.origin ? originLine(c.origin, c.label || c.id) : '', c.readonly ? readOnlyWord() : ''].filter(Boolean).join(', '),
  }
}

// A row's right-click menu, opened from its ⋮ or from the keyboard.
export function openRowMenu(row, box) {
  if (!row) {
    return
  }
  const at = box || row.getBoundingClientRect()
  row.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: at.left, clientY: at.bottom }))
}

// One row of the rail. `menu` names what its menu holds, so the row draws again only when that changes.
export const RailRow = memo(function RailRow({ entry, chosen, lit, over, picked, sortId, dropId, busy, menu, act }) {
  const c = entry.collection
  const Row = sortId ? SortRow : DropItem
  const canRenameRow = !!c && !c.readonly && 'function' === typeof c.provider?.rename
  // The keys this row answers once chosen (setKey and the list's Alt and arrows).
  const shortcuts = [
    ...(sortId ? ['Alt+ArrowUp', 'Alt+ArrowDown'] : []),
    ...(c && !c.readonly && 'function' === typeof c.provider?.trash ? ['Delete'] : []),
    ...(c && !c.readonly && 'function' === typeof c.provider?.rename ? ['F2'] : []),
  ].join(' ')
  const row = (
    <Row
      // In the hand, a row lifts off the list instead of sliding through its neighbours' text.
      {...(sortId ? { as: DropItem, sortId, disabled: busy, _dragging: chosen ? { boxShadow: 'ui.chip' } : { bg: 'ui.surface', boxShadow: 'ui.chip' } } : {})}
      item={entry}
      dropId={dropId}
      data-view={entry.id}
      aria-keyshortcuts={shortcuts || undefined}
      onDoubleClick={canRenameRow ? () => act.current.setRenaming({ collection: c, value: entry.label }) : undefined}
      // Full-width rows: a click and a drop both land without aiming.
      minH="12"
      // The start padding holds the grip, so the glyph and name never move under it.
      ps="6"
      pe="4"
      gap="3"
      fontSize="ui.body"
      borderRadius="forge"
      cursor="pointer"
      // As the Forge app's side menu: a soft navy under the pointer, the
      // chosen row solid navy with white type.
      color="ui.text"
      // The chosen row is decided here, not by selectors: Chakra's own hover rule outweighs them and turns it pale with white type.
      {...(chosen
        ? {
            // A light ground and bold type, no edge stripe; full navy is kept for primary buttons.
            bg: 'ui.menuHover',
            color: 'ui.heading',
            fontWeight: 'bold',
            _hover: { bg: 'ui.menuHover' },
            _highlighted: { bg: 'ui.menuHover' },
            _selected: { bg: 'ui.menuHover', color: 'ui.heading' },
          }
        : { _hover: { bg: 'ui.ghostHover' }, _highlighted: { bg: 'ui.ghostHover' } })}
      transition="background-color 0.15s ease, color 0.15s ease"
      css={{
        '& [data-glyph]': { transition: 'transform 0.15s ease' },
        '&:hover [data-glyph]': { transform: 'translateX({spacing.0.5})' },
        // The count sits at the row's end; the ⋮ takes its place on the row
        // under the pointer, reached by the keyboard or with its menu open.
        // A touch screen shows the ⋮ beside it, as there is no hover.
        '& [data-count]': { transition: 'opacity 0.15s ease' },
        // The grip shows where it can be used: under the pointer, in the hand, on touch.
        '& [data-set-handle]': { opacity: 0, transition: 'opacity 0.15s ease' },
        '&:hover [data-set-handle], &[data-highlighted] [data-set-handle], &[data-dragging] [data-set-handle]': { opacity: 1 },
        '& [data-set-actions]': {
          position: 'absolute',
          insetInlineEnd: '2',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0,
          transition: 'opacity 0.15s ease',
        },
        '&:hover [data-set-actions], &[data-highlighted] [data-set-actions], &[data-state=open] [data-set-actions]': { opacity: 1 },
        '&:hover:has([data-set-actions]) [data-count], &[data-highlighted]:has([data-set-actions]) [data-count], &[data-state=open] [data-count]': { opacity: 0 },
        '@media (hover: none)': {
          '& [data-set-actions]': { position: 'static', transform: 'none', opacity: 1 },
          '& [data-count]': { opacity: 1 },
          '& [data-set-handle]': { opacity: 1 },
        },
      }}
      // Two sets of one name tell apart by their address, on hover; any other shows its full name, which the row may cut.
      title={
        entry.readonly
          ? entry.collection?.origin
            ? `${entry.label}\n${entry.said}`
            : __('Read only: these icons come from files', 'easy-svg')
          : entry.twin
            ? entry.id
            : entry.label
      }
      {...(over && lit ? { bg: 'colorPalette.subtle' } : {})}
      {...(picked ? { 'data-picked': '', bg: 'ui.menuHover', color: 'ui.heading', fontWeight: 'medium', _hover: { bg: 'ui.menuHover' } } : {})}
    >
      <SetHandle />
      <Box as="span" data-glyph color="colorPalette.fg" flexShrink="0" css={{ '& svg': { width: '5', height: '5' } }}>
        {entry.icon || <FolderGlyph />}
      </Box>
      <Box flex="1" minW="0">
        <Listbox.ItemText display="block" truncate>
          {entry.label}
        </Listbox.ItemText>
        {entry.twin && entry.from ? (
          // A plugin's collection beside an own set of one name: where it comes from, on lines of its own so a long name cannot cut it.
          <Text as="span" display="block" lineClamp="2" textWrap="balance" fontSize="ui.sm" fontWeight="normal" color="ui.muted" aria-hidden="true">
            {
              // translators: %s: the plugin, theme or folder a collection comes from.
              sprintf(__('from %s', 'easy-svg'), entry.from)
            }
          </Text>
        ) : null}
      </Box>
      {entry.said ? <VisuallyHidden>{entry.said}</VisuallyHidden> : null}
      {entry.locked ? (
        <Box as="span" data-set-locked aria-hidden="true" flexShrink="0" color="ui.muted" css={{ '& svg': { width: '4', height: '4' } }}>
          <LockGlyph />
        </Box>
      ) : null}
      {lit && over ? (
        <Text as="span" flexShrink="0" fontSize="ui.body" fontWeight="bold" color="ui.primary">
          {__('Drop here', 'easy-svg')}
        </Text>
      ) : (
        <Badge
          data-count
          flexShrink="0"
          variant="outline"
          colorPalette="brand"
          
        >
          {entry.count}
        </Badge>
      )}
      {menu ? (
        // Not a button inside the option, which a screen reader cannot reach (WCAG 4.1.2); the keyboard uses Shift+F10.
        <Box
          as="span"
          data-set-actions={c ? c.id : 'library'}
          aria-hidden="true"
          title={
            // translators: %s: name of the set.
            sprintf(__('Actions for %s', 'easy-svg'), entry.label)
          }
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          boxSize="6"
          borderRadius="forge"
          cursor={busy ? 'default' : 'pointer'}
          color="ui.text"
          _hover={{ bg: 'ui.ghostHover' }}
          css={{ '& svg': { width: '4', height: '4' } }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            // Its own click, not the row's: the row would open the set.
            e.stopPropagation()
            if (!busy) {
              openRowMenu(e.currentTarget.closest('[data-view]'), e.currentTarget.getBoundingClientRect())
            }
          }}
        >
          <MoreGlyph />
        </Box>
      ) : null}
    </Row>
  )
  if (!menu) {
    return row
  }
  return (
    <Menu.Root lazyMount unmountOnExit positioning={MENU_FIXED}>
      <Menu.ContextTrigger asChild>{row}</Menu.ContextTrigger>
      {act.current.menu(menu, c, entry)}
    </Menu.Root>
  )
})
