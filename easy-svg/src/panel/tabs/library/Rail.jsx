import {
  Button,
  Box,
  CloseButton,
  Drawer,
  HStack,
  IconButton,
  Listbox,
  Menu,
  Portal,
  Stack,
  Text,
  Link,
} from '@chakra-ui/react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { sortIdOf } from '../../rail-sort.jsx'
import { libraryMenuKind } from '../../rail-rows.js'
import { media } from '../../../theme.js'
import { OVERLAY_TOP } from '../../overlay-top.js'
import { LuSearch, LuSearchX, LuX, LuLayoutTemplate } from 'react-icons/lu'
import { __, _n, sprintf } from '@wordpress/i18n'
import { SearchField } from '../../../ui.jsx'
import { Notice } from '../../parts.jsx'
import { openRowMenu, RailRow } from './RailRow.jsx'
import { LIST_FOCUS, BY_POINTER, PANEL_ROOT, FRAME_ROOT, ROW_LINES, MENU_FIXED, KEEP_SCROLL, railFades, RAIL_FADE, MENU_CONTENT, AddGlyph, UploadGlyph, FolderGlyph } from './helpers.js'

// Always in sight, so a dragged icon has somewhere to go; while dragging, every target set says so.
export function sidebarView({
  accountUrl, busy, choose, collections, collectionsFailed, creator, ctx, dragging, dropOver, exporter, findSets,
  hints, moveSet, neighbour, newSet, newSetRow, openTemplates, pickInRail, providers, railAct, railAnchor,
  railFind, railInline, railModClick, railNear, railPick, railQuery, reloadCollections, runHint, setDeleting,
  setEntries, setImporting, setNewSet, setRailFind, setRailOpen, setRailPick, setRailQuery, setRenaming, setTerm,
  sortSet, targetSet, view, viewEntries,
}) {
  // Shift+F10 and the menu key open the highlighted row's menu, where a right
  // click would; the list keeps the focus, its rows are only highlighted.
  const rowMenuKey = (e) => {
    if ('ContextMenu' === e.key || (e.shiftKey && 'F10' === e.key)) {
      const row = e.currentTarget.querySelector('[data-view][data-highlighted]')
      if (row) {
        e.preventDefault()
        const b = row.getBoundingClientRect()
        openRowMenu(row, { left: b.right - b.height, bottom: b.bottom })
      }
    }
  }
  // Arrows and type-ahead stay the list's own.
  const setKey = (e) => {
    if (e.defaultPrevented || e.target !== e.currentTarget || busy || e.altKey || e.metaKey || e.ctrlKey) {
      return
    }
    const lit = e.currentTarget.querySelector('[data-view][data-highlighted]')?.getAttribute('data-view')
    const c = collections.find((x) => x.id === view && !x.readonly)
    if (!c || (lit && lit !== c.id)) {
      return
    }
    if (('Delete' === e.key || 'Backspace' === e.key) && 'function' === typeof c.provider?.trash) {
      e.preventDefault()
      setDeleting(c)
    } else if (('F2' === e.key || 'Enter' === e.key) && 'function' === typeof c.provider?.rename) {
      e.preventDefault()
      setRenaming({ collection: c, value: c.label || c.id })
    }
  }
  // One entry of the list: a Chakra Listbox item that also takes a drop.
  // Only what the row shows goes in as props; with a thousand sets, a row whose props did not change is not drawn again.
  const item = (entry) => {
    const c = entry.collection
    const chosen = view === entry.id
    const sortable = !!c && sortSet.has(sortIdOf(c))
    const near = c ? railNear.get(c) : null
    const canExport = !!c && c.icons.length > 0 && (!!exporter || 'function' === typeof c.provider?.shareLink)
    // A picked row's menu speaks for every picked set, so it follows the pick and the sets themselves.
    const bulk = !!c && railPick.size > 1 && railPick.has(c.id)
    return (
      <RailRow
        key={entry.id}
        entry={entry}
        chosen={chosen}
        lit={!!(dragging && c && targetSet.has(c))}
        over={dropOver === `set:${entry.id}`}
        picked={!chosen && !!c && railPick.has(c.id)}
        sortId={sortable ? sortIdOf(c) : null}
        dropId={c && targetSet.has(c) ? `set:${c.id}` : null}
        busy={busy}
        menu={
          'library' === entry.id
            ? libraryMenuKind(exporter)
            : !c || c.readonly
              ? ''
              : bulk
                ? `bulk:${[...railPick].join(',')}`
                : `set:${near?.[0] ? 1 : 0}${near?.[1] ? 1 : 0}${canExport ? 1 : 0}`
        }
        menuOf={bulk ? collections : null}
        act={railAct}
      />
    )
  }
  const pick = (e) => {
    if (railModClick.current) {
      railModClick.current = false
      return
    }
    const next = e.value[0]
    if (next && next !== view) {
      choose(next)
    }
    // In the drawer a choice is the whole errand: the icons it chose come into view.
    if (next) {
      setRailOpen(false)
    }
  }
  return (
    <Box
      as="nav"
      data-collections
      aria-label={__('Collections', 'easy-svg')}
      w={{ base: 'full', lg: 'ui.rail' }}
      flexShrink="0"
      px="3"
      pt={{ base: '4', lg: '8' }}
      // None on wide screens: the rail's list runs to the footer, and room here makes the page taller than the window.
      pb={{ base: '3', lg: '0' }}
      bg="ui.surface"
      borderRightWidth={{ base: '0', lg: 'ui.hair' }}
      borderColor="ui.border"
    >
    {/* The rail runs the page's height; its rows stay in view while the icons scroll. */}
    {/* A long list scrolls inside the rail, never inside one of its lists. */}
    <Stack
      gap="1"
      position={{ lg: 'sticky' }}
      top="calc(var(--esw-admin-bar) + {sizes.ui.header} + {spacing.8})"
      maxH={{ lg: 'calc(100vh - var(--esw-admin-bar) - {sizes.ui.header} - {spacing.8} - {sizes.ui.footer})' }}
      overflowY={{ lg: 'auto' }}
      mx="-3"
      px="3"
      pb={{ lg: '6' }}
      // A click focuses the list, and the browser scrolled the rail to bring
      // the whole list into view: the scroll is kept as it was at the press.
      onPointerDown={(e) => {
        e.currentTarget.dataset.keep = String(e.currentTarget.scrollTop)
        railModClick.current = false
        if (0 !== e.button) {
          return
        }
        const id = e.target.closest?.('[data-view]')?.getAttribute('data-view')
        const set = id && collections.find((c) => c.id === id && !c.readonly)
        if (!set) {
          return
        }
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          railModClick.current = true
          pickInRail(set.id, e.shiftKey ? 'range' : 'toggle')
        } else if (railPick.size) {
          setRailPick(new Set())
        }
        railAnchor.current = e.shiftKey ? railAnchor.current : set.id
      }}
      // In the drawer any row's tap closes it, the chosen one too (no value change then).
      onClick={(e) => {
        if (!railInline && !(e.shiftKey || e.metaKey || e.ctrlKey) && e.target.closest?.('[data-view]')) {
          setRailOpen(false)
        }
      }}
      onFocus={(e) => {
        const el = e.currentTarget
        if (undefined !== el.dataset.keep) {
          el.scrollTop = Number(el.dataset.keep)
          delete el.dataset.keep
        }
      }}
      // How much of the rail is hidden above and below, 0 to 1 each, for the
      // fades at its ends: full while rows pass under an edge, none once the
      // list has reached it, so the first and last rows are never faded.
      ref={(el) => railFades(el)}
      onScroll={(e) => railFades(e.currentTarget)}
      css={{
        '--esw-rail-top': '0',
        '--esw-rail-bottom': '0',
        // No bar: the fades say there is more.
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        [media.railWide]: {
          maskImage:
            // Only the foot fades: at the top the sets' title stays put and
            // fades the rows passing under it itself.
            'linear-gradient(to bottom, black 0, black calc(100% - {sizes.ui.header}), color-mix(in srgb, black calc(100% * (1 - var(--esw-rail-bottom))), transparent) 100%)',
        },
      }}
    >
      <Box {...RAIL_FADE} display={{ base: 'none', lg: 'block' }} animationName="eswFadeIn" top="0" mb="-7" bgImage="linear-gradient(to bottom, {colors.ui.surface}, transparent)" />
      <Listbox.Root collection={viewEntries} value={[view]} onValueChange={pick} scrollToIndexFn={KEEP_SCROLL}>
        {/* Named: this list has no visible title of its own, the sets' has. */}
        <Listbox.Content aria-label={__('Icons', 'easy-svg')} onKeyDown={rowMenuKey} gap="0" bg="transparent" p="0" borderWidth="0" maxH="none" overflow="visible" css={ROW_LINES} _focusVisible={LIST_FOCUS} {...BY_POINTER}>
          {viewEntries.items.map(item)}
        </Listbox.Content>
      </Listbox.Root>
      {collections.length || creator || hints.length ? (
        <Listbox.Root collection={setEntries} value={[view]} onValueChange={pick} scrollToIndexFn={KEEP_SCROLL} mt="3">
          {/* Sticky at the rail's top, so a new set or a search is always a click away. */}
          <Box
            data-sets-head
            position="sticky"
            top="0"
            zIndex="2"
            bg="ui.surface"
            mx="-3"
            px="3"
            css={{
              '&::after': {
                content: '""',
                position: 'absolute',
                insetInline: '0',
                top: '100%',
                height: '6',
                pointerEvents: 'none',
                bgImage: 'linear-gradient(to bottom, {colors.ui.surface}, transparent)',
                opacity: 'var(--esw-rail-head, 0)',
              },
            }}
          >
          <HStack justify="space-between" px="3" pt="2" pb="2">
            <Listbox.Label fontSize="ui.sm" fontWeight="bold" color="ui.muted" textTransform="uppercase" letterSpacing=".04em" ps="1">
              {__('Sets', 'easy-svg')}
            </Listbox.Label>
            <HStack gap="1">
            {findSets ? (
              <IconButton
                data-find-sets
                size="xs"
                minW="11"
                minH="11"
                variant="ghost"
                color="colorPalette.fg"
                css={{ '& svg': { width: '4.5', height: '4.5' } }}
                aria-label={railFind ? __('Close search', 'easy-svg') : __('Search sets', 'easy-svg')}
                title={railFind ? __('Close search', 'easy-svg') : __('Search sets', 'easy-svg')}
                aria-expanded={railFind}
                onClick={() => {
                  setRailFind(!railFind)
                  setRailQuery('')
                }}
              >
                {/* Open, the search button closes it. */}
                {railFind ? <LuX /> : <LuSearch />}
              </IconButton>
            ) : null}
            {creator && newSet ? (
              <IconButton
                size="xs"
                minW="11"
                minH="11"
                variant="ghost"
                color="colorPalette.fg"
                css={{ '& svg': { width: '5', height: '5' } }}
                aria-label={__('Cancel', 'easy-svg')}
                title={__('Cancel', 'easy-svg')}
                onClick={() => setNewSet(null)}
              >
                <LuX />
              </IconButton>
            ) : creator ? (
              <Menu.Root lazyMount unmountOnExit positioning={MENU_FIXED}>
                <Menu.Trigger asChild>
                  <IconButton
                    data-new-set
                    size="xs"
                    minW="11"
                    minH="11"
                    color="colorPalette.fg"
                    css={{ '& svg': { width: '5', height: '5' } }}
                    variant="ghost"
                    disabled={busy}
                    aria-label={__('Add a set', 'easy-svg')}
                    title={__('Add a set', 'easy-svg')}
                  >
                    <AddGlyph />
                  </IconButton>
                </Menu.Trigger>
                <Portal container={PANEL_ROOT}>
                  <Menu.Positioner>
                    <Menu.Content {...MENU_CONTENT}>
                      <Menu.Item value="new" onSelect={() => setNewSet({ name: '' })}>
                        <FolderGlyph />
                        {__('New set', 'easy-svg')}
                      </Menu.Item>
                      {'function' === typeof creator.importSet ? (
                        <Menu.Item value="import" onSelect={() => setImporting({ mode: 'file', file: null, url: '', error: '' })}>
                          <UploadGlyph />
                          {__('Import a set', 'easy-svg')}
                        </Menu.Item>
                      ) : null}
                      {/* Ready-made sets live with Import and export. */}
                      <Menu.Item value="presets" onSelect={openTemplates}>
                        <LuLayoutTemplate />
                        {__('From a template', 'easy-svg')}
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>
            ) : null}
            </HStack>
          </HStack>
          {newSetRow}
          {findSets && railFind ? (
            <Box px="1" pb="2">
              <SearchField
                label={__('Search sets', 'easy-svg')}
                placeholder={__('Search sets', 'easy-svg')}
                size="sm"
                value={railQuery}
                onChange={(e) => setRailQuery(e.target.value)}
                autoFocus
                w="full"
                onKeyDown={(e) => {
                  if ('Escape' === e.key) {
                    e.stopPropagation()
                    setRailFind(false)
                    setRailQuery('')
                  }
                }}
              />
            </Box>
          ) : null}
          </Box>
          {setTerm && !setEntries.items.length ? (
            <HStack px="4" py="3" gap="3" color="ui.muted" css={{ '& svg': { width: '5', height: '5' } }}>
              <LuSearchX />
              <Text as="span" fontSize="ui.body">{__('Nothing found', 'easy-svg')}</Text>
            </HStack>
          ) : null}
          {setEntries.items.length ? (
            <Listbox.Content
              // Before the list's own arrows, which would only move the highlight.
              onKeyDownCapture={(e) => {
                const c = e.altKey && !busy && ('ArrowUp' === e.key || 'ArrowDown' === e.key) ? collections.find((x) => x.id === view) : null
                if (c && neighbour(c, 'ArrowUp' === e.key ? -1 : 1)) {
                  e.preventDefault()
                  e.stopPropagation()
                  moveSet(c, 'ArrowUp' === e.key ? -1 : 1)
                }
              }}
              onKeyDown={(e) => {
                rowMenuKey(e)
                setKey(e)
              }}
              gap="0"
              bg="transparent"
              p="0"
              borderWidth="0"
              maxH="none"
              overflow="visible"
              css={ROW_LINES}
              _focusVisible={LIST_FOCUS} {...BY_POINTER}
            >
              {setEntries.items.map(item)}
            </Listbox.Content>
          ) : null}
        </Listbox.Root>
      ) : null}
      {0 === providers.length && ctx.canManage && !(ctx.proActive && ctx.proLicensed) ? (
        <Stack data-rail-pro-note gap="2" mt="3" p="3" borderWidth="ui.hair" borderColor="ui.border" borderRadius="forge" bg="ui.surface">
          {/* A lapsed site hears its sets are kept; a network without the plan hears why. Pro's own words. */}
          <Text fontSize="ui.body" color="ui.text">
            {ctx.keptSets > 0
              ? sprintf(
                  // translators: %d: number of icon sets that stay saved.
                  _n(
                    'Your %d icon set is saved, and pages keep showing its icons. With an active license you can edit it again.',
                    'Your %d icon sets are saved, and pages keep showing their icons. With an active license you can edit them again.',
                    ctx.keptSets,
                    'easy-svg'
                  ),
                  ctx.keptSets
                )
              : 'tier' === ctx.toolsLocked
                ? __('The license of this network does not cover the Pro tools.', 'easy-svg')
                : __('Easy SVG Pro adds more sets, templates and integrations.', 'easy-svg')}
          </Text>
          {ctx.proActive && ctx.canLicence ? (
            'tier' === ctx.toolsLocked ? (
              accountUrl ? (
                <Link href={accountUrl} target="_blank" rel="noopener" fontSize="ui.body" fontWeight="medium" color="ui.primary" textDecoration="none" _hover={{ textDecoration: 'underline' }}>
                  {__('Upgrade in your account', 'easy-svg')}
                </Link>
              ) : null
            ) : (
              <Link href={`${window.location.pathname}?page=easy-svg-icons&tab=licence`} fontSize="ui.body" fontWeight="medium" color="ui.primary" textDecoration="none" _hover={{ textDecoration: 'underline' }}>
                {ctx.keptSets > 0 ? __('Renew license', 'easy-svg') : __('Activate Pro', 'easy-svg')}
              </Link>
            )
          ) : ctx.proActive ? (
            // The licence tab is the network administrator's: no link that ends somewhere else.
            <Text data-ask-admin fontSize="ui.body" color="ui.muted">{__('Ask your network administrator.', 'easy-svg')}</Text>
          ) : (
            // Free's own Pro page: the shop address there is PHP's, never one typed here.
            <Link href={`${window.location.pathname}?page=easy-svg-icons&tab=upsell`} onClick={(e) => { e.preventDefault(); ctx.goTo('upsell') }} fontSize="ui.body" fontWeight="medium" color="ui.primary" textDecoration="none" _hover={{ textDecoration: 'underline' }}>
              {__('See Easy SVG Pro', 'easy-svg')}
            </Link>
          )}
        </Stack>
      ) : null}
      {collectionsFailed ? (
        <Notice bad role="alert" data-collections-failed mt="2" retry={__('Try again', 'easy-svg')} onRetry={() => reloadCollections.current()}>
          {__('Some icon collections could not be loaded. The list shows only part of your library.', 'easy-svg')}
        </Notice>
      ) : null}
      {hints.map((p) => (
        <Stack key={p.id} data-collections-hint gap="2" mt="2" p="3" borderWidth="ui.hair" borderColor="ui.border" borderRadius="forge" bg="ui.surface">
          <Text fontSize="ui.body" color="ui.text">{p.hint.text}</Text>
          {p.hint.action && 'function' === typeof p.hint.action.run ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => runHint(p.hint)}>
              {p.hint.action.label}
            </Button>
          ) : null}
        </Stack>
      ))}
    </Stack>
    </Box>
  )
}

// Still inside the drag context, so a long press reorders sets here too.
export function railDrawerView({ railButton, railCover, railOpen, setRailOpen, sidebar, sortIds }) {
  return (
    <Drawer.Root open={railOpen} onOpenChange={(e) => setRailOpen(e.open)} finalFocusEl={() => railButton.current} placement="start" size="xs" lazyMount unmountOnExit>
      <Portal container={FRAME_ROOT}>
        <Drawer.Backdrop />
        <Drawer.Positioner top={OVERLAY_TOP} bottom="0" h="auto" style={railCover}>
          <Drawer.Content bg="ui.surface" data-collections-drawer>
            <Drawer.Header display="flex" alignItems="center" justifyContent="space-between" h="ui.header" px="4" py="0" borderBottomWidth="ui.hair" borderColor="ui.border">
              <Drawer.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">{__('Collections', 'easy-svg')}</Drawer.Title>
              <Drawer.CloseTrigger asChild position="static">
                <CloseButton aria-label={__('Close', 'easy-svg')} minW="11" h="11" css={{ '& svg': { width: '5', height: '5' } }} />
              </Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body p="0">
              <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
                {sidebar}
              </SortableContext>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}
