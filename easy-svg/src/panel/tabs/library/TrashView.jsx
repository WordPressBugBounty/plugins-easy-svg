import { Button, Flex, SimpleGrid, Stack, Text, Heading } from '@chakra-ui/react'
import { __, _n, sprintf } from '@wordpress/i18n'
import { SkeletonRows, EmptyState as Nothing } from '../../../ui.jsx'
import { Notice } from '../../parts.jsx'
import { IconTile } from './IconTile.jsx'
import { TrashRow } from './Trash.jsx'
import { whenTrashed, GRID_COLUMNS } from './helpers.js'

export function trashHeadView({ ctx }) {
  const trashEmptied =
    ctx.trashDays > 0
      ? sprintf(
          // translators: %d: number of days after which WordPress empties the trash.
          _n('The trash is emptied after %d day.', 'The trash is emptied after %d days.', ctx.trashDays, 'easy-svg'),
          ctx.trashDays
        )
      : ''
  return (
    <Stack gap="1" minW="0">
      <Heading as="h2" data-trash-title tabIndex={-1} m="0" fontSize="ui.3xl" fontWeight="bold" color="ui.heading" _focusVisible={{ outline: 'none' }}>
        {__('Trash', 'easy-svg')}
      </Heading>
      {trashEmptied ? <Text data-trash-days m="0" fontSize="ui.body" color="ui.muted">{trashEmptied}</Text> : null}
    </Stack>
  )
}

// The grid's own tiles and the grid's own bar; a provider's entries follow as a list.
export function trashBodyView({
  askPurge, bins, busy, loadMoreTrash, loadTrash, markTrashRow, pickInTrash, reloadCollections, restoreEntry,
  restoreTrashed, selecting, tiles, trash, trashItems, trashMore, trashPicked, trashTotal,
}) {
  return (
    <Stack gap="6">
      {null === trash ? <SkeletonRows rows={2} /> : null}
      {trash?.error ? (
        <Notice bad role="alert" data-trash-failed title={__('The icons in the trash could not be loaded.', 'easy-svg')} retry={__('Try again', 'easy-svg')} onRetry={loadTrash}>
          {trash.error}
        </Notice>
      ) : null}
      {trashItems.length ? (
        <Stack as="section" data-trash-icons gap="3">
          {/* A heading only where another section follows: alone, the title above says it. */}
          {bins.some((bin) => bin.failed || bin.entries.length) ? (
            <Heading as="h3" m="0" fontSize="ui.xl" fontWeight="bold" color="ui.heading">{__('Icons', 'easy-svg')}</Heading>
          ) : null}
          <SimpleGrid ref={tiles.ref} templateColumns={GRID_COLUMNS} gap="3">
            {trashItems.map((ic) => (
              <IconTile
                key={ic.id}
                // Its own address: two icons in the trash may have had the same name.
                ic={{ ...ic, key: `trash/${ic.id}` }}
                busy={busy}
                selecting={selecting}
                picked={trashPicked.has(ic.id)}
                onPick={(on) => pickInTrash(ic.id, on)}
                trash={{
                  when: whenTrashed(ic.trashed),
                  onMenu: markTrashRow,
                  onRestore: () => restoreTrashed(ic),
                  onPurge: () => askPurge({ kind: 'icon', item: ic }),
                }}
              />
            ))}
          </SimpleGrid>
          {trash.total > trashItems.length ? (
            <Flex gap="3" rowGap="2" align="center" flexWrap="wrap">
              <Button data-trash-more size="md" variant="outline" bg="ui.surface" loading={trashMore} disabled={busy} onClick={loadMoreTrash}>
                {__('Load more', 'easy-svg')}
              </Button>
              <Text m="0" fontSize="ui.body" color="ui.muted" role="status">
                {sprintf(
                  // translators: 1: icons listed. 2: icons in the trash in all.
                  __('%1$d of %2$d icons in the trash are listed.', 'easy-svg'),
                  trashItems.length,
                  trash.total
                )}
              </Text>
            </Flex>
          ) : null}
        </Stack>
      ) : null}
      {bins.map((bin) =>
        bin.failed ? (
          <Notice key={bin.id} bad role="alert" data-trash-bin-failed={bin.id} title={bin.title} retry={__('Try again', 'easy-svg')} onRetry={() => reloadCollections.current()}>
            {__('This part of the trash could not be loaded.', 'easy-svg')}
          </Notice>
        ) : bin.entries.length ? (
          <Stack as="section" key={bin.id} data-trash-bin={bin.id} gap="3">
            <Heading as="h3" m="0" fontSize="ui.xl" fontWeight="bold" color="ui.heading">{bin.title}</Heading>
            <Stack as="ul" gap="0" m="0" p="0" listStyleType="none" bg="ui.surface" borderRadius="forge" borderWidth="ui.hair" borderColor="ui.border" overflow="hidden">
              {bin.entries.map((entry, i) => (
                <TrashRow
                  key={entry.id}
                  entry={entry}
                  first={0 === i}
                  busy={busy}
                  selecting={selecting}
                  picked={trashPicked.has(`${bin.id}:${entry.id}`)}
                  onPick={(on) => pickInTrash(`${bin.id}:${entry.id}`, on)}
                  onMenu={markTrashRow}
                  onRestore={() => restoreEntry(bin, entry)}
                  onPurge={() => askPurge({ kind: 'entry', bin, item: entry })}
                />
              ))}
            </Stack>
          </Stack>
        ) : null
      )}
      {trash && !trash.error && !trashTotal && !bins.some((bin) => bin.failed) ? <Nothing title={__('The trash is empty', 'easy-svg')} /> : null}
    </Stack>
  )
}
