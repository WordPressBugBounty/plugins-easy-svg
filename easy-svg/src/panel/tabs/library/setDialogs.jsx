import {
  Alert,
  Button,
  Input,
  Box,
  Clipboard,
  CloseButton,
  Dialog,
  FileUpload,
  Flex,
  HStack,
  IconButton,
  InputGroup,
  RadioCard,
  Tabs,
  Stack,
  Text,
} from '@chakra-ui/react'
import { LuCheck, LuDownload, LuFileArchive, LuLink, LuUpload, LuX } from 'react-icons/lu'
import { __, _n, sprintf } from '@wordpress/i18n'
import { FormField } from '../../../ui.jsx'
import { Notice } from '../../parts.jsx'
import { CopyGlyph, TrashGlyph, AddGlyph, FolderGlyph } from './helpers.js'
import { Hold, PickOne } from './widgets.jsx'

export function exportDialogView({
  busy, canLink, exportRefs, exportSet, exportTooBig, exporter, exporting, runExport, setExporting,
}) {
  return (
    <Dialog.Root open={!!exporting} onOpenChange={(e) => (e.open ? null : setExporting(null))} placement="center" modal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content data-export-dialog borderRadius="forge" bg="ui.surface" maxW="ui.dialogMd" mx="4">
          <Hold open={!!exporting}>
          <Dialog.Header flexDirection="column" alignItems="flex-start" gap="1" pb="2">
            <Dialog.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">
              {sprintf(
                // translators: %s: name of the set.
                __('Export “%s”', 'easy-svg'),
                exportSet?.label || exportSet?.id || ''
              )}
            </Dialog.Title>
            <Text fontSize="ui.body" color="ui.muted">
              {sprintf(
                // translators: %d: number of icons in the set.
                _n('%d icon', '%d icons', exportRefs.length, 'easy-svg'),
                exportRefs.length
              )}
            </Text>
          </Dialog.Header>
          <Dialog.CloseTrigger asChild top="3" insetEnd="3">
            <CloseButton size="sm" css={{ '& svg': { width: '5', height: '5' } }} aria-label={__('Close', 'easy-svg')} />
          </Dialog.CloseTrigger>
          <Dialog.Body>
            <Stack gap="4">
              <RadioCard.Root
                value={exporting?.mode || 'download'}
                onValueChange={(e) => setExporting((x) => (x ? { ...x, mode: e.value, url: '', error: '' } : x))}
                colorPalette="brand"
                variant="outline"
              >
                <Flex gap="3" direction={{ base: 'column', sm: 'row' }} align="stretch">
                  {true ? (
                    <RadioCard.Item value="download" flex="1" borderRadius="forge" disabled={!exporter}>
                      <RadioCard.ItemHiddenInput />
                      <RadioCard.ItemControl>
                        <RadioCard.ItemContent gap="1">
                          <Box color="ui.primary" mb="1" css={{ '& svg': { width: 'ui.glyphMd', height: 'ui.glyphMd' } }}><LuDownload /></Box>
                          <RadioCard.ItemText fontWeight="bold" color="ui.heading">{__('Download', 'easy-svg')}</RadioCard.ItemText>
                          <RadioCard.ItemDescription fontSize="ui.body" color="ui.muted">{__('A ZIP file for this computer.', 'easy-svg')}</RadioCard.ItemDescription>
                        </RadioCard.ItemContent>
                        <RadioCard.ItemIndicator />
                      </RadioCard.ItemControl>
                    </RadioCard.Item>
                  ) : null}
                  {true ? (
                    <RadioCard.Item value="link" flex="1" borderRadius="forge" disabled={!canLink}>
                      <RadioCard.ItemHiddenInput />
                      <RadioCard.ItemControl>
                        <RadioCard.ItemContent gap="1">
                          <Box color="ui.primary" mb="1" css={{ '& svg': { width: 'ui.glyphMd', height: 'ui.glyphMd' } }}><LuLink /></Box>
                          <RadioCard.ItemText fontWeight="bold" color="ui.heading">{__('Link', 'easy-svg')}</RadioCard.ItemText>
                          <RadioCard.ItemDescription fontSize="ui.body" color="ui.muted">
                            {canLink ? __('Another site imports the set from it.', 'easy-svg') : __('Switch on share links in the settings.', 'easy-svg')}
                          </RadioCard.ItemDescription>
                        </RadioCard.ItemContent>
                        <RadioCard.ItemIndicator />
                      </RadioCard.ItemControl>
                    </RadioCard.Item>
                  ) : null}
                </Flex>
              </RadioCard.Root>
              {'download' === exporting?.mode && exportTooBig ? (
                <Notice status="warning">
                  {sprintf(
                    // translators: %d: most icons one export takes.
                    __('One export takes at most %d icons.', 'easy-svg'),
                    exporter.exportMax
                  )}
                </Notice>
              ) : null}
              {'link' === exporting?.mode && !exporting?.url ? (
                <FormField label={__('Valid for', 'easy-svg')} htmlFor="esw-link-hours">
                  <PickOne
                    label={__('Valid for', 'easy-svg')}
                    value={exporting.hours}
                    onChange={(v) => setExporting((x) => (x ? { ...x, hours: v } : x))}
                    items={[
                      { value: '1', label: __('1 hour', 'easy-svg') },
                      { value: '24', label: __('24 hours', 'easy-svg') },
                      { value: '168', label: __('7 days', 'easy-svg') },
                    ]}
                  />
                </FormField>
              ) : null}
              {exporting?.url ? (
                <Clipboard.Root value={exporting.url} timeout={1500}>
                  <Clipboard.Label fontSize="ui.body" fontWeight="bold" color="ui.heading">{__('Your link', 'easy-svg')}</Clipboard.Label>
                  {/* Beside the field, not over it: the word ran across the link in every language longer than English. */}
                  <HStack mt="1.5" gap="2">
                    <Clipboard.Input asChild>
                      <Input data-share-url readOnly flex="1" minW="0" fontFamily="mono" fontSize="ui.sm" truncate />
                    </Clipboard.Input>
                    <Clipboard.Trigger asChild>
                      <IconButton data-share-copy variant="solid" colorPalette="brand" flexShrink={0} aria-label={__('Copy', 'easy-svg')}>
                        <Clipboard.Indicator copied={<LuCheck />}>
                          <CopyGlyph />
                        </Clipboard.Indicator>
                      </IconButton>
                    </Clipboard.Trigger>
                  </HStack>
                </Clipboard.Root>
              ) : null}
              {exporting?.error ? <Notice bad role="alert">{exporting.error}</Notice> : null}
            </Stack>
          </Dialog.Body>
          <Dialog.Footer gap="3" borderTopWidth="ui.hair" borderColor="ui.border" pt="4">
            <Dialog.ActionTrigger asChild>
              <Button variant="outline" size="sm">{exporting?.url ? __('Done', 'easy-svg') : __('Cancel', 'easy-svg')}</Button>
            </Dialog.ActionTrigger>
            {exporting?.url ? null : (
              <Button
                variant="solid"
                size="sm"
                disabled={busy || ('download' === exporting?.mode && exportTooBig) || !exportRefs.length}
                onClick={runExport}
              >
                {'link' === exporting?.mode ? __('Make the link', 'easy-svg') : __('Download', 'easy-svg')}
              </Button>
            )}
          </Dialog.Footer>
          </Hold>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

export function newSetRowView({ busy, createSet, creator, newSet, newSetInput, setNewSet }) {
  return newSet && creator ? (
    <Box
      as="form"
      data-new-set-row
      px="1"
      pb="2"
      onSubmit={(e) => {
        e.preventDefault()
        createSet()
      }}
    >
      <InputGroup
        startElement={
          <Box color="colorPalette.fg" css={{ '& svg': { width: '5', height: '5' } }}>
            <FolderGlyph />
          </Box>
        }
        endElement={
          <IconButton
            type="submit"
            size="xs"
            variant="solid"
            me="-1"
            disabled={busy || !newSet.name.trim()}
            aria-label={__('Create set', 'easy-svg')}
            title={__('Create set', 'easy-svg')}
          >
            <AddGlyph />
          </IconButton>
        }
      >
        <Input
          ref={newSetInput}
          h="12"
          fontSize="ui.body"
          maxLength={100}
          aria-label={__('Name of the new set', 'easy-svg')}
          placeholder={__('New set', 'easy-svg')}
          value={newSet.name}
          onChange={(e) => setNewSet({ name: e.target.value })}
          onKeyDown={(e) => {
            if ('Escape' === e.key) {
              e.preventDefault()
              e.stopPropagation()
              setNewSet(null)
            }
          }}
          // wp-admin's input padding is unlayered and beats InputGroup's.
          style={{ paddingInlineStart: '2.75rem', paddingInlineEnd: '3rem' }}
        />
      </InputGroup>
    </Box>
  ) : null
}

export function renameSetDialogView({ act, busy, renaming, setRenaming }) {
  return (
    <Dialog.Root open={!!renaming} onOpenChange={(e) => (e.open ? null : setRenaming(null))} placement="center" modal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content borderRadius="forge" bg="ui.surface" maxW="ui.narrow" mx="4">
          <Hold open={!!renaming}>
          <Dialog.Header>
            <Dialog.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">{__('Rename set', 'easy-svg')}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Input
              autoFocus
              maxLength={100}
              aria-label={__('Name', 'easy-svg')}
              onFocus={(e) => e.target.select()}
              value={renaming?.value || ''}
              onChange={(e) => setRenaming((x) => (x ? { ...x, value: e.target.value } : x))}
              onKeyDown={(e) => 'Enter' === e.key && document.getElementById('esw-rename-set-save')?.click()}
            />
          </Dialog.Body>
          <Dialog.Footer gap="3" borderTopWidth="ui.hair" borderColor="ui.border" pt="4">
            <Dialog.ActionTrigger asChild>
              <Button variant="outline">{__('Cancel', 'easy-svg')}</Button>
            </Dialog.ActionTrigger>
            <Button
              id="esw-rename-set-save"
              variant="solid"
              disabled={busy || !renaming?.value.trim()}
              onClick={async () => {
                const { collection, value } = renaming
                setRenaming(null)
                if (value.trim() !== (collection.label || collection.id)) {
                  await act(() => collection.provider.rename({ id: collection.id, label: value.trim(), collection }))
                }
              }}
            >
              {__('Save', 'easy-svg')}
            </Button>
          </Dialog.Footer>
          </Hold>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

export function deleteSetDialogView({ busy, deleting, setDeleting, setRailPick, trashCollection }) {
  return (
    <Dialog.Root open={!!deleting} onOpenChange={(e) => (e.open ? null : setDeleting(null))} role="alertdialog" placement="center" modal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content borderRadius="forge" bg="ui.surface" maxW="ui.narrow" mx="4">
          <Hold open={!!deleting}>
          <Dialog.Header pb="2">
            <Dialog.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">
              {deleting?.many
                ? sprintf(
                    // translators: %d: number of sets to move to the trash.
                    _n('Move %d set to the trash?', 'Move %d sets to the trash?', deleting.many.length, 'easy-svg'),
                    deleting.many.length
                  )
                : sprintf(
                    // translators: %s: name of the set.
                    __('Move set “%s” to the trash?', 'easy-svg'),
                    deleting?.label || deleting?.id || ''
                  )}
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body pt="0" pb="6">
            <Dialog.Description fontSize="ui.body" color="ui.muted">
              {_n(
                'Pages that call its icons show nothing until the set is back from the trash.',
                'Pages that call their icons show nothing until the sets are back from the trash.',
                deleting?.many ? deleting.many.length : 1,
                'easy-svg'
              )}
            </Dialog.Description>
          </Dialog.Body>
          <Dialog.Footer gap="3" borderTopWidth="ui.hair" borderColor="ui.border" pt="4">
            <Dialog.ActionTrigger asChild>
              <Button variant="outline">{__('Cancel', 'easy-svg')}</Button>
            </Dialog.ActionTrigger>
            <Button
              variant="solid"
              colorPalette="red"
              disabled={busy}
              onClick={() => {
                const c = deleting
                setDeleting(null)
                if (c?.many) {
                  setRailPick(new Set())
                  c.many.reduce((done, one) => done.then(() => trashCollection(one)), Promise.resolve())
                } else {
                  trashCollection(c)
                }
              }}
            >
              <TrashGlyph />
              {__('Move to trash', 'easy-svg')}
            </Button>
          </Dialog.Footer>
          </Hold>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

// Chakra's own "file upload in a dialog", as its docs build it.
export function importSetDialogView({
  busy, creator, importing, reloadCollections, setBusy, setImporting, setMoved, setView,
}) {
  return (
    <Dialog.Root
      size="sm"
      placement="center"
      open={!!importing}
      onOpenChange={(e) => (e.open ? null : setImporting(null))}
      initialFocusEl={() => document.querySelector('[data-import-dialog]')}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content data-import-dialog borderRadius="forge" bg="ui.surface" _focusVisible={{ outline: 'none' }}>
          <Hold open={!!importing}>
          <Dialog.Header>
            <Dialog.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">{__('Import a set', 'easy-svg')}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body pb="6">
            <Tabs.Root
              value={importing?.mode || 'file'}
              onValueChange={(e) => setImporting((x) => (x ? { ...x, mode: e.value, error: '' } : x))}
            >
              <Tabs.List>
                <Tabs.Trigger value="file">
                  <LuFileArchive />
                  {__('File', 'easy-svg')}
                </Tabs.Trigger>
                <Tabs.Trigger value="link">
                  <LuLink />
                  {__('Link', 'easy-svg')}
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="file">
                <FileUpload.Root
                  accept=".zip,application/zip"
                  maxFiles={1}
                  alignItems="stretch"
                  onFileChange={(d) => setImporting((x) => (x ? { ...x, file: d.acceptedFiles[0] || null, error: '' } : x))}
                >
                  <FileUpload.HiddenInput />
                  <FileUpload.Dropzone width="full">
                    {/* A Box, not Icon: Icon hands its ref to the react-icons component, which takes none. */}
                    <Box color="ui.muted" aria-hidden="true" css={{ '& svg': { width: 'ui.glyphLg', height: 'ui.glyphLg' } }}>
                      <LuUpload />
                    </Box>
                    <FileUpload.DropzoneContent>{__('Drop a ZIP here or click', 'easy-svg')}</FileUpload.DropzoneContent>
                  </FileUpload.Dropzone>
                  <FileUpload.Context>
                    {({ acceptedFiles }) =>
                      acceptedFiles.length ? (
                        <FileUpload.ItemGroup>
                          {acceptedFiles.map((file) => (
                            <FileUpload.Item key={file.name} file={file}>
                              <Box color="ui.muted" aria-hidden="true" css={{ '& svg': { width: 'ui.glyphMd', height: 'ui.glyphMd' } }}>
                                <LuFileArchive />
                              </Box>
                              <FileUpload.ItemContent>
                                <FileUpload.ItemName />
                                <FileUpload.ItemSizeText />
                              </FileUpload.ItemContent>
                              <FileUpload.ItemDeleteTrigger asChild>
                                <IconButton variant="ghost" color="fg.muted" size="xs" aria-label={__('Remove', 'easy-svg')}>
                                  <LuX />
                                </IconButton>
                              </FileUpload.ItemDeleteTrigger>
                            </FileUpload.Item>
                          ))}
                        </FileUpload.ItemGroup>
                      ) : null
                    }
                  </FileUpload.Context>
                </FileUpload.Root>
              </Tabs.Content>
              <Tabs.Content value="link">
                <InputGroup startElement={<LuLink />}>
                  <Input
                    type="url"
                    aria-label={__('Link', 'easy-svg')}
                    placeholder="https://"
                    style={{ paddingInlineStart: '2.5rem' }}
                    value={importing?.url || ''}
                    onChange={(e) => setImporting((x) => (x ? { ...x, url: e.target.value } : x))}
                  />
                </InputGroup>
              </Tabs.Content>
            </Tabs.Root>
            {importing?.error ? (
              <Alert.Root status="error" mt="4">
                <Alert.Indicator />
                <Alert.Title>{importing.error}</Alert.Title>
              </Alert.Root>
            ) : null}
          </Dialog.Body>
          <Dialog.Footer gap="3" borderTopWidth="ui.hair" borderColor="ui.border" pt="4">
            <Dialog.ActionTrigger asChild>
              <Button variant="outline">{__('Cancel', 'easy-svg')}</Button>
            </Dialog.ActionTrigger>
            <Button
              disabled={busy || ('link' === importing?.mode ? !importing?.url.trim() : !importing?.file)}
              onClick={async () => {
                setBusy(true)
                try {
                  const byLink = 'link' === importing.mode
                  const done = await creator.importSet({ file: byLink ? null : importing.file, url: byLink ? importing.url.trim() : '' })
                  setImporting(null)
                  setMoved({ message: done?.message || __('Done.', 'easy-svg'), undo: null })
                  reloadCollections.current()
                  if (done?.id) {
                    setView(done.id)
                  }
                } catch (e) {
                  setImporting((x) => (x ? { ...x, error: e.message } : x))
                } finally {
                  setBusy(false)
                }
              }}
            >
              {__('Import', 'easy-svg')}
            </Button>
          </Dialog.Footer>
          <Dialog.CloseTrigger asChild>
            <CloseButton size="sm" css={{ '& svg': { width: '5', height: '5' } }} aria-label={__('Close', 'easy-svg')} />
          </Dialog.CloseTrigger>
          </Hold>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
