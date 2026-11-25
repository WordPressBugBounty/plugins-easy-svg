import { Menu, Portal, Text } from '@chakra-ui/react'
import { LuArrowDown, LuArrowUp, LuDownload } from 'react-icons/lu'
import { __, _n, sprintf } from '@wordpress/i18n'
import { PANEL_ROOT, MENU_CONTENT, CopyGlyph, RenameGlyph, TrashGlyph } from './helpers.js'

export function railMenusView({
  act, ctx, exporter, neighbour, pickedSets, railAct, setCopyHelp, setDeleting, setExporting, setRenaming,
  setStatus,
}) {
  // The library leaves as a package from Import and Export, where its own
  // export already lives.
  const libraryMenu = (
    <Portal container={PANEL_ROOT}>
      <Menu.Positioner>
        <Menu.Content {...MENU_CONTENT}>
          <Menu.ItemGroup>
            <Menu.ItemGroupLabel fontSize="ui.sm" color="ui.muted">{__('Actions', 'easy-svg')}</Menu.ItemGroupLabel>
            <Menu.Item value="export" onSelect={() => ctx.goTo?.('packs')}>
              <LuDownload />
              {__('Export', 'easy-svg')}
            </Menu.Item>
          </Menu.ItemGroup>
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  )
  // What can be done with a set: on a right click and behind its ⋮ alike.
  const setMenu = (c, entry) => {
    const canRename = 'function' === typeof c.provider?.rename
    const canTrash = 'function' === typeof c.provider?.trash
    // Export always through its dialog: a file or a link, chosen there.
    const canExport = !!exporter || 'function' === typeof c.provider?.shareLink
    return (
      <Portal container={PANEL_ROOT}>
        <Menu.Positioner>
          <Menu.Content {...MENU_CONTENT}>
            <Menu.ItemGroup>
            <Menu.ItemGroupLabel fontSize="ui.sm" color="ui.muted">{__('Actions', 'easy-svg')}</Menu.ItemGroupLabel>
            {canExport ? (
              <Menu.Item value="export" disabled={!c.icons.length} onSelect={() => setExporting({ collection: c, mode: exporter ? 'download' : 'link', hours: '24', url: '', error: '' })}>
                <LuDownload />
                {__('Export', 'easy-svg')}
              </Menu.Item>
            ) : null}
            <Menu.Item
              value="copy-id"
              onSelect={async () => {
                try {
                  await navigator.clipboard.writeText(c.id)
                  setStatus(__('Set ID copied.', 'easy-svg'))
                } catch {
                  setCopyHelp(c.id)
                }
              }}
            >
              <CopyGlyph />
              {__('Copy set ID', 'easy-svg')}
            </Menu.Item>
            {neighbour(c, -1) ? (
              <Menu.Item value="move-up" onSelect={() => railAct.current.moveSet(c, -1)}>
                <LuArrowUp />
                {__('Move up', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {neighbour(c, 1) ? (
              <Menu.Item value="move-down" onSelect={() => railAct.current.moveSet(c, 1)}>
                <LuArrowDown />
                {__('Move down', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {canRename ? (
              <Menu.Item value="rename" onSelect={() => setRenaming({ collection: c, value: entry.label })}>
                <RenameGlyph />
                {__('Rename', 'easy-svg')}
              </Menu.Item>
            ) : null}
            {canTrash ? (
              <>
                <Menu.Separator />
                <Menu.Item value="trash" color="fg.error" data-danger onSelect={() => setDeleting(c)}>
                  <TrashGlyph />
                  {__('Move to trash', 'easy-svg')}
                </Menu.Item>
              </>
            ) : null}
            </Menu.ItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    )
  }
  // A right click on one of several picked sets: what reaches all of them.
  const railBulkMenu = () => {
    const refs = pickedSets.flatMap((c) => c.icons.map((x) => x.ref || `${c.id}/${x.slug}`))
    const trashable = pickedSets.filter((c) => 'function' === typeof c.provider?.trash)
    return (
      <Portal container={PANEL_ROOT}>
        <Menu.Positioner>
          <Menu.Content {...MENU_CONTENT}>
            <Text px="2" pt="1" pb="2" fontSize="ui.sm" fontWeight="bold" color="ui.muted">
              {sprintf(
                // translators: %d: number of sets picked in the side list.
                _n('Selection: %d set', 'Selection: %d sets', pickedSets.length, 'easy-svg'),
                pickedSets.length
              )}
            </Text>
            <Menu.Separator />
            <Menu.ItemGroup>
              <Menu.ItemGroupLabel fontSize="ui.sm" color="ui.muted">{__('Actions', 'easy-svg')}</Menu.ItemGroupLabel>
              {/* Export is Pro: without an exporter the item is not there at all, not greyed out. */}
              {exporter ? (
                <>
                  <Menu.Item value="export-sets" disabled={!refs.length} onSelect={() => act(() => (exporter.exportSets ? exporter.exportSets({ sets: pickedSets.filter((c) => c.icons.length) }) : exporter.exportIcons({ refs })))}>
                    <LuDownload />
                    {__('Export', 'easy-svg')}
                  </Menu.Item>
                  <Menu.Separator />
                </>
              ) : null}
              <Menu.Item value="trash-sets" color="fg.error" data-danger disabled={!trashable.length} onSelect={() => setDeleting({ many: trashable })}>
                <TrashGlyph />
                {__('Move to trash', 'easy-svg')}
              </Menu.Item>
            </Menu.ItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    )
  }
  return { libraryMenu, setMenu, railBulkMenu }
}
