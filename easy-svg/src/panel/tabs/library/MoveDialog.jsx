import {
  createListCollection,
  Badge,
  Button,
  Input,
  Box,
  CloseButton,
  Dialog,
  HStack,
  IconButton,
  InputGroup,
  Listbox,
  Stack,
  Text,
} from '@chakra-ui/react'
import { __, _n, _x, sprintf } from '@wordpress/i18n'
import { SearchField } from '../../../ui.jsx'
import { ROW_LINES, AddGlyph, FolderGlyph } from './helpers.js'
import { Hold } from './widgets.jsx'

export function moveDialogView({
  act, busy, confirmMove, copyTargetsOf, creator, giveBack, moveNaming, moveQuery, moveTarget, moving,
  recentSets, setMoveNaming, setMoveQuery, setMoveTarget, setMoving, targets,
}) {
  // Where a move or copy goes, chosen in a dialog: the way that needs no drag.
  const moveTerm = moveQuery.trim().toLowerCase()
  const moveList = moving
    ? (moving.copy ? copyTargetsOf(moving.copy) : targets).filter((c) => c.id !== moving.from && (!moveTerm || (c.label || c.id).toLowerCase().includes(moveTerm)))
    : []
  // The sets moved to last, first: what someone sorting icons reaches for again.
  const recentList = recentSets.map((id) => moveList.find((c) => c.id === id)).filter(Boolean)
  const restList = moveList.filter((c) => !recentList.includes(c))
  const moveEntries = createListCollection({
    items: [...recentList, ...restList],
    itemToValue: (c) => c.id,
    itemToString: (c) => c.label || c.id,
  })
  // The same rows as the side list: room, a count, the chosen one on a light ground with a navy edge.
  const moveItem = (c) => {
    const chosen = moveTarget === c.id
    return (
      <Listbox.Item
        key={c.id}
        item={c}
        minH="12"
        // The start padding holds the grip, so the glyph and name never move under it.
        ps="6"
        pe="4"
        gap="3"
        fontSize="ui.body"
        borderRadius="forge"
        cursor="pointer"
        color="ui.text"
        transition="background-color 0.15s ease, color 0.15s ease"
        {...(chosen
          ? { bg: 'ui.menuHover', color: 'ui.heading', fontWeight: 'bold', _hover: { bg: 'ui.menuHover' }, _highlighted: { bg: 'ui.menuHover' }, _selected: { bg: 'ui.menuHover', color: 'ui.heading' } }
          : { _hover: { bg: 'ui.ghostHover' }, _highlighted: { bg: 'ui.ghostHover' } })}
      >
        <Box as="span" color="colorPalette.fg" flexShrink="0" css={{ '& svg': { width: '5', height: '5' } }}>
          <FolderGlyph />
        </Box>
        <Listbox.ItemText flex="1" minW="0" truncate>
          {c.label || c.id}
        </Listbox.ItemText>
        <Badge
          flexShrink="0"
          variant="outline"
          colorPalette="brand"
        >
          {c.icons.length}
        </Badge>
      </Listbox.Item>
    )
  }
  return (
    <Dialog.Root open={!!moving} onOpenChange={(e) => (e.open ? null : setMoving(null))} finalFocusEl={giveBack} placement="center" modal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content data-move-dialog borderRadius="forge" bg="ui.surface" maxW="ui.dialogMd" w="full" mx="4">
          <Hold open={!!moving}>
          <Dialog.Header flexDirection="column" alignItems="flex-start" gap="1" pb="2" css={{ "& > p": { marginTop: 0 } }}>
            <Dialog.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">
              {moving?.copy ? __('Copy to a set', 'easy-svg') : __('Move to a set', 'easy-svg')}
            </Dialog.Title>
            <Text fontSize="ui.body" color="ui.muted">
              {sprintf(
                // translators: %d: number of icons selected.
                _n('%d icon selected', '%d icons selected', moving?.refs.length || 0, 'easy-svg'),
                moving?.refs.length || 0
              )}
            </Text>
          </Dialog.Header>
          <Dialog.CloseTrigger asChild top="3" insetEnd="3">
            <CloseButton size="sm" css={{ '& svg': { width: '5', height: '5' } }} aria-label={__('Close', 'easy-svg')} />
          </Dialog.CloseTrigger>
          <Dialog.Body pt="2">
            <Stack gap="4">
              {moving?.copy ? <Text data-copy-note m="0" fontSize="ui.body" color="ui.muted">{__('Pages keep using the original.', 'easy-svg')}</Text> : null}
              <SearchField
                id="esw-move-search"
                label={__('Search sets', 'easy-svg')}
                placeholder={__('Search sets', 'easy-svg')}
                value={moveQuery}
                onChange={(e) => setMoveQuery(e.target.value)}
                w="full"
              />
              <Listbox.Root collection={moveEntries} value={moveTarget ? [moveTarget] : []} onValueChange={(e) => setMoveTarget(e.value[0] || '')} variant="plain">
                <Listbox.Content maxH="80" overflowY="auto" gap="0" bg="transparent" p="0" borderWidth="0">
                  {recentList.length ? (
                    <Listbox.ItemGroup css={ROW_LINES}>
                      <Listbox.ItemGroupLabel fontSize="ui.sm" fontWeight="bold" color="ui.muted" px="4" pt="2" pb="1">
                        {__('Recently used', 'easy-svg')}
                      </Listbox.ItemGroupLabel>
                      {recentList.map(moveItem)}
                    </Listbox.ItemGroup>
                  ) : null}
                  {restList.length ? (
                    <Listbox.ItemGroup css={ROW_LINES}>
                      <Listbox.ItemGroupLabel fontSize="ui.sm" fontWeight="bold" color="ui.muted" px="4" pt="2" pb="1" mt={recentList.length ? '4' : '0'}>
                        {__('All sets', 'easy-svg')}
                      </Listbox.ItemGroupLabel>
                      {restList.map(moveItem)}
                    </Listbox.ItemGroup>
                  ) : null}
                </Listbox.Content>
              </Listbox.Root>
              {null !== moveNaming && creator ? (
                // A new row at the foot of the list: its folder, its name, and
                // a plus to make it, the way the side list adds a set.
                <Box
                  as="form"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const name = moveNaming.trim()
                    if (!name) {
                      return
                    }
                    const made = await act(() => creator.create({ label: name }))
                    setMoveNaming(null)
                    if (made?.id) {
                      setMoveTarget(made.id)
                    }
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
                        disabled={busy || !moveNaming.trim()}
                        aria-label={__('Create', 'easy-svg')}
                        title={__('Create', 'easy-svg')}
                      >
                        <AddGlyph />
                      </IconButton>
                    }
                  >
                    <Input
                      h="12"
                      fontSize="ui.body"
                      autoFocus
                      maxLength={100}
                      aria-label={__('Name of the new set', 'easy-svg')}
                      placeholder={__('New set', 'easy-svg')}
                      value={moveNaming}
                      onChange={(e) => setMoveNaming(e.target.value)}
                      // wp-admin's input padding is unlayered and beats InputGroup's.
                      style={{ paddingInlineStart: '2.75rem', paddingInlineEnd: '3rem' }}
                    />
                  </InputGroup>
                </Box>
              ) : null}
            </Stack>
          </Dialog.Body>
          <Dialog.Footer gap="3" borderTopWidth="ui.hair" borderColor="ui.border" pt="4" justifyContent="space-between" flexWrap="wrap">
            {creator && null === moveNaming ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setMoveNaming('')}>
                <AddGlyph />
                {__('New set', 'easy-svg')}
              </Button>
            ) : (
              <span />
            )}
            <HStack gap="2">
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">{__('Cancel', 'easy-svg')}</Button>
              </Dialog.ActionTrigger>
              <Button variant="solid" size="sm" disabled={busy || !(moving?.copy ? copyTargetsOf(moving.copy) : targets).some((c) => c.id === moveTarget)} onClick={confirmMove}>
                {moving?.copy ? _x('Copy', 'make a copy of the icon', 'easy-svg') : __('Move', 'easy-svg')}
              </Button>
            </HStack>
          </Dialog.Footer>
          </Hold>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
