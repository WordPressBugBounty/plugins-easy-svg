import { useRef } from 'react'
import {
  Alert,
  Button,
  Box,
  Card,
  CloseButton,
  Progress,
  Flex,
  HStack,
  SimpleGrid,
  VisuallyHidden,
  Stack,
  Text,
} from '@chakra-ui/react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { isSortId, railCollide } from '../../rail-sort.jsx'
import { __, _n, sprintf } from '@wordpress/i18n'
import { SkeletonRows, EmptyState as Nothing, useToastLift } from '../../../ui.jsx'
import { BatchProgress } from './BatchProgress.jsx'
import { IconTile } from './IconTile.jsx'
import { callForms, refOf, STICKY_BAR, UploadGlyph, TRASH_VIEW, GRID_COLUMNS } from './helpers.js'
import { DragPicture } from './widgets.jsx'
import { dropAnimation, landedRefs } from './library-logic.js'

// The library's own toast joins the kit's stack, so it never covers a toast another screen part shows.
function LiftedToast(props) {
  const box = useRef(null)
  useToastLift(box)
  return (
    <Alert.Root
      ref={box}
      position="fixed"
      bottom={{ base: 'calc({spacing.3} + var(--esw-toast-lift, 0px))', md: 'calc({sizes.ui.footer} + {spacing.4} + var(--esw-toast-lift, 0px))' }}
      {...props}
    />
  )
}

export function libraryLayoutView({
  activeDrag, addFromMedia, bulkActions, busy, collectionTiles, copierOf, copyCall, copyTargetsOf, copyTo, ctx,
  deleteDialog, deleteSetDialog, detailsDialog, dropOver, droppedOnSet, emptyHere, err, exportDialog, fileInput,
  flipFrom, grid, headerAction, importSetDialog, noSvgNotice, messages, moveDialog, moveTo, moved, needMore, openDetails,
  openMove, openTrash, orderSaid, pageItems, pager, pasteDialog, pasteLabel, picked, pickedTiles, progress,
  query, railDrawer, railInline, remember, removeIcon, renameSetDialog, reorderSets, reportBox, ruleRenameDialog,
  searching, selecting, sensors, setActiveDrag, setDragging, setDropOver, setErr, setLanded, setMoved,
  setPasting, setQuery, setStatus, setUploadOpen, shown, sidebar, snapTiles, sortIds, sortedById,
  status, stickyRef, switchIcons, targets, templatesDialog, tiles, toastTrash, toastUndo, togglePicked,
  toolDrawer, toolbar, trashBody, trashHead, trashOpen, undoMove, uploadOpen, view, working,
}) {
  return (
    <Stack gap="4" colorPalette="brand">
      {headerAction}

      {/* role=status speaks the match count once the keystrokes stop. */}
      {/* Spoken, not shown: the grid itself shows what was found. */}
      {query.trim() && TRASH_VIEW !== view ? (
        <VisuallyHidden role="status" aria-live="polite">
          {searching
            ? __('Searching…', 'easy-svg')
            : sprintf(
                // translators: %d: number of icons the search found.
                _n('%d icon found.', '%d icons found.', shown.length, 'easy-svg'),
                shown.length
              )}
        </VisuallyHidden>
      ) : null}

      {/* A set moved by key or menu is said, so a screen reader hears where it went. */}
      <VisuallyHidden role="status" aria-live="polite" data-order-said>
        {orderSaid}
      </VisuallyHidden>

      {messages}

      {/* What the last action said: green when it worked, red when it did not. */}
      {moved || status || err ? (
        <LiftedToast
          data-toast
          data-library-toast
          {...(moved && !err && !moved.failed ? { 'data-move-result': '' } : {})}
          // Something went to the trash: said as a warning, not as a success.
          status={err || moved?.failed ? 'error' : moved?.openTrash ? 'warning' : 'success'}
          variant="surface"
          role={err || moved?.failed ? 'alert' : 'status'}
          insetEnd={{ base: '3', md: '6' }}
          zIndex="toast"
          w="auto"
          maxW="ui.actionBar"
          alignItems="center"
          // Two actions do not fit beside the sentence on a phone: they take the line below it.
          flexWrap="wrap"
          rowGap="2"
          boxShadow="lg"
        >
          <Alert.Indicator />
          <Alert.Content flex="1" minW="40">
            <Alert.Description fontSize="ui.body">{err || (moved ? moved.message : status)}</Alert.Description>
          </Alert.Content>
          {/* One action sits beside the sentence. Two take a line of their own, side by side, so nothing wraps under the close button. */}
          {toastUndo && !toastTrash ? (
            <Button size="sm" variant="outline" bg="ui.surface" onClick={undoMove} disabled={busy}>
              {moved?.actionLabel || __('Undo', 'easy-svg')}
            </Button>
          ) : null}
          <CloseButton
            size="sm"
            aria-label={__('Dismiss', 'easy-svg')}
            onClick={() => {
              setMoved(null)
              setStatus('')
              setErr('')
            }}
          />
          {toastUndo && toastTrash ? (
            <HStack w="full" gap="2" justify="flex-end" flexWrap="wrap">
              <Button size="sm" variant="outline" bg="ui.surface" onClick={undoMove} disabled={busy}>
                {moved?.actionLabel || __('Undo', 'easy-svg')}
              </Button>
              <Button data-open-trash size="sm" variant="outline" bg="ui.surface" onClick={openTrash} disabled={busy}>
                {__('Open trash', 'easy-svg')}
              </Button>
            </HStack>
          ) : !toastUndo && toastTrash ? (
            <HStack w="full" gap="2" justify="flex-end">
              <Button data-open-trash size="sm" variant="outline" bg="ui.surface" onClick={openTrash} disabled={busy}>
                {__('Open trash', 'easy-svg')}
              </Button>
            </HStack>
          ) : null}
        </LiftedToast>
      ) : null}

      {/* Edge to edge: the sets in a white rail, the icons on the page's grey; the whole grid takes dropped files. */}
      <Card.Root
        variant="outline"
        bg="transparent"
        borderWidth="0"
        borderRadius="0"
        boxShadow="none"
        mx={{ base: '-4', md: '-6' }}
        my={{ base: '-5', md: '-6' }}
        minH="calc(max(100vh - var(--esw-admin-bar), var(--esw-menu-h, 0px)) - {sizes.ui.header} - {sizes.ui.footer})"
        display="flex"
        flexDirection="column"
      >
      <DndContext
        sensors={sensors}
        // The set under the pointer, not under the dragged tile's corner.
        collisionDetection={railCollide(sortedById)}
        onDragStart={({ active }) => {
          if (isSortId(active.id)) {
            return
          }
          const ic = shown.find((x) => x.id === active.id)
          if (!ic) {
            return
          }
          flipFrom.current = snapTiles()
          droppedOnSet.current = false
          // A picked icon takes the whole pick with it.
          setActiveDrag({
            ic,
            refs: picked.has(ic.id) ? pickedTiles.map(refOf) : [refOf(ic)],
            size: active.rect.current.initial?.width || 0,
          })
          setDragging(true)
          document.body.style.cursor = 'grabbing'
        }}
        onDragOver={({ over }) => setDropOver(over ? String(over.id) : null)}
        onDragEnd={({ active, over }) => {
          if (isSortId(active.id)) {
            setDropOver(null)
            reorderSets(String(active.id), over ? String(over.id) : '')
            return
          }
          const target = over ? targets.find((c) => `set:${c.id}` === String(over.id)) : null
          const refs = activeDrag?.refs || []
          document.body.style.cursor = ''
          flipFrom.current = snapTiles()
          droppedOnSet.current = !!target && refs.length > 0
          if (droppedOnSet.current) {
            setLanded(landedRefs({ refs, target, collectionTiles }))
          }
          setActiveDrag(null)
          setDragging(false)
          setDropOver(null)
          if (target && refs.length) {
            moveTo(target, refs)
          }
        }}
        onDragCancel={() => {
          document.body.style.cursor = ''
          flipFrom.current = snapTiles()
          setActiveDrag(null)
          setDragging(false)
          setDropOver(null)
        }}
      >
      <Flex direction={{ base: 'column', lg: 'row' }} align="stretch" flex="1">
      {railInline ? (
        <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
          {sidebar}
        </SortableContext>
      ) : null}
      {railInline ? null : railDrawer}
      <Card.Body data-icon-grid data-trash-view={trashOpen ? '' : undefined} flex="1" minW="0" position="relative" minH="60" px={{ base: '4', md: '6' }} py={{ base: '5', md: '6' }} gap="6" {...grid.props}>
        {trashOpen ? trashHead : null}
        {/* Select all and search sit over the icons they act on. */}
        {/* Edit and its bar stay at the top of the grid while the icons scroll. */}
        <Box
          data-toolbar-sticky
          position="sticky"
          top="calc(var(--esw-admin-bar) + {sizes.ui.header})"
          zIndex="2"
          ref={stickyRef}
          mx={{ base: '-4', md: '-6' }}
          px={{ base: '4', md: '6' }}
          pt="3"
          pb="14"
          mt="-3"
          // The fade hangs over the grid without pushing it down.
          mb="-11"
          pointerEvents="none"
          css={STICKY_BAR}
        >
          {toolbar}
        </Box>
        {trashOpen ? trashBody : (
        <>
        {/* auto-fill, not auto-fit: with three icons auto-fit would stretch them across the row. */}
        {/* What an upload refused, in the content, not over the whole page. */}
        {reportBox}
        {/* The area itself opens from the header button; on a network without svg the reason stands in its place. */}
        {noSvgNotice || (uploadOpen || progress || emptyHere ? (
          // Under the frame, not in it: the one other way in, as a plain text link.
          <Stack gap="3">
            <Flex
              data-upload-area
              position="relative"
              direction="column"
              align="center"
              justify="center"
              gap="4"
              px="10"
              py="16"
              borderWidth="ui.drop"
              borderStyle="dashed"
              borderColor={grid.isOver ? 'ui.primary' : 'ui.wpBorder'}
              borderRadius="0"
              bg="transparent"
            >
              {progress || emptyHere ? null : (
                <CloseButton
                  size="sm"
                  position="absolute"
                  top="3"
                  insetEnd="3"
                  aria-label={__('Close', 'easy-svg')}
                  onClick={() => setUploadOpen(false)}
                  css={{ '& svg': { width: '5', height: '5' } }}
                />
              )}
              {progress ? (
                <Stack w="full" maxW="ui.narrow" gap="3" align="center" role="status" aria-live="polite">
                  <Text as="span" fontSize="ui.2xl" fontWeight="medium" color="ui.heading">
                    {sprintf(
                      // translators: 1: files added so far, 2: all files.
                      __('Adding %1$d of %2$d', 'easy-svg'),
                      Math.min(progress.done + 1, progress.total),
                      progress.total
                    )}
                  </Text>
                  <Progress.Root w="full" size="sm" striped animated value={progress.total ? Math.round((progress.done / progress.total) * 100) : null} colorPalette="brand">
                    <Progress.Track borderRadius="full">
                      <Progress.Range borderRadius="full" bgColor="ui.primary" transition="width 0.3s ease" />
                    </Progress.Track>
                  </Progress.Root>
                </Stack>
              ) : (
                // As the media library's uploader: the dashed frame, one line, or, one button that opens the media library.
                <Stack data-empty-library={emptyHere ? '' : undefined} gap="3" align="center">
                  <Text as="span" fontSize="ui.2xl" fontWeight="normal" color="ui.heading">{__('Drop files to upload', 'easy-svg')}</Text>
                  <Text as="span" fontSize="ui.body" color="ui.text">{__('or', 'easy-svg')}</Text>
                  <Button data-upload-button variant="outline" size="lg" px="9" fontSize="ui.md" bg="ui.surface" borderColor="ui.primary" color="ui.primary" disabled={busy} onClick={addFromMedia}>
                    {__('Upload', 'easy-svg')}
                  </Button>
                </Stack>
              )}
            </Flex>
            {progress ? null : (
              <Button data-paste-svg variant="plain" size="sm" alignSelf="center" h="auto" px="0" color="ui.primary" textDecoration="underline" _hover={{ textDecoration: 'none' }} disabled={busy} onClick={() => setPasting(true)}>
                {pasteLabel}
              </Button>
            )}
          </Stack>
        ) : null)}
        {/* A phone three across, a tablet four; from lg the tile's width decides. */}
        <SimpleGrid
          ref={tiles.ref}
          templateColumns={GRID_COLUMNS}
          gap="3"
        >
          {pageItems.map((ic) => (
            <IconTile
              key={ic.id}
              ic={ic}
              busy={busy}
              // Only with the sets in sight: below lg they sit in a closed drawer, and Move takes over.
              canDrag={railInline && targets.length > 0 && !ic.source?.readonly}
              selecting={selecting}
              picked={picked.has(ic.id)}
              bulk={picked.has(ic.id) && picked.size > 1 ? bulkActions : null}
              away={!!activeDrag && activeDrag.refs.includes(refOf(ic))}
              onPick={(on) => togglePicked(ic.id, on)}
              onSwitch={!ic.source || ic.canSwitch ? () => switchIcons([ic], !ic.off) : null}
              onOpen={() => openDetails(ic)}
              onRename={ic.readonly && !ic.canRename ? null : () => openDetails(ic, 'name')}
              onCopy={(form) => copyCall(ic, form)}
              forms={callForms(ic, ctx.iconBlock)}
              onCopyLibrary={copierOf([ic]) ? () => copyTo(copierOf([ic]), 'easy-svg', [refOf(ic)]) : null}
              onCopySet={copierOf([ic]) && copyTargetsOf(copierOf([ic])).length ? () => { remember(); openMove([ic], copierOf([ic])) } : null}
              onMove={
                !ic.source?.readonly && targets.some((c) => c.id !== ic.collection)
                  ? () => {
                      remember()
                      openMove([ic])
                    }
                  : null
              }
              onRemove={ic.readonly && !ic.canRemove ? null : () => removeIcon(ic)}
            />
          ))}

          {/* A real <button> as the last tile, so the keyboard reaches it. */}
        </SimpleGrid>
        {needMore ? <Box pt="3"><SkeletonRows rows={2} /></Box> : null}
        {pager ? <Flex pt="5" justify="center">{pager}</Flex> : null}

        {shown.length === 0 && query.trim() ? (
          <Nothing
            title={__('No icon found', 'easy-svg')}
            description={__('Try another name or clear the search.', 'easy-svg')}
            action={
              <Button size="md" variant="outline" bg="ui.surface" onClick={() => setQuery('')}>
                {__('Clear search', 'easy-svg')}
              </Button>
            }
          />
        ) : null}
        </>
        )}

        {grid.isOver ? (
          <Flex
            data-drop-overlay
            position="absolute"
            inset="0"
            pointerEvents="none"
            align="center"
            justify="center"
            m="3"
            borderWidth="ui.heavy"
            borderStyle="dashed"
            borderColor="ui.primary"
            borderRadius="forge"
            bg="ui.veilBg"
            zIndex="3"
            alignItems="flex-start"
          >
            {/* In view wherever the grid is scrolled to. */}
            <Stack align="center" gap="4" position="sticky" top="calc(var(--esw-admin-bar) + {sizes.ui.header} + 30vh)" mt="20vh">
              <Flex align="center" justify="center" w="ui.dropCircle" h="ui.dropCircle" flexShrink="0" borderRadius="full" bg="ui.primary" color="brand.contrast" boxShadow="ui.drop" css={{ '& svg': { width: '8', height: '8', flexShrink: 0 } }}>
                <UploadGlyph />
              </Flex>
              <Text as="span" fontSize="ui.4xl" fontWeight="bold" color="ui.heading">{__('Release to add', 'easy-svg')}</Text>
              <Text as="span" fontSize="ui.body" color="ui.muted">{__('SVG or ZIP files are added at once.', 'easy-svg')}</Text>
            </Stack>
          </Flex>
        ) : null}
      </Card.Body>
      </Flex>
      <BatchProgress work={working} />
      {/* Several picked icons show as a stack under the pointer. */}
      <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={dropAnimation({ dropOver, droppedOnSet: droppedOnSet.current })}>
        {activeDrag ? <DragPicture ic={activeDrag.ic} count={activeDrag.refs.length} size={activeDrag.size} /> : null}
      </DragOverlay>
      </DndContext>
      </Card.Root>

      {fileInput}
      {pasteDialog}
      {toolDrawer}
      {templatesDialog}
      {ruleRenameDialog}
      {detailsDialog}
      {moveDialog}
      {exportDialog}
      {renameSetDialog}
      {deleteSetDialog}
      {importSetDialog}
      {deleteDialog}
    </Stack>
  )
}
