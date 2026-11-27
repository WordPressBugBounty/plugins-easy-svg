import {
  Checkbox,
  Flex,
  HStack,
  IconButton,
  Menu,
  Portal,
  Text,
} from '@chakra-ui/react'
import { __, sprintf } from '@wordpress/i18n'
import { PANEL_ROOT, BAR_BUTTON, MENU_FIXED, MENU_CONTENT, TrashGlyph, RestoreGlyph, whenTrashed } from './helpers.js'
import { Tip } from './widgets.jsx'

// translators: %s: name of an icon or a set in the trash.
const restoreName = (name) => (name ? sprintf(__('Restore %s', 'easy-svg'), name) : __('Restore', 'easy-svg'))
// translators: %s: name of an icon or a set in the trash.
const purgeName = (name) => (name ? sprintf(__('Delete %s permanently', 'easy-svg'), name) : __('Delete permanently', 'easy-svg'))

// The two ways out of the trash, for a tile and for a provider's row. The name tells a screen reader which item.
export function TrashMenu({ busy, name, onRestore, onPurge }) {
  return (
    <Portal container={PANEL_ROOT}>
      <Menu.Positioner>
        <Menu.Content {...MENU_CONTENT}>
          <Menu.Item value="restore" aria-label={restoreName(name)} disabled={busy} onSelect={onRestore}>
            <RestoreGlyph />
            {__('Restore', 'easy-svg')}
          </Menu.Item>
          <Menu.Item value="purge" aria-label={purgeName(name)} color="fg.error" data-danger disabled={busy} onSelect={onPurge}>
            <TrashGlyph />
            {__('Delete permanently', 'easy-svg')}
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  )
}

// What a provider keeps in the trash, one row each: a tick in edit mode, otherwise its two ways out as buttons at the end.
// Always drawn, not on hover: a finger has no hover. A right click still offers the same two.
export function TrashRow({ entry, first, busy, selecting, picked, onPick, onMenu, onRestore, onPurge }) {
  const about = [entry.detail, whenTrashed(entry.trashedAt)].filter(Boolean).join(', ')
  const text = (
    <>
      <Text as="span" data-entry-label flex="1" minW="0" truncate fontSize="ui.body" color={picked ? 'ui.heading' : 'ui.text'}>{entry.label}</Text>
      {about ? <Text as="span" data-entry-about fontSize="ui.body" color="ui.muted">{about}</Text> : null}
    </>
  )
  const TEXT = { flex: '1', minW: '0', minH: '12', px: '4', py: '2', columnGap: '3', rowGap: '1', align: 'center', flexWrap: 'wrap', textAlign: 'start' }
  const row = (
    <Flex
      as="li"
      data-trashed-entry={entry.id}
      m="0"
      align="stretch"
      borderTopWidth={first ? '0' : 'ui.hair'}
      borderColor="ui.border"
      bg={picked ? 'ui.menuHover' : 'transparent'}
      transition="background-color 0.15s ease"
      // The rail's chosen-row ground, which stands off the white list; the type goes to full strength on it.
      _hover={{ bg: 'ui.menuHover' }}
      _focusWithin={{ bg: 'ui.menuHover' }}
      css={{
        '&:hover [data-entry-label], &:focus-within [data-entry-label]': { color: '{colors.ui.heading}' },
        '&:hover [data-entry-about], &:focus-within [data-entry-about]': { color: '{colors.ui.text}' },
      }}
    >
      {selecting ? (
        <Flex
          as="button"
          type="button"
          {...TEXT}
          cursor="pointer"
          bg="transparent"
          role="checkbox"
          aria-checked={picked}
          // translators: %s: icon name.
          aria-label={sprintf(__('Select %s', 'easy-svg'), entry.label)}
          onClick={() => onPick(!picked)}
          // Inset: the list's rounded frame would cut a ring drawn outside the row.
          _focusVisible={{ outline: '{borderWidths.ui.focus} solid', outlineColor: 'colorPalette.solid', outlineOffset: 'calc(-1 * {borderWidths.ui.focus})' }}
        >
          <Checkbox.Root size="xs" checked={picked} readOnly pointerEvents="none">
            <Checkbox.HiddenInput tabIndex={-1} aria-hidden="true" />
            <Checkbox.Control />
          </Checkbox.Root>
          {text}
        </Flex>
      ) : (
        <>
          <Flex {...TEXT}>{text}</Flex>
          {/* onMenu first: it notes which row had the focus, so focus returns to its place when the row is gone. */}
          <HStack gap="0" flexShrink="0" align="stretch">
            <Tip label={__('Restore', 'easy-svg')}>
              <IconButton
                {...BAR_BUTTON}
                h="auto"
                minH="12"
                w="12"
                data-entry-restore
                aria-label={restoreName(entry.label)}
                disabled={busy}
                onClick={() => {
                  onMenu()
                  onRestore()
                }}
              >
                <RestoreGlyph />
              </IconButton>
            </Tip>
            <Tip label={__('Delete permanently', 'easy-svg')}>
              <IconButton
                {...BAR_BUTTON}
                h="auto"
                minH="12"
                w="12"
                data-entry-purge
                colorPalette="red"
                aria-label={purgeName(entry.label)}
                disabled={busy}
                onClick={() => {
                  onMenu()
                  onPurge()
                }}
              >
                <TrashGlyph />
              </IconButton>
            </Tip>
          </HStack>
        </>
      )}
    </Flex>
  )
  return (
    <Menu.Root lazyMount unmountOnExit positioning={MENU_FIXED} onOpenChange={(e) => (e.open ? onMenu() : null)}>
      <Menu.ContextTrigger asChild>{row}</Menu.ContextTrigger>
      <TrashMenu busy={busy} name={entry.label} onRestore={onRestore} onPurge={onPurge} />
    </Menu.Root>
  )
}
