import {
  Badge,
  Button,
  Input,
  Box,
  Clipboard,
  DataList,
  CloseButton,
  Dialog,
  Editable,
  Flex,
  HStack,
  IconButton,
  InputGroup,
  Switch,
  Stack,
  Text,
} from '@chakra-ui/react'
import { OVERLAY_TOP } from '../../overlay-top.js'
import { LuCheck, LuEyeOff, LuPencil, LuX } from 'react-icons/lu'
import { __, sprintf } from '@wordpress/i18n'
import { LockGlyph, isLocked, lockedBy } from '../../origin.js'
import { sanitizeSvg, scopeSvgIds, CHECKER, callForms, nameOf, refOf, CopyGlyph, TrashGlyph } from './helpers.js'
import { libraryCopierOf } from './library-logic.js'
import { DetailRow, Hold, PickOne } from './widgets.jsx'

export function detailsDialogView({
  busy, closeDetails, copierOf, copyTargetsOf, copyTo, ctx, detailCover, detailIc, details, draftName,
  focusIfLost, giveBack, lastDetail, moveTo, openMove, railCache, remember, removeIcon, rename, setDetails,
  setDraftName, switchIcons, libraryTarget, targets,
}) {
  // Where the clipboard API is missing, the text still sits selectable in the field.
  const copyField = (key, fieldLabel, text, help) => (
    <DetailRow key={key} label={fieldLabel} htmlFor={`esw-copy-${key}`} help={help}>
      <Clipboard.Root value={text} timeout={1500} w="full">
        <InputGroup
          endElement={
            <Clipboard.Trigger asChild>
              <Button
                variant="ghost"
                size="sm"
                me="-2"
                minH="0"
                px="2"
                aria-label={
                  // translators: %s: what is copied, e.g. Shortcode.
                  sprintf(__('Copy %s', 'easy-svg'), fieldLabel)
                }
              >
                {/* A tick, not the word: a word does not fit and runs over the field. */}
                <Clipboard.Indicator copied={<LuCheck color="var(--chakra-colors-ui-good-ink)" />}>
                  <CopyGlyph />
                </Clipboard.Indicator>
              </Button>
            </Clipboard.Trigger>
          }
        >
          <Clipboard.Input asChild>
            <Input id={`esw-copy-${key}`} readOnly fontFamily="mono" fontSize="ui.body" pe="12" truncate />
          </Clipboard.Input>
        </InputGroup>
      </Clipboard.Root>
    </DetailRow>
  )
  return detailIc || lastDetail.current ? (() => {
    const ic = detailIc || lastDetail.current
    const name = nameOf(ic)
    const renamable = !(ic.readonly && !ic.canRename)
    const deletable = !(ic.readonly && !ic.canRemove)
    const where = ic.source ? ic.source.label || ic.source.id : __('Icon library', 'easy-svg')
    const elsewhere = [libraryTarget([ic]), ...targets].filter((c) => c && c.id !== ic.collection)
    const libraryCopy = !copierOf([ic]) && libraryCopierOf([ic])
    // A read-only source offers copies instead of the collection choice.
    const detailCopier = copierOf([ic])
    return (
      <Dialog.Root
        open={!!detailIc}
        onOpenChange={(e) => (e.open ? null : closeDetails())}
        onExitComplete={() => {
          lastDetail.current = null
        }}
        finalFocusEl={giveBack}
        // Rename and F2 open on the name, already in edit: the preview took
        // no focus while the dialog opened, and Close got it instead.
        initialFocusEl={() => document.querySelector('name' === details?.focus && renamable ? '#esw-detail-name-input' : '[data-icon-details]')}
        // Escape in the name field takes the name back and leaves the dialog
        // open; closing it first blurred the field, and the blur saved. The
        // dialog sees the key before the field does, so it cancels for it.
        onEscapeKeyDown={(e) => {
          const field = e.target?.closest?.('[data-scope=editable][data-part=input]')
          if (field) {
            e.preventDefault()
            field.closest('[data-scope=editable][data-part=root]')?.querySelector('[data-part=cancel-trigger]')?.click()
          }
        }}
        // The whole window on a phone, from its top; a tablet keeps the card.
        placement={{ base: 'top', md: 'center' }}
        size={{ base: 'full', md: 'lg' }}
        // Not portalled: the panel's type and tokens are scoped to its subtree.
        modal
      >
        <Dialog.Backdrop />
        <Dialog.Positioner top={{ base: OVERLAY_TOP, md: '0' }} bottom="0" h={{ base: 'auto', md: '100dvh' }} style={detailCover}>
          <Dialog.Content _focusVisible={{ outline: 'none' }} data-icon-details borderRadius={{ base: '0', md: 'forge' }} bg="ui.surface" maxW={{ base: 'full', md: 'ui.dialogLg' }} mx={{ base: '0', md: '4' }} minH={{ base: 'full', md: 'auto' }}>
            <Hold open={!!detailIc}>
            <Dialog.Header borderBottomWidth="ui.hair" borderColor="ui.border" py="4">
              <Dialog.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">
                {__('Icon details', 'easy-svg')}
                {ic.off ? (
                  <Badge ms="3" variant="subtle" colorPalette="red" size="md" verticalAlign="middle">
                    <LuEyeOff />
                    {__('Switched off', 'easy-svg')}
                  </Badge>
                ) : null}
                {ic.source?.origin && isLocked(ic.source) ? (
                  <Badge data-detail-locked ms="3" variant="subtle" colorPalette="red" size="md" verticalAlign="middle">
                    <LockGlyph />
                    {lockedBy(ic.source.origin)}
                  </Badge>
                ) : null}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild top="3" insetEnd="3">
              <CloseButton size="sm" minW={{ base: '11', md: '9' }} h={{ base: '11', md: '9' }} css={{ '& svg': { width: '5', height: '5' } }} aria-label={__('Close', 'easy-svg')} />
            </Dialog.CloseTrigger>
            <Dialog.Body py="5">
              <Flex direction={{ base: 'column', md: 'row' }} gap="6">
                <Stack w={{ base: 'full', md: 'ui.sideSm' }} flexShrink="0" gap="3">
                  <Flex
                    data-detail-preview
                    opacity={ic.off ? 0.5 : undefined}
                    aspectRatio="1"
                    align="center"
                    justify="center"
                    borderWidth="ui.hair"
                    borderColor="ui.border"
                    borderStyle="solid"
                    borderRadius="forge"
                    color="ui.heading"
                    {...CHECKER}
                  >
                    <Box
                      boxSize="55%"
                      aria-hidden="true"
                      overflow="hidden"
                      css={{ '& svg': { width: '100%', height: '100%' } }}
                      dangerouslySetInnerHTML={{ __html: scopeSvgIds(sanitizeSvg(ic.content), 'details') }}
                    />
                  </Flex>
                </Stack>

                {/* Labels over values on a phone, beside them from sm: the recipe's horizontal never sets row. */}
                <Stack flex="1" minW="0" gap="4">
                <DataList.Root orientation="horizontal" gap="4" w="full">
                  <DetailRow label={__('Icon name', 'easy-svg')} htmlFor="esw-detail-name">
                    {/* Saved on Enter or blur, as a media library file name is; Escape takes it back. */}
                    <Editable.Root
                      key={`${ic.id}:${details?.focus || ''}`}
                      ids={{ input: 'esw-detail-name-input' }}
                      defaultEdit={'name' === details?.focus && renamable}
                      value={draftName}
                      onValueChange={(e) => setDraftName(e.value)}
                      onValueCommit={(e) => {
                        const next = e.value.trim()
                        if (next && next !== name) {
                          rename(ic.id, next)
                        } else {
                          setDraftName(name)
                        }
                      }}
                      onValueRevert={() => setDraftName(name)}
                      disabled={!renamable || busy}
                      submitMode="both"
                      w="full"
                      minW="0"
                      gap="1"
                      position="relative"
                    >
                      {/* Same height, border and padding as the pencil's 44px, so clicking in moves neither text nor row. */}
                      <Editable.Preview
                        id="esw-detail-name"
                        title={draftName}
                        flex="1"
                        minW="0"
                        display="block"
                        overflow="hidden"
                        whiteSpace="nowrap"
                        textOverflow="ellipsis"
                        lineHeight="calc({sizes.11} - 2 * {borderWidths.ui.hair})"
                        h="11"
                        py="0"
                        px="3"
                        borderWidth="ui.hair"
                        borderColor="ui.border"
                        borderRadius="forge"
                        fontSize="ui.body"
                        color="ui.text"
                        _hover={{ borderColor: 'ui.primary', bg: 'transparent' }}
                      />
                      {/* mx 0: wp-admin's forms.css gives every text input a 1px side margin. */}
                      <Editable.Input
                        flex="1"
                        minW="0"
                        minH="11"
                        mx="0"
                        ps="3"
                        pe="24"
                        borderWidth="ui.hair"
                        borderRadius="forge"
                        fontSize="ui.body"
                        aria-label={__('Name', 'easy-svg')}
                        borderColor="colorPalette.solid"
                        _focusVisible={{ outline: 'none', boxShadow: '0 0 0 {borderWidths.ui.heavy} {colors.ui.ring}' }}
                      />
                      {renamable ? (
                        // Save and cancel sit inside the field while it is open.
                        <Editable.Control css={{ '&:has([data-part=submit-trigger]:not([hidden]))': { position: 'absolute', insetEnd: '1.5', top: '50%', transform: 'translateY(-50%)' } }} gap="0.5">
                          <Editable.EditTrigger asChild>
                            <IconButton variant="ghost" size="sm" aria-label={__('Rename', 'easy-svg')}>
                              <LuPencil />
                            </IconButton>
                          </Editable.EditTrigger>
                          <Editable.CancelTrigger asChild>
                            <IconButton variant="ghost" size="xs" color="ui.muted" aria-label={__('Cancel', 'easy-svg')}>
                              <LuX />
                            </IconButton>
                          </Editable.CancelTrigger>
                          <Editable.SubmitTrigger asChild>
                            <IconButton variant="solid" size="xs" colorPalette="brand" aria-label={__('Save', 'easy-svg')}>
                              <LuCheck />
                            </IconButton>
                          </Editable.SubmitTrigger>
                        </Editable.Control>
                      ) : null}
                    </Editable.Root>
                  </DetailRow>

                  {copyField('address', __('Icon ID', 'easy-svg'), refOf(ic))}
                  {/* The shortcode here; PHP and the block call stay in the tile's Copy menu. */}
                  {callForms(ic, ctx.iconBlock)
                    .filter((f) => 'shortcode' === f.id)
                    .map((f) => copyField(f.id, f.label, f.text))}

                  {!ic.source || ic.canSwitch ? (
                    <DetailRow label={__('Active', 'easy-svg')}>
                      {/* Green when on: here it says the icon is live, not that a setting is set. */}
                      <Switch.Root checked={!ic.off} disabled={busy} onCheckedChange={(e) => switchIcons([ic], !e.checked)} pt="2" colorPalette="brand">
                        <Switch.HiddenInput aria-label={__('Active', 'easy-svg')} />
                        <Switch.Control _checked={{ bg: 'ui.good' }} />
                      </Switch.Root>
                    </DetailRow>
                  ) : null}
                  <DetailRow label={__('Collection', 'easy-svg')} htmlFor={elsewhere.length && !detailCopier ? 'esw-detail-collection' : undefined}>
                    {elsewhere.length && !detailCopier ? (
                      // Choosing another collection moves the icon there; a
                      // library icon is copied, the library keeps its own.
                      <PickOne
                        label={__('Collection', 'easy-svg')}
                        value={ic.collection || ''}
                        disabled={busy}
                        items={[
                          { value: ic.collection || '', label: where },
                          ...elsewhere.map((c) => ({
                            value: c.id,
                            label: c.label || c.id,
                            // Two sets of one name are told apart by their address.
                            hint: railCache.current.get(c)?.twin ? c.id : undefined,
                          })),
                        ]}
                        onChange={async (id) => {
                          const target = elsewhere.find((c) => c.id === id)
                          if (target) {
                            const slug = ic.slug
                            const fromSet = !!ic.source
                            await moveTo(target, [refOf(ic)])
                            // A set's icon went: the details follow it. A library
                            // icon was copied and is still here as it was.
                            // Into the library it gets a library id: the window closes with the tile.
                            if (fromSet && 'easy-svg' !== target.id) {
                              setDetails((d) => (d ? { ...d, follow: { set: target.id, slug } } : d))
                            }
                          }
                        }}
                      />
                    ) : (
                      <Text data-detail-where m="0" fontSize="ui.body" color="ui.text">{where}</Text>
                    )}
                  </DetailRow>
                </DataList.Root>
                {libraryCopy ? (
                  <HStack data-detail-copy mt="3" mb="4" ms={{ sm: 'calc({sizes.28} + {spacing.4})' }}>
                    <Button variant="plain" size="sm" px="0" h="auto" fontWeight="normal" color="ui.muted" textDecoration="underline" _hover={{ color: 'ui.primary' }} disabled={busy} onClick={() => { closeDetails(); copyTo(libraryCopy, 'easy-svg', [refOf(ic)]).then(focusIfLost) }}>
                      {__('Copy to library', 'easy-svg')}
                    </Button>
                  </HStack>
                ) : null}
                {detailCopier ? (
                  <HStack data-detail-copy gap="5" flexWrap="wrap" mt="3" mb="4" ms={{ sm: 'calc({sizes.28} + {spacing.4})' }}>
                    <Button variant="plain" size="sm" px="0" h="auto" fontWeight="normal" color="ui.muted" textDecoration="underline" _hover={{ color: 'ui.primary' }} disabled={busy} onClick={() => { closeDetails(); copyTo(detailCopier, 'easy-svg', [refOf(ic)]).then(focusIfLost) }}>
                      {__('Copy to library', 'easy-svg')}
                    </Button>
                    {copyTargetsOf(detailCopier).length ? (
                      <Button variant="plain" size="sm" px="0" h="auto" fontWeight="normal" color="ui.muted" textDecoration="underline" _hover={{ color: 'ui.primary' }} disabled={busy} onClick={() => { remember(); openMove([ic], detailCopier) }}>
                        {__('Copy to set', 'easy-svg')}
                      </Button>
                    ) : null}
                  </HStack>
                ) : null}
                </Stack>
              </Flex>
            </Dialog.Body>
            {/* A long German remove label and Close share no phone line: they wrap whole. */}
            <Dialog.Footer gap="3" flexWrap="wrap" borderTopWidth="ui.hair" borderColor="ui.border" pt="4" justifyContent="space-between">
              {deletable ? (
                <Button variant="outline" size="sm" flex={{ base: '1 1 auto', sm: 'none' }} colorPalette="red" disabled={busy} onClick={() => removeIcon(ic, true)}>
                  <TrashGlyph />
                  {ic.canRemove ? __('Remove from set', 'easy-svg') : __('Delete', 'easy-svg')}
                </Button>
              ) : (
                <span />
              )}
              <Dialog.ActionTrigger asChild>
                <Button variant="solid" size="sm" flex={{ base: '1 1 auto', sm: 'none' }}>{__('Close', 'easy-svg')}</Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
            </Hold>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    )
  })() : null
}
