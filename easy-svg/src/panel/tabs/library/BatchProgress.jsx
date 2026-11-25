import { Progress, HStack, Stack, Text, Spinner } from '@chakra-ui/react'
import { __, sprintf } from '@wordpress/i18n'

// Thousands of icons take minutes: the batch says how far it is, and that leaving would stop it.
export function BatchProgress({ work }) {
  if (!work) {
    return null
  }
  const lines = {
    // translators: 1: icons done so far, 2: all icons.
    move: __('Moving %1$d of %2$d icons', 'easy-svg'),
    // translators: 1: icons done so far, 2: all icons.
    copy: __('Copying %1$d of %2$d icons', 'easy-svg'),
    // translators: 1: icons done so far, 2: all icons.
    remove: __('Removing %1$d of %2$d icons', 'easy-svg'),
  }
  return (
    <Stack data-batch-progress role="status" aria-live="polite" position="fixed" bottom="6" insetEnd="6" zIndex="toast" w="ui.narrow" maxW="calc(100vw - 2rem)" gap="3" p="5" bg="ui.surface" borderWidth="ui.hair" borderColor="ui.border" borderRadius="forge" boxShadow="ui.raisedHover">
      <HStack gap="3">
        <Spinner size="sm" color="ui.primary" flexShrink="0" />
        <Text m="0" fontSize="ui.body" fontWeight="bold" color="ui.heading">
          {sprintf(lines[work.verb], work.done, work.total)}
        </Text>
      </HStack>
      <Progress.Root w="full" size="sm" striped animated value={Math.round((work.done / work.total) * 100)}>
        <Progress.Track borderRadius="full">
          <Progress.Range borderRadius="full" bgColor="ui.primary" transition="width 0.3s ease" />
        </Progress.Track>
      </Progress.Root>
      <Text m="0" fontSize="ui.md" color="ui.muted">{__('Please wait and keep this page open.', 'easy-svg')}</Text>
    </Stack>
  )
}
