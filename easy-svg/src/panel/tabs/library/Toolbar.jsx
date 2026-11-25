import {
  Button,
  Checkbox,
  Box,
  Flex,
  HStack,
  IconButton,
  Menu,
  Portal,
  Text,
} from '@chakra-ui/react'
import {
  LuCheck,
  LuDownload,
  LuEye,
  LuEyeOff,
  LuFolder,
  LuFolderInput,
  LuInfo,
  LuLibrary,
  LuPencil,
} from 'react-icons/lu'
import { __, _n, sprintf } from '@wordpress/i18n'
import { CopyFormLabel } from './IconTile.jsx'
import { callForms, refOf, PANEL_ROOT, BAR_BUTTON, MENU_FIXED, MENU_CONTENT, CopyGlyph, MoveGlyph, RenameGlyph, TrashGlyph, RestoreGlyph } from './helpers.js'
import { Tip } from './widgets.jsx'

export function toolbarView({
  allPicked, anyOff, anyOn, askPurge, barCount, busy, copierOf, copyCall, copyTargetsOf, copyTo, ctx, editLabel, editWord,
  editSet, emptyHere, exportPicked, exportTooMany, exporter, focusIfLost, leaveEditing, one, openDetails,
  openMove, openRuleRename, own, picked, pickedEntries, pickedIcons, pickedTiles, railButton, railInline,
  remember, removeIcon, removePicked, removing, renamer, restorePicked, search, selecting, setRailOpen,
  setSelecting, switchIcons, targets, toggleAll, toggleAllTrash, tools, trashAll, trashKeys, trashOpen,
  trashTotal,
}) {
  // Below lg the rail is a drawer; this opens it, from the grid's toolbar and from the Trash view.
  const railOpener = (
    <Button
      ref={railButton}
      data-collections-open
      size="md"
      variant="outline"
      bg="ui.surface"
      _hover={{ bg: 'ui.sunk' }}
      flexShrink="0"
      minW="11"
      aria-haspopup="dialog"
      css={{ '& svg': { width: '5', height: '5' } }}
      onClick={() => setRailOpen(true)}
    >
      <LuFolder />
      {/* Its word on every width: the search has its own row on a phone. */}
      <Text as="span">{__('Collections', 'easy-svg')}</Text>
    </Button>
  )
  return selecting ? (
    // Below lg the bar and its tile wrap: a phone has no room for every action in a row.
    <Flex data-edit-bar gap="3" rowGap="2" align="center" h={{ base: 'auto', lg: '14' }} minH="14" flexWrap={{ base: 'wrap', lg: 'nowrap' }}>
      {/* One lifted tile holds the whole pick and what can be done with it. */}
      <Flex
        align="stretch"
        h={{ base: 'auto', lg: 'full' }}
        w={{ base: 'full', lg: 'auto' }}
        flexShrink={{ base: '1', lg: '0' }}
        flexWrap={{ base: 'wrap', lg: 'nowrap' }}
        maxW="full"
        bg="ui.surface"
        borderWidth="ui.hair"
        borderColor="ui.border"
        borderRadius="forge"
        overflow="hidden"
        // The frame is the bar's alone: a cell's own top and bottom border would draw it twice.
        css={{ '& > *': { borderBlockWidth: '0' } }}
        // The lines between cells only in one row: wrapped, a line opened each new row.
        divideX={{ base: '0', lg: '{borderWidths.ui.hair}' }}
        divideColor="ui.border"
      >
        <Checkbox.Root size="lg" checked={trashOpen ? trashAll : allPicked} onCheckedChange={trashOpen ? toggleAllTrash : toggleAll} disabled={busy || !(trashOpen ? trashKeys.length : own.length)} ps={{ base: '3', lg: '6' }} pe={{ base: '3', lg: '8' }} minH="11" alignItems="center" gap="3">
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label fontSize="ui.body" whiteSpace="nowrap" hideBelow="xl">{__('Select all', 'easy-svg')}</Checkbox.Label>
        </Checkbox.Root>
        {barCount ? (
          // m 0: wp-admin's 1em paragraph margin left this cell shorter than the buttons beside it.
          <Text m="0" fontSize="ui.body" fontWeight="medium" px={{ base: '3', lg: '8' }} minH="11" display="flex" alignItems="center" whiteSpace="nowrap">
            {sprintf(
              // translators: %d: number of icons selected.
              _n('%d selected', '%d selected', barCount, 'easy-svg'),
              barCount
            )}
          </Text>
        ) : null}
        {/* Below lg the pick's count is one row, its actions the next. */}
        {!railInline && (trashOpen ? barCount > 0 : one || picked.size > 1) ? <Box data-bar-break flexBasis="full" h="0" borderTopWidth="ui.hair" borderColor="ui.border" /> : null}
        {/* In the trash a pick has two ways out, for icons and sets alike. */}
        {trashOpen && barCount ? (
          <>
            <Tip label={__('Restore', 'easy-svg')}>
              <IconButton {...BAR_BUTTON} data-trash-restore aria-label={__('Restore', 'easy-svg')} disabled={busy} onClick={restorePicked}>
                <RestoreGlyph />
              </IconButton>
            </Tip>
            <Tip label={__('Delete for good', 'easy-svg')}>
              <IconButton {...BAR_BUTTON} data-trash-purge colorPalette="red" aria-label={__('Delete for good', 'easy-svg')} disabled={busy} onClick={() => askPurge({ kind: 'picked', icons: pickedIcons.map((ic) => ic.id), rows: pickedEntries })}>
                <TrashGlyph />
              </IconButton>
            </Tip>
          </>
        ) : null}
        {one ? (
          <>
            <Tip label={__('Details', 'easy-svg')}>
              <IconButton {...BAR_BUTTON} aria-label={__('Details', 'easy-svg')} onClick={() => openDetails(one)}>
                <LuInfo />
              </IconButton>
            </Tip>
            {one.readonly && !one.canRename ? null : (
              <Tip label={__('Rename', 'easy-svg')}>
                <IconButton {...BAR_BUTTON} aria-label={__('Rename', 'easy-svg')} onClick={() => openDetails(one, 'name')}>
                  <RenameGlyph />
                </IconButton>
              </Tip>
            )}
            {!one.source || one.canSwitch ? (
              <Tip label={one.off ? __('Switch on', 'easy-svg') : __('Switch off', 'easy-svg')}>
                <IconButton {...BAR_BUTTON} aria-label={one.off ? __('Switch on', 'easy-svg') : __('Switch off', 'easy-svg')} disabled={busy} onClick={() => switchIcons([one], !one.off)}>
                  {one.off ? <LuEye /> : <LuEyeOff />}
                </IconButton>
              </Tip>
            ) : null}
            {/* A read-only source is copied, not moved; the bar says so. */}
            {copierOf([one]) ? (
              <>
                <Tip label={__('Copy to library', 'easy-svg')}>
                  <IconButton {...BAR_BUTTON} data-copy-to="library" aria-label={__('Copy to library', 'easy-svg')} disabled={busy} onClick={() => { remember(); copyTo(copierOf([one]), 'easy-svg', [one].map(refOf)).then(focusIfLost) }}>
                    <LuLibrary />
                  </IconButton>
                </Tip>
                {copyTargetsOf(copierOf([one])).length ? (
                  <Tip label={__('Copy to set', 'easy-svg')}>
                    <IconButton {...BAR_BUTTON} data-copy-to="set" aria-label={__('Copy to set', 'easy-svg')} disabled={busy} onClick={() => { remember(); openMove([one], copierOf([one])) }}>
                      <LuFolderInput />
                    </IconButton>
                  </Tip>
                ) : null}
              </>
            ) : !one.source?.readonly && targets.some((c) => c.id !== one.collection) ? (
              <Tip label={__('Move', 'easy-svg')}>
                <IconButton {...BAR_BUTTON} aria-label={__('Move', 'easy-svg')} disabled={busy} onClick={() => { remember(); openMove([one]) }}>
                  <MoveGlyph />
                </IconButton>
              </Tip>
            ) : null}
            {callForms(one, ctx.iconBlock).length ? (
            <Menu.Root lazyMount unmountOnExit positioning={MENU_FIXED}>
              <Menu.Trigger asChild>
                <IconButton {...BAR_BUTTON} aria-label={__('Copy', 'easy-svg')}>
                  <CopyGlyph />
                </IconButton>
              </Menu.Trigger>
              <Portal container={PANEL_ROOT}>
                <Menu.Positioner>
                  <Menu.Content {...MENU_CONTENT}>
                    {callForms(one, ctx.iconBlock).map((f) => (
                      <Menu.Item key={f.id} value={f.id} disabled={!!f.disabled} onSelect={() => copyCall(one, f.id)}>
                        <CopyGlyph />
                        <CopyFormLabel form={f} />
                      </Menu.Item>
                    ))}
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
            ) : null}
            {one.readonly && !one.canRemove ? null : (
              <Tip label={__('Delete', 'easy-svg')}>
                <IconButton {...BAR_BUTTON} colorPalette="red" aria-label={__('Delete', 'easy-svg')} disabled={busy} onClick={() => removeIcon(one)}>
                  <TrashGlyph />
                </IconButton>
              </Tip>
            )}
          </>
        ) : picked.size > 1 ? (
          <>
            {copierOf(pickedTiles) ? (
              <>
                <Tip label={__('Copy to library', 'easy-svg')}>
                  <IconButton {...BAR_BUTTON} data-copy-to="library" aria-label={__('Copy to library', 'easy-svg')} disabled={busy} onClick={() => { remember(); copyTo(copierOf(pickedTiles), 'easy-svg', pickedTiles.map(refOf)).then(focusIfLost) }}>
                    <LuLibrary />
                  </IconButton>
                </Tip>
                {copyTargetsOf(copierOf(pickedTiles)).length ? (
                  <Tip label={__('Copy to set', 'easy-svg')}>
                    <IconButton {...BAR_BUTTON} data-copy-to="set" aria-label={__('Copy to set', 'easy-svg')} disabled={busy} onClick={() => { remember(); openMove(pickedTiles, copierOf(pickedTiles)) }}>
                      <LuFolderInput />
                    </IconButton>
                  </Tip>
                ) : null}
              </>
            ) : targets.length && pickedTiles.some((ic) => !ic.source?.readonly) ? (
              <Tip label={__('Move', 'easy-svg')}>
                <IconButton {...BAR_BUTTON} aria-label={__('Move', 'easy-svg')} disabled={busy} onClick={() => { remember(); openMove(pickedTiles) }}>
                  <MoveGlyph />
                </IconButton>
              </Tip>
            ) : null}
            {pickedTiles.some((ic) => !ic.source || ic.canSwitch) ? (
              <>
                <Tip label={__('Switch off', 'easy-svg')}>
                  <IconButton {...BAR_BUTTON} aria-label={__('Switch off', 'easy-svg')} disabled={busy || !anyOn} onClick={() => switchIcons(pickedTiles.filter((ic) => !ic.source || ic.canSwitch), true)}>
                    <LuEyeOff />
                  </IconButton>
                </Tip>
                <Tip label={__('Switch on', 'easy-svg')}>
                  <IconButton {...BAR_BUTTON} aria-label={__('Switch on', 'easy-svg')} disabled={busy || !anyOff} onClick={() => switchIcons(pickedTiles.filter((ic) => !ic.source || ic.canSwitch), false)}>
                    <LuEye />
                  </IconButton>
                </Tip>
              </>
            ) : null}
            {renamer ? (
              <Tip label={__('Rename', 'easy-svg')}>
                <IconButton {...BAR_BUTTON} aria-label={__('Rename', 'easy-svg')} disabled={busy} onClick={() => openRuleRename(pickedTiles)}>
                  <RenameGlyph />
                </IconButton>
              </Tip>
            ) : null}
            {exporter ? (
              <Tip label={exportTooMany ? sprintf(
                // translators: %d: most icons one export takes.
                __('One export takes at most %d icons.', 'easy-svg'),
                exporter.exportMax
              ) : __('Export', 'easy-svg')}>
                <IconButton {...BAR_BUTTON} aria-label={__('Export', 'easy-svg')} disabled={busy || exportTooMany} onClick={exportPicked}>
                  <LuDownload />
                </IconButton>
              </Tip>
            ) : null}
            {removing ? (
              <Tip label={__('Delete', 'easy-svg')}>
                <IconButton {...BAR_BUTTON} colorPalette="red" aria-label={__('Delete', 'easy-svg')} disabled={busy} onClick={removePicked}>
                  <TrashGlyph />
                </IconButton>
              </Tip>
            ) : null}
          </>
        ) : null}
      </Flex>
        <Box flex="1" />
        <Button size="md" variant="solid" onClick={leaveEditing}>
          {__('Done', 'easy-svg')}
        </Button>
    </Flex>
  ) : (
    <Flex data-toolbar gap="4" flexWrap="wrap" align="center" justify="space-between" minH="14">
      {/* Nothing to edit in an empty view: a pale disabled button read as broken. */}
      {emptyHere ? null : (
        <Button size="md" variant="outline" bg="ui.surface" _hover={{ bg: 'ui.sunk' }} disabled={!(trashOpen ? trashKeys.length : own.length)} onClick={() => setSelecting(true)} aria-label={editLabel === editWord ? undefined : editLabel}>
          {editSet?.readonly ? <LuCheck /> : <LuPencil />}
          {editWord}
        </Button>
      )}
      {/* A row of its own on a phone, under Edit; there the search takes a full row below Collections. On a tablet it wraps rather than shrinks. */}
      <HStack gap="3" rowGap="3" flexWrap={{ base: 'wrap', lg: 'nowrap' }} flex={{ base: '1 1 100%', md: '1' }} minW="0" justify="flex-end">
        {railInline ? null : railOpener}
        {trashOpen ? (
          <Button data-empty-trash size="md" variant="outline" colorPalette="red" bg="ui.surface" flexShrink="0" disabled={busy || !trashTotal} onClick={() => askPurge({ kind: 'all' })}>
            <TrashGlyph />
            {__('Empty trash', 'easy-svg')}
          </Button>
        ) : (
          <>
            {emptyHere ? null : tools}
            {search}
          </>
        )}
      </HStack>
    </Flex>
  )
}
