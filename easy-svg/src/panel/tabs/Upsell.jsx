import { Stack, HStack, Text, Box, Button, Heading, SimpleGrid } from '@chakra-ui/react'
import { __ } from '@wordpress/i18n'
import { LuCheck } from 'react-icons/lu'
import { Card, GroupTitle } from '../../ui.jsx'
import { ProPerks } from '../parts.jsx'
import appIcon from '../../brand/easy-svg-icon.png?inline'
import libraryPreview from '../../brand/library-preview.webp?inline'
import { utmUrl } from '../utm.js'

// What Pro has, in the groups and words of Pro's own Features tab
// (easy-svg-pro includes/core/features.php). A feature Pro does not ship is
// not listed: this page sells what the buyer then finds there.
const GROUPS = [
  {
    id: 'icons',
    label: __('Icons and sets', 'easy-svg'),
    features: [
      [__('Collections', 'easy-svg'), __('Your own icon sets, from themes and folders too.', 'easy-svg')],
      [__('Templates', 'easy-svg'), __('Ready-made sets and your Font Awesome.', 'easy-svg')],
      [__('Share links', 'easy-svg'), __('Send a set by secret link.', 'easy-svg')],
      [__('Bulk editing', 'easy-svg'), __('Rename, copy and move many.', 'easy-svg')],
    ],
  },
  {
    id: 'security',
    label: __('Security', 'easy-svg'),
    features: [
      [__('Tags and attributes', 'easy-svg'), __('Choose which SVG tags are allowed.', 'easy-svg')],
    ],
  },
  {
    id: 'insert',
    label: __('Insert and style', 'easy-svg'),
    features: [
      [__('Quick insert', 'easy-svg'), __('Insert icons with Shift+Alt+I (Ctrl+Option+I on a Mac).', 'easy-svg')],
      [__('Block theme support', 'easy-svg'), __('Icons from fields and patterns.', 'easy-svg')],
    ],
  },
  {
    id: 'integrations',
    label: __('Integrations', 'easy-svg'),
    features: [
      [__('ACF icon picker', 'easy-svg'), __('Icon tab in the ACF picker.', 'easy-svg')],
      [__('Lazy Blocks icon control', 'easy-svg'), __('Icon control for Lazy Blocks.', 'easy-svg')],
      [__('Elementor icon picker', 'easy-svg'), __('Icon tab in Elementor.', 'easy-svg')],
      [__('Meta Box icon field', 'easy-svg'), __('Icon field type for Meta Box.', 'easy-svg')],
      [__('WPBakery icon element', 'easy-svg'), __('Icon element for WPBakery.', 'easy-svg')],
      [__('Impreza icon field', 'easy-svg'), __('Icon sets in Impreza.', 'easy-svg')],
      [__('Avada icon picker', 'easy-svg'), __('Icon sets in Avada.', 'easy-svg')],
      [__('Timber / Twig', 'easy-svg'), __('Icons in Twig templates.', 'easy-svg')],
    ],
  },
  {
    id: 'developers',
    label: __('For developers', 'easy-svg'),
    features: [
      [__('WP-CLI', 'easy-svg'), __('Icon commands for bulk and CI.', 'easy-svg')],
      [__('AI agent abilities', 'easy-svg'), __('Let an AI agent run Easy SVG.', 'easy-svg')],
      [__('PHP-only block icon field', 'easy-svg'), __('Needs WordPress 7.0.', 'easy-svg')],
    ],
  },
]


export default function Upsell({ ctx, onActivate }) {
  // Pro installed but unlicensed: the key goes in the Licence tab, not the shop.
  const canActivate = 'function' === typeof onActivate
  // The address is PHP's (the easy_svg_pro_url filter), never one of ours.
  const shop = utmUrl(ctx?.proUrl || '', 'upsell', 'buy')
  // The Icons welcome's yellow call to action, so both pages sell the same way.
  const cta = { size: 'xl', h: '11', px: '10', minW: { md: 'ui.heroCta' }, bg: 'ui.accent', color: 'ui.heading', fontSize: 'ui.xl', fontWeight: 'medium', gap: '3', _hover: { bg: 'ui.accentHover' } }
  return (
    // The Icons welcome's layout: words and the way in on the left, the product on the right, the strip below.
    <Stack gap="8" data-pro-page pb={{ base: '4', md: '10' }} px={{ base: '0', md: '6' }}>
      <SimpleGrid data-pro-header columns={{ base: 1, lg: 2 }} gap="12" alignItems="center">
        <Stack gap="6" align="start">
          <HStack gap="3">
            <Box as="img" src={appIcon} alt="" w="8" h="8" borderRadius="lg" data-pro-logo />
            <Text as="span" fontSize="ui.sm" fontWeight="medium" letterSpacing=".08em" color="ui.muted" textTransform="uppercase">
              {__('Easy SVG Pro', 'easy-svg')}
            </Text>
          </HStack>
          <Stack gap="4">
            <Heading as="h2" m="0" fontSize={{ base: 'ui.6xl', md: 'ui.7xl' }} fontWeight="bold" lineHeight="ui.tight" color="ui.heading">
              {__('What Pro can do', 'easy-svg')}
            </Heading>
            <Text as="span" display="block" fontSize="ui.2xl" lineHeight="ui.body" color="ui.muted">
              {__('Pro adds collections, templates, page builder integrations and updates.', 'easy-svg')}
            </Text>
          </Stack>
          {canActivate ? (
            <Button {...cta} onClick={() => onActivate()}>
              {__('Activate license', 'easy-svg')}
            </Button>
          ) : shop ? (
            <Button {...cta} asChild>
              <a href={shop} target="_blank" rel="noopener noreferrer" data-pro-buy>
                {__('Get Easy SVG Pro', 'easy-svg')}
              </a>
            </Button>
          ) : null}
        </Stack>
        <Box as="img" src={libraryPreview} alt="" w="full" h="auto" display="block" />
      </SimpleGrid>
      <Box bg="ui.surface" borderRadius="xl" boxShadow="ui.raised" overflow="hidden">
        <ProPerks />
      </Box>
      {GROUPS.map((g) => (
        <Stack key={g.id} as="section" gap="3" aria-labelledby={`esw-pro-${g.id}`}>
          <GroupTitle id={`esw-pro-${g.id}`}>{g.label}</GroupTitle>
          <Card>
            <SimpleGrid as="ul" columns={{ base: 1, md: 2 }} columnGap="8" rowGap="5" listStyleType="none" m="0" p="0">
              {g.features.map(([label, description]) => (
                <HStack as="li" key={label} gap="3" align="start" m="0">
                  <Box color="ui.goodInk" pt="0.5" flexShrink="0" aria-hidden="true" css={{ '& svg': { width: '5', height: '5' } }}>
                    <LuCheck />
                  </Box>
                  <Box>
                    <Text as="span" display="block" textStyle="fieldLabel">{label}</Text>
                    <Text as="span" display="block" textStyle="description" mt="0.5">{description}</Text>
                  </Box>
                </HStack>
              ))}
            </SimpleGrid>
          </Card>
        </Stack>
      ))}
    </Stack>
  )
}
