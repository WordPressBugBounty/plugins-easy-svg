import { useState } from 'react'
import {
  Button,
  Box,
  Flex,
  HStack,
  SimpleGrid,
  Stack,
  Text,
  Heading,
  Link,
} from '@chakra-ui/react'
import { LuPower } from 'react-icons/lu'
import { __ } from '@wordpress/i18n'
import { Notice, ProPerks } from '../../parts.jsx'
import { makeApi } from '../../api.js'
import libraryPreview from '../../../brand/library-preview.webp?inline'
import { utmUrl } from '../../utm.js'

// The way in when the library is off: one click switches it on, here.
export function LibraryOff({ ctx }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState('')
  const on = async () => {
    setBusy(true)
    setFailed('')
    try {
      const resp = await makeApi(ctx).post('/settings', { icons: true })
      // Loaded fresh, so the block and the icon tools the server now loads are here.
      if (resp?.icons) window.location.reload()
      else setFailed(__('The icon library could not be switched on. Try it under the Settings tab.', 'easy-svg'))
    } catch {
      setFailed(__('The icon library could not be switched on. Try it under the Settings tab.', 'easy-svg'))
    } finally {
      setBusy(false)
    }
  }
  // Off is where most sites start: they came for SVG uploads. So this page
  // shows what the icon manager is, with one yellow button and three steps.
  // A site with Pro bought it already: no sales words, only the way to switch on.
  if (ctx.proActive) {
    return (
      <Stack data-library-off gap="5" align="start" pt="0" pb={{ base: '4', md: '10' }} px={{ base: '0', md: '6' }}>
        <Heading as="h2" m="0" fontSize={{ base: 'ui.3xl', md: 'ui.4xl' }} fontWeight="bold" color="ui.heading">
          {__('Icon manager', 'easy-svg')}
        </Heading>
        <Text m="0" fontSize="ui.lg" color="ui.muted">
          {__('Shows your icons and the Icon block.', 'easy-svg')}
        </Text>
        <Button size="xl" h="11" px="10" bg="ui.accent" color="ui.heading" fontSize="ui.xl" fontWeight="medium" gap="3" _hover={{ bg: 'ui.accentHover' }} onClick={on} loading={busy}>
          <LuPower />
          {__('Switch on the icon manager', 'easy-svg')}
        </Button>
        {failed ? <Notice bad role="alert">{failed}</Notice> : null}
      </Stack>
    )
  }
  const steps = [
    [__('Switch it on', 'easy-svg'), __('One click, free.', 'easy-svg')],
    [__('Upload SVGs', 'easy-svg'), __('Drop SVG files into the library.', 'easy-svg')],
    [__('Use icons', 'easy-svg'), __('In posts, pages and page builders.', 'easy-svg')],
  ]
  return (
    <Stack data-library-off gap="8" pt="0" pb={{ base: '4', md: '10' }} px={{ base: '0', md: '6' }}>
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap="12" alignItems="center">
        <Stack gap="6" align="start">
          <Text m="0" fontSize="ui.sm" fontWeight="medium" letterSpacing=".08em" color="ui.muted" textTransform="uppercase">
            {__('Icon manager', 'easy-svg')}
          </Text>
          <Stack gap="4">
            <Heading as="h2" m="0" fontSize={{ base: 'ui.6xl', md: 'ui.7xl' }} fontWeight="bold" lineHeight="ui.tight" color="ui.heading">
              {__('Icons for WordPress, in one place', 'easy-svg')}
            </Heading>
            <Text m="0" fontSize="ui.2xl" lineHeight="ui.body" color="ui.muted">
              {__('Upload once, use on every page.', 'easy-svg')}
            </Text>
          </Stack>
          <Button size="xl" h="11" px="10" minW={{ md: 'ui.heroCta' }} bg="ui.accent" color="ui.heading" fontSize="ui.xl" fontWeight="medium" gap="3" _hover={{ bg: 'ui.accentHover' }} onClick={on} loading={busy}>
            <LuPower />
            {__('Switch on the icon manager', 'easy-svg')}
          </Button>
          {failed ? <Notice bad role="alert">{failed}</Notice> : null}
        </Stack>
        <Box as="img" src={libraryPreview} alt="" w="full" h="auto" display="block" />
      </SimpleGrid>
      {ctx.proLicensed ? null : (
        // What Pro adds on top, for a site that has Free only or Pro not yet
        // activated: the button leads to buying, or to the licence tab.
        <Box bg="ui.surface" borderRadius="xl" boxShadow="ui.raised" overflow="hidden">
          <ProPerks />
          {/* The footer: what Pro is in one line, the way in on the right. */}
          <Flex direction={{ base: 'column', md: 'row' }} align={{ md: 'center' }} gap="4" px={{ base: '6', md: '8' }} py="4" bg="ui.sunk" borderTopWidth="ui.hair" borderColor="ui.border">
            <Box alignSelf={{ base: 'start', md: 'center' }} bg="ui.accent" color="ui.heading" fontSize="ui.2xs" fontWeight="bold" letterSpacing=".06em" textTransform="uppercase" whiteSpace="nowrap" px="2" py="0.5" borderRadius="forge">{__('Easy SVG Pro', 'easy-svg')}</Box>
            <Text m="0" flex="1" fontSize="ui.lg" fontWeight="medium" color="ui.heading">{__('For developers and agencies.', 'easy-svg')}</Text>
            <HStack gap="5">
              {/* The benefits are Free's own Pro page; the shop is PHP's address, or that page again. */}
              <Link href={`${window.location.pathname}?page=easy-svg-icons&tab=upsell`} onClick={(e) => { e.preventDefault(); ctx.goTo('upsell') }} fontSize="ui.lg" fontWeight="medium" color="ui.primary" textDecoration="none" _hover={{ textDecoration: 'underline' }}>{__('See all benefits', 'easy-svg')}</Link>
              {ctx.proActive && !ctx.canLicence ? (
                // A site admin on a network cannot open the licence tab.
                <Text data-ask-admin m="0" fontSize="ui.lg" color="ui.muted">{__('Ask your network administrator.', 'easy-svg')}</Text>
              ) : (
                <Button bg="ui.primary" color="brand.contrast" _hover={{ bg: 'ui.primaryHover' }} onClick={() => (ctx.proActive ? window.location.assign(`${window.location.pathname}?page=easy-svg-icons&tab=licence`) : ctx.proUrl ? window.open(utmUrl(ctx.proUrl, 'library-off', 'buy'), '_blank', 'noopener') : ctx.goTo('upsell'))}>
                  {ctx.proActive ? __('Activate Pro', 'easy-svg') : __('Get Pro', 'easy-svg')}
                </Button>
              )}
            </HStack>
          </Flex>
        </Box>
      )}
      <Stack gap="6" pt="8" borderTopWidth="ui.hair" borderColor="ui.border">
        <Heading as="h3" m="0" fontSize="ui.3xl" fontWeight="bold" color="ui.heading">
          {__('How it works', 'easy-svg')}
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap="8">
          {steps.map(([title, text], i) => (
            <HStack key={title} gap="4" align="start" borderStartWidth={{ md: i ? 'ui.hair' : '0' }} borderColor="ui.border" ps={{ md: i ? '8' : '0' }}>
              <Flex w="11" h="11" flexShrink="0" align="center" justify="center" borderRadius="full" bg="ui.primary" color="brand.contrast" fontWeight="bold">
                {i + 1}
              </Flex>
              <Stack gap="1">
                <Text m="0" fontSize="ui.body" fontWeight="bold" color="ui.heading">{title}</Text>
                <Text m="0" fontSize="ui.lg" color="ui.muted">{text}</Text>
              </Stack>
            </HStack>
          ))}
        </SimpleGrid>
      </Stack>
    </Stack>
  )
}
