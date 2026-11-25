import { useId, useLayoutEffect, useRef } from 'react'
import {
  Checkbox,
  Box,
  Card,
  Flex,
  Float,
  Menu,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useDraggable } from '@dnd-kit/core'
import { fitBox } from '../../fit-box.js'
import { LuDownload, LuEye, LuEyeOff, LuFolderInput, LuInfo, LuLibrary } from 'react-icons/lu'
import { __, _n, sprintf } from '@wordpress/i18n'
import { sanitizeSvg, scopeSvgIds, CHECKER, nameOf, PANEL_ROOT, MENU_FIXED, MENU_CONTENT, CopyGlyph, MoveGlyph, RenameGlyph, TrashGlyph } from './helpers.js'
import { openRowMenu } from './RailRow.jsx'
import { TrashMenu } from './Trash.jsx'

// The preview in a tile sits in the middle whatever the drawing's own
// margins: the viewBox is fitted to what is actually drawn. Only here; the
// icon on the site keeps its own.
function fitDrawing(box) {
  const svg = box?.querySelector('svg')
  if (!svg || svg.dataset.fitted) {
    return
  }
  try {
    // getBBox() is the bare geometry; the widest stroke on a stroked shape says how far the ink reaches past it.
    const stroke = Array.from(svg.querySelectorAll('path, circle, ellipse, rect, line, polyline, polygon'))
      .map((el) => window.getComputedStyle(el))
      .filter((cs) => 'none' !== cs.stroke)
      .reduce((max, cs) => Math.max(max, parseFloat(cs.strokeWidth) || 0), 0)
    const box = fitBox(svg.getBBox(), stroke)
    if (box) {
      svg.setAttribute('viewBox', box)
      svg.dataset.fitted = '1'
    }
  } catch {
    // Not rendered yet (a hidden tile): it keeps its own viewBox.
  }
}

// One icon as an .svg file, the drawing as stored here (cleaned on the way
// in), named after its address.
function downloadSvg(ic) {
  const blob = new Blob([ic.content], { type: 'image/svg+xml' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${(ic.slug || ic.label || 'icon').replace(/[^a-z0-9_-]+/gi, '-')}.svg`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0)
}

// A way to copy that does not fit this icon says why, under its name: a
// greyed-out item alone reads as broken.
export function CopyFormLabel({ form }) {
  if (!form.disabled) {
    return form.label
  }
  return (
    <Stack as="span" gap="0" whiteSpace="normal" maxW="64">
      <Text as="span">{form.label}</Text>
      <Text as="span" fontSize="ui.sm" color="ui.muted">{form.text}</Text>
    </Stack>
  )
}

export function IconTile({
  ic,
  bulk = null,
  away = false,
  busy,
  canDrag = false,
  selecting,
  picked,
  onPick,
  onOpen,
  onRename = null,
  onCopy,
  forms = [],
  onMove = null,
  onCopyLibrary = null,
  onCopySet = null,
  onRemove = null,
  onSwitch = null,
  // In the trash: no details, no drag. The tile opens the two ways out instead ({ when, onMenu, onRestore, onPurge }).
  trash = null,
}) {
  const name = nameOf(ic)
  // With no collection to drop on, a drag would only hide the tile for nothing.
  const drag = useDraggable({ id: ic.id, disabled: busy || !canDrag })
  // Centred once the drawing is laid out, and again when it changes.
  const faceRef = useRef(null)
  const scope = useId()
  useLayoutEffect(() => {
    fitDrawing(faceRef.current)
    const again = window.requestAnimationFrame(() => fitDrawing(faceRef.current))
    return () => window.cancelAnimationFrame(again)
  }, [ic.content])
  // A right click on one of several picked tiles acts on the whole pick.
  const bulkMenu = bulk ? (
    <Portal container={PANEL_ROOT}>
      <Menu.Positioner>
        <Menu.Content {...MENU_CONTENT}>
          <Menu.ItemGroup>
            <Menu.ItemGroupLabel fontSize="ui.sm" color="ui.muted">
              {sprintf(
                // translators: %d: number of icons picked.
                _n('Selection: %d icon', 'Selection: %d icons', bulk.count, 'easy-svg'),
                bulk.count
              )}
            </Menu.ItemGroupLabel>
          </Menu.ItemGroup>
          <Menu.Separator />
          <Menu.ItemGroup>
            <Menu.ItemGroupLabel fontSize="ui.sm" color="ui.muted">{__('Settings', 'easy-svg')}</Menu.ItemGroupLabel>
            {bulk.onMove ? (
              <Menu.Item value="bulk-move" onSelect={bulk.onMove}>
                <MoveGlyph />
                {__('Move', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {bulk.onCopyLibrary ? (
              <Menu.Item value="bulk-copy-library" disabled={busy} onSelect={bulk.onCopyLibrary}>
                <LuLibrary />
                {__('Copy to library', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {bulk.onCopySet ? (
              <Menu.Item value="bulk-copy-set" disabled={busy} onSelect={bulk.onCopySet}>
                <LuFolderInput />
                {__('Copy to set', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {bulk.onOff ? (
              <Menu.Item value="bulk-off" onSelect={bulk.onOff} disabled={!bulk.anyOn}>
                <LuEyeOff />
                {__('Switch off', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {bulk.onOn ? (
              <Menu.Item value="bulk-on" onSelect={bulk.onOn} disabled={!bulk.anyOff}>
                <LuEye />
                {__('Switch on', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {bulk.onRename ? (
              <Menu.Item value="bulk-rename" onSelect={bulk.onRename}>
                <RenameGlyph />
                {__('Rename', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {bulk.onExport ? (
              <Menu.Item value="bulk-export" onSelect={bulk.onExport}>
                <LuDownload />
                {__('Export', 'easy-svg')}
              </Menu.Item>
            ) : null}
          </Menu.ItemGroup>
          {bulk.onRemove ? (
            <>
              <Menu.Separator />
              <Menu.Item value="bulk-delete" color="fg.error" data-danger onSelect={bulk.onRemove}>
                <TrashGlyph />
                {__('Delete', 'easy-svg')}
              </Menu.Item>
            </>
          ) : null}
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  ) : null
  // The same list on a click and on a right click: what can be done here.
  const menu = (
    <Portal container={PANEL_ROOT}>
      <Menu.Positioner>
        <Menu.Content {...MENU_CONTENT}>
          <Menu.ItemGroup>
            <Menu.ItemGroupLabel fontSize="ui.sm" color="ui.muted">{__('Settings', 'easy-svg')}</Menu.ItemGroupLabel>
            <Menu.Item value="details" onSelect={onOpen}>
              <LuInfo />
              {__('Details', 'easy-svg')}
            </Menu.Item>
            {onRename ? (
              <Menu.Item value="rename" onSelect={onRename}>
                <RenameGlyph />
                {__('Rename', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {onSwitch ? (
              <Menu.Item value="switch" onSelect={onSwitch}>
                {ic.off ? <LuEye /> : <LuEyeOff />}
                {ic.off ? __('Switch on', 'easy-svg') : __('Switch off', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {onMove ? (
              <Menu.Item value="move" onSelect={onMove}>
                <MoveGlyph />
                {__('Move', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {onCopyLibrary ? (
              <Menu.Item value="copy-library" disabled={busy} onSelect={onCopyLibrary}>
                <LuLibrary />
                {__('Copy to library', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {onCopySet ? (
              <Menu.Item value="copy-set" disabled={busy} onSelect={onCopySet}>
                <LuFolderInput />
                {__('Copy to set', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {ic.content ? (
              <Menu.Item value="download" onSelect={() => downloadSvg(ic)}>
                <LuDownload />
                {__('Download', 'easy-svg')}
              </Menu.Item>
            ) : null}
          </Menu.ItemGroup>
          {forms.length ? (
            <>
              <Menu.Separator />
              <Menu.ItemGroup>
                <Menu.ItemGroupLabel fontSize="ui.sm" color="ui.muted">
                  {__('Copy', 'easy-svg')}
                </Menu.ItemGroupLabel>
                {forms.map((f) => (
                  <Menu.Item key={f.id} value={`copy:${f.id}`} disabled={!!f.disabled} onSelect={() => onCopy(f.id)}>
                    <CopyGlyph />
                    <CopyFormLabel form={f} />
                  </Menu.Item>
                ))}
              </Menu.ItemGroup>
            </>
          ) : null}
          {onRemove ? (
            <>
              <Menu.Separator />
              <Menu.Item value="delete" color="fg.error" data-danger onSelect={onRemove}>
                <TrashGlyph />
                {__('Delete', 'easy-svg')}
              </Menu.Item>
            </>
          ) : null}
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  )
  const face = (
    <>
      <Flex data-tile-checker boxSize="10" flexShrink="0" align="center" justify="center" borderRadius="forge" {...CHECKER}>
        <Box
          ref={faceRef}
          boxSize="8"
          color="ui.heading"
          aria-hidden="true"
          // Markup the HTML parser lifts out of the svg (a <p>, say) lands beside it; it stays in the box.
          overflow="hidden"
          css={{ '& svg': { width: '100%', height: '100%' } }}
          dangerouslySetInnerHTML={{ __html: scopeSvgIds(sanitizeSvg(ic.content), scope) }}
        />
      </Flex>
      <Text as="span" fontSize="ui.md" color="ui.muted" mt="1.5" lineHeight="shorter" textAlign="center" truncate w="full">
        {name}
      </Text>
    </>
  )
  const card = (
    <Card.Root
      data-icon-key={ic.key || ic.ref || `easy-svg/${ic.slug}`}
      ref={drag.setNodeRef}
      {...drag.listeners}
      // Taken out while it travels: the others close the gap.
      display={away ? 'none' : undefined}
      touchAction="manipulation"
      variant="outline"
      position="relative"
      // Square, every one: a grid of icons reads as a grid only when it is even.
      aspectRatio="1"
      // Switched off: still here, pale, and said so.
      color={ic.off ? 'fg.muted' : undefined}
      css={{
        ...(ic.off ? { '& [data-tile-open] > *': { opacity: 0.55 } } : {}),
        // A long press lifts the tile: no iOS callout or text selection first.
        ...(canDrag ? { WebkitTouchCallout: 'none', userSelect: 'none' } : {}),
        // In edit mode every box shows, so it is plain what can be ticked;
        // outside it a box shows only under the pointer, and a ticked one stays.
        '& [data-tick]': { opacity: picked || selecting ? 1 : 0, transition: 'opacity 0.15s ease' },
        '&:hover [data-tick], &:focus-within [data-tick]': { opacity: 1 },
      }}
      // Picked: still white, so it stands off the grey page, with a 2px navy
      // frame; a pale blue fill sank into the page around it.
      borderColor={picked ? 'colorPalette.solid' : undefined}
      bg="ui.surface"
      boxShadow={picked ? '0 0 0 {borderWidths.ui.hair} {colors.colorPalette.solid}, {shadows.ui.lift}' : undefined}
      transition="box-shadow 0.15s ease, transform 0.15s ease"
      _hover={{ shadow: 'md', transform: 'translateY(calc(-1 * {spacing.0.5}))' }}
      // A right click outlines the tile its menu belongs to.
      _open={{ borderColor: 'colorPalette.solid', boxShadow: '0 0 0 {borderWidths.ui.hair} {colors.colorPalette.solid}' }}
    >
      {ic.off ? (
        <Float placement="top-end" offset="4" zIndex="1" pointerEvents="none">
          <Box as="span" color="fg.muted" css={{ '& svg': { width: '3.5', height: '3.5' } }}>
            <LuEyeOff aria-label={__('Switched off', 'easy-svg')} role="img" />
          </Box>
        </Float>
      ) : null}
      {selecting ? (
        <Float data-tick placement="top-start" offset="4" zIndex="1" pointerEvents="none">
          <Checkbox.Root size="xs" checked={picked} readOnly>
            <Checkbox.HiddenInput tabIndex={-1} aria-hidden="true" />
            <Checkbox.Control />
          </Checkbox.Root>
        </Float>
      ) : null}
      {/* The whole tile is the button: details, or in edit mode a tick. */}
      <Card.Body
        as="button"
        type="button"
        data-tile-open
        {...(selecting
          ? {
              role: 'checkbox',
              'aria-checked': picked,
              // translators: %s: icon name.
              'aria-label': sprintf(__('Select %s', 'easy-svg'), name),
              onClick: () => onPick(!picked),
            }
          : trash
            ? {
                'aria-haspopup': 'menu',
                'aria-label': trash.when
                  ? // translators: 1: icon name. 2: the date it was moved to the trash.
                    sprintf(__('%1$s, in the trash since %2$s', 'easy-svg'), name, trash.when)
                  : name,
                // A click opens what a right click would: the two ways out of the trash.
                onClick: (e) => openRowMenu(e.currentTarget.closest('[data-icon-key]')),
              }
            : {
                // translators: %s: icon name.
                'aria-label': sprintf(__('Details for %s', 'easy-svg'), name),
                onClick: onOpen,
              })}
        alignItems="center"
        justifyContent="center"
        gap="2"
        h="full"
        px="2"
        pt="3"
        pb="3"
        cursor="pointer"
        borderRadius="inherit"
        _focusVisible={{ outline: '{borderWidths.ui.focus} solid', outlineColor: 'colorPalette.solid', outlineOffset: '{borderWidths.ui.focus}' }}
      >
        {face}
      </Card.Body>
    </Card.Root>
  )
  // A right click offers what can be done, in either mode.
  return (
    <Menu.Root lazyMount unmountOnExit positioning={MENU_FIXED} onOpenChange={trash ? (e) => (e.open ? trash.onMenu() : null) : undefined}>
      <Menu.ContextTrigger asChild>{card}</Menu.ContextTrigger>
      {trash ? <TrashMenu busy={busy} name={name} onRestore={trash.onRestore} onPurge={trash.onPurge} /> : bulkMenu || menu}
    </Menu.Root>
  )
}
