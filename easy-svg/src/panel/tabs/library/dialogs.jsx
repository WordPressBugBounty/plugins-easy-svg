import { useRef, useState } from 'react'
import {
  Button,
  Input,
  Box,
  CloseButton,
  Dialog,
  Field,
  FileUpload,
  HStack,
  IconButton,
  Pagination,
  Stack,
  Text,
} from '@chakra-ui/react'
import { LuCheck, LuChevronLeft, LuChevronRight, LuArrowRight } from 'react-icons/lu'
import { __, _n, sprintf } from '@wordpress/i18n'
import { Notice } from '../../parts.jsx'
import { binCounts } from '../../trash-bins.js'
import { PasteForm } from './PasteForm.jsx'
import { MAX_FILES, CopyGlyph, TrashGlyph, PER_PAGE, copyText, trashWords } from './helpers.js'
import { Hold } from './widgets.jsx'

export function deleteDialogView({
  bins, busy, confirmLibrary, confirmName, confirmPurge, confirmRemove, confirming, ctx, giveBack, purging,
  removing, setConfirming, trashCount, trashTotal,
}) {
  return (
    <Dialog.Root
      open={!!confirming}
      onOpenChange={(e) => (e.open ? null : setConfirming(null))}
      finalFocusEl={giveBack}
      role="alertdialog"
      placement="center"
      initialFocusEl={() => document.querySelector('[data-confirm-delete]')}
      // Not portalled: the panel's type and tokens are scoped to its subtree,
      // and a dialog in document.body would render in wp-admin's own styles.
      modal
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content data-confirm-delete borderRadius="forge" bg="ui.surface" _focusVisible={{ outline: 'none' }}>
          <Hold open={!!confirming}>
          <Dialog.Header pb="2">
            <Dialog.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">
              {purging
                ? 'all' === purging.kind
                  ? __('Empty trash', 'easy-svg')
                  : 'picked' === purging.kind
                    ? sprintf(
                        // translators: %s: what is deleted, e.g. "3 icons and 1 set".
                        __('Delete %s for good', 'easy-svg'),
                        trashWords(
                          purging.icons.length + purging.rows.filter((row) => row.bin.icons).length,
                          purging.rows.filter((row) => !row.bin.icons).length
                        )
                      )
                  : sprintf(
                      // translators: %s: name of the icon or set in the trash.
                      __('Delete “%s” for good', 'easy-svg'),
                      confirmName
                    )
                : confirming && confirming.bulk
                ? sprintf(
                    // translators: %d: number of icons selected.
                    _n('Delete %d icon', 'Delete %d icons', removing, 'easy-svg'),
                    removing
                  )
                : sprintf(
                    // translators: %s: icon name.
                    __('Delete icon “%s”', 'easy-svg'),
                    confirmName
                  )}
            </Dialog.Title>
          </Dialog.Header>
          {/* Only what goes for good says so: out of the trash, or a library icon on a site that keeps no trash. */}
          <Dialog.Body pt="0" pb="6">
            <Dialog.Description fontSize="ui.body" color="ui.muted">
              {'all' === purging?.kind && trashTotal
                ? `${sprintf(
                    // translators: %s: what is deleted, e.g. "3 icons and 1 set".
                    __('This deletes %s.', 'easy-svg'),
                    trashWords(trashCount + binCounts(bins).icons, binCounts(bins).sets)
                  )} `
                : null}
              {__('Are you sure?', 'easy-svg')}
              {purging || (confirmLibrary && !(ctx.trashDays > 0))
                ? ` ${__('This cannot be undone.', 'easy-svg')}`
                : confirmLibrary
                  ? ` ${_n('The icon is moved to the trash.', 'The icons are moved to the trash.', confirmLibrary, 'easy-svg')}`
                  : null}
            </Dialog.Description>
          </Dialog.Body>
          <Dialog.Footer gap="3" borderTopWidth="ui.hair" borderColor="ui.border" pt="4">
            <Dialog.ActionTrigger asChild>
              <Button variant="outline" disabled={busy}>{__('Cancel', 'easy-svg')}</Button>
            </Dialog.ActionTrigger>
            <Button variant="solid" colorPalette="red" onClick={purging ? confirmPurge : confirmRemove} loading={busy}>
              <TrashGlyph />
              {purging ? ('all' === purging.kind ? __('Empty trash', 'easy-svg') : __('Delete for good', 'easy-svg')) : __('Delete', 'easy-svg')}
            </Button>
          </Dialog.Footer>
          </Hold>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

// FileUpload owns the input, drag state and keyboard path; a filled library takes drops on the grid instead.
export function uploadSurfaceView({ acceptFiles, addFiles, addFromMedia, busy, pasteLabel, pickRound, setPasting }) {
  return (
    <Stack gap="3">
      <FileUpload.Root
        key={pickRound}
        accept={acceptFiles}
        maxFiles={MAX_FILES}
        multiple
        disabled={busy}
        alignItems="stretch"
        onFileAccept={(details) => addFiles(details.files)}
      >
        <FileUpload.HiddenInput />
        {/* Not a button itself: a focusable wrapper around the buttons is nested-interactive (WCAG 4.1.2). */}
        <FileUpload.Dropzone
          disableClick
          role="group"
          aria-label={__('Drag SVGs here', 'easy-svg')}
          borderWidth="ui.drop"
          borderStyle="dashed"
          borderColor="ui.wpBorder"
          borderRadius="0"
          bg="transparent"
          px="6"
          py="16"
          minH="0"
          gap="3"
          _dragging={{ borderColor: 'ui.primary', bg: 'ui.ghostHover' }}
        >
          {/* The same as over the grid, as the media library's uploader. */}
          <FileUpload.DropzoneContent gap="3">
            <Text fontSize="ui.2xl" fontWeight="normal" color="ui.heading">{__('Drop files to upload', 'easy-svg')}</Text>
            <Text fontSize="ui.body" color="ui.text">{__('or', 'easy-svg')}</Text>
            <Button data-upload-button variant="outline" size="lg" px="9" fontSize="ui.md" bg="ui.surface" borderColor="ui.primary" color="ui.primary" disabled={busy} onClick={(e) => { e.stopPropagation(); addFromMedia() }}>
              {__('Upload', 'easy-svg')}
            </Button>
          </FileUpload.DropzoneContent>
        </FileUpload.Dropzone>
      </FileUpload.Root>
      <Button data-paste-svg variant="plain" size="sm" alignSelf="center" h="auto" px="0" color="ui.primary" textDecoration="underline" _hover={{ textDecoration: 'none' }} disabled={busy} onClick={() => setPasting(true)}>
        {pasteLabel}
      </Button>
    </Stack>
  )
}

export function ruleRenameDialogView({ applyRuleRename, busy, giveBack, rule, ruleRename, setRule, setRuleRename }) {
  const ruleField = (key, label) => (
    <Field.Root flex="1" minW="40">
      <Field.Label fontSize="ui.body" fontWeight="medium" color="ui.heading">{label}</Field.Label>
      <Input
        value={rule[key]}
        onChange={(e) => setRule({ ...rule, [key]: e.target.value })}
      />
    </Field.Root>
  )
  const renameStates = {
    same: __('Stays the same', 'easy-svg'),
    empty: __('The name would be empty', 'easy-svg'),
    too_long: __('Too long', 'easy-svg'),
    unknown: __('Not found', 'easy-svg'),
    too_old: __('Update Easy SVG to use this', 'easy-svg'),
  }
  const renameCount = (ruleRename?.plan || []).filter((r) => 'rename' === r.state).length
  return (
    <Dialog.Root open={!!ruleRename} onOpenChange={(e) => (e.open ? null : setRuleRename(null))} finalFocusEl={giveBack} placement="center" modal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content data-rule-rename borderRadius="forge" bg="ui.surface" maxW="ui.dialogLg" mx="4">
          <Hold open={!!ruleRename}>
          <Dialog.Header borderBottomWidth="ui.hair" borderColor="ui.border" py="4">
            <Dialog.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">
              {sprintf(
                // translators: %d: number of icons picked.
                _n('Rename %d icon', 'Rename %d icons', ruleRename?.refs.length || 0, 'easy-svg'),
                ruleRename?.refs.length || 0
              )}
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.CloseTrigger asChild top="3" insetEnd="3">
            <CloseButton size="sm" css={{ '& svg': { width: '5', height: '5' } }} aria-label={__('Close', 'easy-svg')} />
          </Dialog.CloseTrigger>
          <Dialog.Body py="5">
            <Stack gap="5">
              <HStack gap="3" align="flex-end" flexWrap="wrap">
                {ruleField('find', __('Find', 'easy-svg'))}
                {ruleField('replace', __('Replace with', 'easy-svg'))}
              </HStack>
              <HStack gap="3" align="flex-end" flexWrap="wrap">
                {ruleField('prefix', __('Put in front', 'easy-svg'))}
                {ruleField('suffix', __('Put behind', 'easy-svg'))}
              </HStack>
              {ruleRename?.error ? <Notice bad role="alert">{ruleRename.error}</Notice> : null}
              {ruleRename?.plan && ruleRename.plan.length ? (
                // Old and new, row by row, before anything is saved.
                <Stack gap="0" maxH="ui.listMax" overflowY="auto" borderWidth="ui.hair" borderColor="ui.border" borderRadius="forge" divideY="{borderWidths.ui.hair}" divideColor="ui.border">
                  {ruleRename.plan.map((row) => (
                    <HStack key={row.icon} gap="3" px="4" py="3" fontSize="ui.body">
                      <Text as="span" color="ui.muted" flex="1" minW="0" truncate>{row.from || row.icon}</Text>
                      <Box as="span" color="ui.muted" flexShrink="0" css={{ '& svg': { width: '4', height: '4' } }}><LuArrowRight /></Box>
                      {'rename' === row.state ? (
                        <Text as="span" color="ui.heading" fontWeight="medium" flex="1" minW="0" truncate>{row.to}</Text>
                      ) : (
                        <Text as="span" color="ui.muted" flex="1" minW="0" truncate>{renameStates[row.state] || row.state}</Text>
                      )}
                    </HStack>
                  ))}
                </Stack>
              ) : null}
            </Stack>
          </Dialog.Body>
          <Dialog.Footer gap="3" borderTopWidth="ui.hair" borderColor="ui.border" pt="4">
            <Dialog.ActionTrigger asChild>
              <Button variant="outline">{__('Cancel', 'easy-svg')}</Button>
            </Dialog.ActionTrigger>
            <Button variant="solid" disabled={busy || !renameCount} onClick={applyRuleRename}>
              {renameCount
                ? sprintf(
                    // translators: %d: how many icons would be renamed.
                    _n('Rename %d', 'Rename %d', renameCount, 'easy-svg'),
                    renameCount
                  )
                : __('Rename', 'easy-svg')}
            </Button>
          </Dialog.Footer>
          </Hold>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

export function pasteDialogView({
  addPasted, busy, label, markup, pasteLabel, pasting, setLabel, setMarkup, setPasting,
}) {
  return (
    <Dialog.Root open={pasting} onOpenChange={(e) => setPasting(e.open)} placement="center" modal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content data-paste-dialog borderRadius="forge" bg="ui.surface" maxW="ui.wide" mx="4">
          <Hold open={pasting}>
          <Dialog.Header borderBottomWidth="ui.hair" borderColor="ui.border" py="4">
            <Dialog.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">{pasteLabel}</Dialog.Title>
          </Dialog.Header>
          <Dialog.CloseTrigger asChild top="3" insetEnd="3">
            <CloseButton size="sm" css={{ '& svg': { width: '5', height: '5' } }} aria-label={__('Close', 'easy-svg')} />
          </Dialog.CloseTrigger>
          <Dialog.Body py="5">
            <PasteForm {...{ label, setLabel, markup, setMarkup, addPasted, busy, setPasting }} />
          </Dialog.Body>
          </Hold>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

// As a WordPress list table: back, where you are, on; one look on a phone and a desktop alike.
export function pagerView({ busy, extra, libraryCount, onPage, pageCount, setPage }) {
  return pageCount > 1 ? (
    <Pagination.Root
      data-pagination
      count={libraryCount + extra.length}
      pageSize={PER_PAGE}
      page={onPage}
      onPageChange={(e) => {
        setPage(e.page)
        // The next page starts at its first row, not where the last one ended.
        window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      }}
    >
      <HStack gap="3">
        <Pagination.PrevTrigger asChild>
          <IconButton variant="outline" size="sm" bg="ui.surface" borderColor="ui.border" color="ui.heading" aria-label={__('Previous page', 'easy-svg')} disabled={busy}>
            <LuChevronLeft />
          </IconButton>
        </Pagination.PrevTrigger>
        <Pagination.PageText
          fontSize="ui.md"
          color="ui.muted"
          format={({ page, totalPages }) =>
            sprintf(
              // translators: 1: the page shown, 2: how many pages there are.
              __('Page %1$d of %2$d', 'easy-svg'),
              page,
              totalPages
            )
          }
        />
        <Pagination.NextTrigger asChild>
          <IconButton variant="outline" size="sm" bg="ui.surface" borderColor="ui.border" color="ui.heading" aria-label={__('Next page', 'easy-svg')} disabled={busy}>
            <LuChevronRight />
          </IconButton>
        </Pagination.NextTrigger>
      </HStack>
    </Pagination.Root>
  ) : null
}

// Where neither copy worked: a small window with the code selected, never a box pushing the grid down.
function CopyHelpDialog({ text, onClose }) {
  const [copied, setCopied] = useState(false)
  const field = useRef(null)
  return (
    <Dialog.Root open={!!text} onOpenChange={(e) => (e.open ? null : onClose())} initialFocusEl={() => field.current} placement="center" modal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content data-copy-help borderRadius="forge" bg="ui.surface" maxW="ui.dialogMd" mx="4">
          <Dialog.Header borderBottomWidth="ui.hair" borderColor="ui.border" py="4">
            <Dialog.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">{__('Copy the code', 'easy-svg')}</Dialog.Title>
          </Dialog.Header>
          <Dialog.CloseTrigger asChild top="3" insetEnd="3">
            <CloseButton size="sm" css={{ '& svg': { width: '5', height: '5' } }} aria-label={__('Close', 'easy-svg')} />
          </Dialog.CloseTrigger>
          <Dialog.Body py="5">
            <Stack gap="3">
              <Text fontSize="ui.body" color="ui.muted">{__('This browser did not let the panel copy. The code is selected: copy it with Ctrl+C or Cmd+C.', 'easy-svg')}</Text>
              <HStack gap="2">
                <Input
                  readOnly
                  value={text}
                  flex="1"
                  minW="0"
                  fontFamily="mono"
                  fontSize="ui.sm"
                  aria-label={__('Code for your theme', 'easy-svg')}
                  onFocus={(e) => e.currentTarget.select()}
                  data-copy-field
                  ref={field}
                />
                <IconButton
                  variant="solid"
                  colorPalette="brand"
                  flexShrink={0}
                  aria-label={copied ? __('Copied', 'easy-svg') : __('Copy', 'easy-svg')}
                  onClick={async () => setCopied(await copyText(text))}
                >
                  {copied ? <LuCheck /> : <CopyGlyph />}
                </IconButton>
              </HStack>
            </Stack>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

export function messagesView({ copyHelp, setCopyHelp }) {
  return copyHelp ? <CopyHelpDialog text={copyHelp} onClose={() => setCopyHelp('')} /> : null
}
