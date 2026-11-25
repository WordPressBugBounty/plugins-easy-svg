import { Alert, Box, CloseButton, HStack, SimpleGrid, Stack, Text, Heading } from '@chakra-ui/react'
import { LuBlocks, LuBot, LuCircleCheck, LuCircleX, LuPackage, LuTerminal } from 'react-icons/lu'
import { __ } from '@wordpress/i18n'
import { Button, Card, ProBadge } from '../ui.jsx'

// The notice lives in the shared layer, so both plugins' tabs get the same Alert, status icon and colours.
export { Notice } from '../ui.jsx'

// The search field lives in the shared layer; both plugins' tabs use it.
export { SearchField } from '../ui.jsx'

// The verdict per file is the server's own sentence; role=status, as the batch finished elsewhere on screen.
export function ReportList({ summary, rows, onDismiss, dismissLabel }) {
  const failed = rows.filter((row) => !row.ok).length
  // Red when nothing landed, amber when some did, green when all did.
  const status = !failed ? 'success' : failed === rows.length ? 'error' : 'warning'
  return (
    <Alert.Root role="status" aria-live="polite" status={status} variant="surface" borderRadius="forge" alignItems="flex-start" px="5" py="4">
      <Alert.Indicator mt="0.5" />
      <Alert.Content gap="3" minW="0">
        <Alert.Title fontSize="ui.body" fontWeight="bold">{summary}</Alert.Title>
        {/* Bounded, so forty rows never push the thing reported on off the screen. */}
        <Stack as="ul" gap="0" listStyleType="none" m="0" maxH="ui.pickList" overflowY="auto" bg="ui.surface" borderRadius="forge" borderWidth="ui.hair" borderColor="ui.border">
          {rows.map((row, i) => (
            <HStack
              as="li"
              key={`${row.file}-${i}`}
              gap="3"
              px="4"
              py="2.5"
              m="0"
              fontSize="ui.body"
              borderTopWidth={i ? 'ui.hair' : '0'}
              borderColor="ui.border"
            >
              {/* Decoration: the sentence beside it carries the verdict. */}
              <Box as="span" aria-hidden="true" flexShrink="0" color={row.ok ? 'ui.goodInk' : 'ui.badInk'} css={{ '& svg': { width: '4.5', height: '4.5' } }}>
                {row.ok ? <LuCircleCheck /> : <LuCircleX />}
              </Box>
              <Text as="span" color="ui.heading" fontWeight="medium" truncate minW="0" flex="0 1 auto" maxW="45%">{row.file}</Text>
              <Text as="span" color="ui.muted" flex="1" minW="0">{row.message}</Text>
            </HStack>
          ))}
        </Stack>
      </Alert.Content>
      {onDismiss ? (
        <CloseButton size="sm" mt="-1" me="-2" onClick={onDismiss} aria-label={dismissLabel} css={{ '& svg': { width: '5', height: '5' } }} />
      ) : null}
    </Alert.Root>
  )
}

// A Pro tab a free or unlicensed site sees: the button goes to the licence field when Pro can take a key, else to the Pro page.
// A network site admin who may not open the licence tab is told whom to ask instead.
export function LockedTab({ tab, proActive, onActivate, onGetPro, askAdmin = false }) {
  const canActivate = proActive && 'function' === typeof onActivate
  const act = canActivate ? onActivate : onGetPro
  return (
    <Card maxW="ui.form">
      <Stack gap="4">
        <HStack gap="3" align="center">
          <Heading as="h2" textStyle="sectionTitle">{tab.label}</Heading>
          <ProBadge>{__('Pro', 'easy-svg')}</ProBadge>
        </HStack>
        <Text textStyle="description" maxW="52ch">{tab.teaser}</Text>
        {askAdmin ? (
          <Text data-locked-ask m="0" fontSize="ui.body" color="ui.text">{__('Ask your network administrator.', 'easy-svg')}</Text>
        ) : 'function' === typeof act ? (
          <Box pt="1">
            <Button variant="primary" data-locked-cta onClick={() => act()}>
              {canActivate ? __('Activate license', 'easy-svg') : __('Get Easy SVG Pro', 'easy-svg')}
            </Button>
          </Box>
        ) : null}
      </Stack>
    </Card>
  )
}

// The four things Pro is bought for: the strip on the Icons welcome and on the Pro page.
export function ProPerks() {
  const perks = [
    [LuBot, __('Works with AI assistants', 'easy-svg'), __('Run it from your AI assistant', 'easy-svg')],
    [LuPackage, __('Export and move', 'easy-svg'), __('Icons for many client projects', 'easy-svg')],
    [LuBlocks, __('Icon picker', 'easy-svg'), __('For PHP-only blocks', 'easy-svg')],
    [LuTerminal, __('For developers', 'easy-svg'), __('and agencies', 'easy-svg')],
  ]
  return (
    <SimpleGrid data-pro-perks columns={{ base: 1, sm: 2, xl: 4 }} gap="6" px={{ base: '6', md: '8' }} py="7">
      {perks.map(([Glyph, title, text]) => (
        <Stack key={title} gap="2.5">
          <Box color="ui.primary" css={{ '& svg': { width: 'ui.glyphLg', height: 'ui.glyphLg' } }} aria-hidden="true"><Glyph /></Box>
          <Text m="0" fontSize="ui.lg" fontWeight="bold" color="ui.heading">{title}</Text>
          <Text m="0" fontSize="ui.md" color="ui.muted">{text}</Text>
        </Stack>
      ))}
    </SimpleGrid>
  )
}
