import { useEffect, useRef, useState } from 'react'
import { Box, Button, CloseButton, Drawer, Flex, HStack, Heading, Portal, Stack, Text, Tabs } from '@chakra-ui/react'
import { __ } from '@wordpress/i18n'
import { LuBookOpen, LuCircleAlert, LuCircleUser, LuLifeBuoy, LuMenu, LuSparkles } from 'react-icons/lu'
import { getRegistry } from './registry.js'
import { media } from '../theme.js'
import { OVERLAY_TOP, useBarCover } from './overlay-top.js'
import Settings from './tabs/Settings.jsx'
import Library from './tabs/Library.jsx'
import Upsell from './tabs/Upsell.jsx'
import Support from './tabs/Support.jsx'
import { LockedTab } from './parts.jsx'
import ReviewStars from './ReviewStars.jsx'
import { ProBadge, useDropGuard } from '../ui.jsx'
import { TabIcon } from './icons.jsx'
import { markMenuPage } from './menu-current.js'
import { utmUrl } from './utm.js'
// An <img>, not inline: the file's own <style> and gradient ids would reach the whole page.
import productLogo from '../brand/easy-svg-logo.svg?inline'
import makerLogo from '../brand/unleashwp-logo.svg?inline'

// Every screen has controls of its own, so the panel is no tab stop (ARIA tabs pattern).
// On the node and watched: ark writes its own tabIndex over a prop, and again when the layout changes.
const noTabStop = (el) => {
  if (!el) return
  const fix = () => {
    if (el.tabIndex !== -1) el.tabIndex = -1
  }
  fix()
  new window.MutationObserver(fix).observe(el, { attributes: true, attributeFilter: ['tabindex'] })
}

// The XML prolog is legal in a file and illegal inside an inline <svg>.

// One page per WordPress menu entry, so the menu stays the only navigation; labels are ours so an add-on never translates them.
const PAGES = [
  { id: 'icons', label: __('Icons', 'easy-svg') },
  { id: 'templates', label: __('Templates', 'easy-svg') },
  { id: 'tools', label: __('Tools', 'easy-svg') },
  { id: 'settings', label: __('Settings', 'easy-svg') },
]
const PAGE_IDS = PAGES.map((p) => p.id)
// A tab nobody placed lands in the settings: reachable beats tidy.
const DEFAULT_PAGE = 'settings'

// Tab id to page; easy_svg_panel_page_of() in PHP keeps the same map, and old area ids and ?tab=bulk keep working.
const TAB_PAGE = {
  library: 'icons', sets: 'icons', bulk: 'icons',
  packs: 'templates', export: 'templates',
  support: 'tools',
  settings: 'settings', features: 'settings', configurator: 'settings', licence: 'settings', upsell: 'settings',
}
// The order of the tabs on their page, the first being what the page opens with.
// The screens that work with the icon manager switched off: uploads and the
// way back to switching it on.
const WITHOUT_ICONS = ['library', 'features', 'configurator', 'licence', 'support', 'settings', 'upsell']
const TAB_ORDER = ['library', 'sets', 'bulk', 'packs', 'export', 'support', 'settings', 'features', 'configurator', 'licence', 'upsell']
const tabRank = (t) => (TAB_ORDER.includes(t.id) ? TAB_ORDER.indexOf(t.id) * 10 : 1000 + (Number(t.order) || 0))
// The page ids are listed too: areaOf() runs twice on an add-on tab (extras, then the sort), so its own answer has to map to itself.
const AREA_PAGE = { icons: 'icons', design: 'icons', transfer: 'templates', templates: 'templates', inspect: 'tools', setup: 'tools', tools: 'tools', security: 'settings', settings: 'settings' }


// The set list's lines: inset, and none around the chosen row.
const RAIL_LINES = {
  '& > [role=tab] + [role=tab]::after': {
    content: '""',
    position: 'absolute',
    top: '0',
    insetInline: '3',
    height: '{borderWidths.ui.hair}',
    bg: 'ui.border',
    pointerEvents: 'none',
  },
  '& > [aria-selected=true]::after, & > [aria-selected=true] + [role=tab]::after': { display: 'none' },
}

function areaOf(tab) {
  if (TAB_PAGE[tab.id]) return TAB_PAGE[tab.id]
  if (AREA_PAGE[tab.area]) return AREA_PAGE[tab.area]
  // `group` is the level-1 name for this field and stays an alias.
  if (AREA_PAGE[tab.group]) return AREA_PAGE[tab.group]
  return DEFAULT_PAGE
}

// Free's own tabs, always functional. English msgids, domain 'easy-svg'; the
// German (and every other) locale ships as a JS translation file.
// `order` is within the area, not across the rail.
const FREE_TABS = [
  { id: 'library', icon: 'library', area: 'icons', order: 10, label: __('Icon library', 'easy-svg'), render: (ctx) => <Library ctx={ctx} /> },
  { id: 'support', icon: 'support', area: 'setup', order: 40, label: __('Support', 'easy-svg'), render: (ctx) => <Support ctx={ctx} /> },
  // Upload and the icon manager: the switches every site has.
  { id: 'settings', icon: 'features', area: 'settings', order: 10, label: __('General', 'easy-svg'), render: (ctx) => <Settings ctx={ctx} /> },
]

// The Pro catalogue. Free draws these as locked upsell tabs (features that
// are off by default, like the cleaner and the tag list, are not teased); when Pro is active
// AND licensed it registers real render()s for these ids through window.EasySvgPanel.
const PRO_TABS = [
  { id: 'sets', icon: 'sets', area: 'icons', order: 20, label: __('Icon sets', 'easy-svg'), teaser: __('Group your SVGs into sets and use them in the Icon block.', 'easy-svg') },
  { id: 'licence', icon: 'licence', area: 'setup', order: 20, label: __('License', 'easy-svg'), teaser: __('Enter your license key to switch on the Pro features.', 'easy-svg') },
]

const UPSELL_TAB = { id: 'upsell', icon: 'upsell', area: 'setup', order: 90, label: __('What Pro can do', 'easy-svg'), render: (ctx) => <Upsell ctx={ctx} onActivate={ctx.onActivate} /> }

// The menu entries are this screen with ?tab=, so an unknown id falls back to the default instead of an empty well.
function tabFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('tab') || ''
  } catch {
    return ''
  }
}

export default function App({ config }) {
  const [, force] = useState(0)
  // Below lg the page words and the screen rail fold into one drawer.
  const [menuOpen, setMenuOpen] = useState(false)
  // The drawer is portalled into the frame, not document.body: there it keeps
  // the panel's scoped tokens and the frame's --esw-admin-bar.
  const frameRef = useRef(null)
  // A long wp-admin menu makes the page taller than the window; the panel grows with it, so no band shows under its footer.
  const [menuH, setMenuH] = useState(0)
  useEffect(() => {
    const menu = document.getElementById('adminmenuwrap')
    if (!menu || 'function' !== typeof window.ResizeObserver) {
      return undefined
    }
    const measure = () => setMenuH(Math.ceil(menu.getBoundingClientRect().height))
    const watch = new window.ResizeObserver(measure)
    watch.observe(menu)
    measure()
    return () => watch.disconnect()
  }, [])
  // Focus goes back to the burger on close; Safari never focuses a clicked button.
  const burgerRef = useRef(null)
  const menuCover = useBarCover(menuOpen)
  const [active, setActive] = useState(tabFromUrl)
  // Live, not read once: Settings and the Library's own switch flip it without a reload.
  const [iconsEnabled, setIconsEnabled] = useState(!!config.iconsEnabled)
  // A file dropped next to a zone would open in the tab and take the panel with it.
  // The guard swallows those quietly: the whole icon area takes files, so a drop beside it needs no lecture.
  useDropGuard(() => {})

  useEffect(() => {
    const reg = getRegistry()
    if (!reg) return undefined
    const unsub = reg.subscribe(() => force((n) => n + 1))
    // Pro may have registered a tab between this component's first render and
    // this effect running; that notify had no listener yet and was lost. Read
    // the registry once more now so a registration caught in that race shows.
    force((n) => n + 1)
    return unsub
  }, [])

  const reg = getRegistry()
  // Who may open the licence tab: its capability from PHP, and Pro's own word on a network.
  const canLicence =
    (!config.caps || !!config.caps[config.tabCaps?.licence || 'manage_options']) &&
    false !== window.EasySvgProPanel?.canCheckLicence
  const ctx = {
    restRoot: config.restRoot,
    nonce: config.nonce,
    proActive: !!config.proActive,
    proLicensed: !!config.proLicensed,
    canManage: !config.caps || !!config.caps.manage_options,
    proUrl: config.proUrl || '',
    iconsEnabled,
    setIconsEnabled,
    goTo: setActive,
    iconBlock: !!config.iconBlock,
    // Off where the network's upload file types leave svg out. wp_localize_script sends false as "", and an older config none.
    svgUploads: undefined === config.svgUploads || !!config.svgUploads,
    // After how many days WordPress empties the trash; 0 on a site that keeps none.
    trashDays: Number(config.trashDays) || 0,
    // Set below, once we know Pro registered a licence tab to switch to.
    onActivate: undefined,
    canLicence,
    // Pro's count of sets kept after the licence ended; 0 from an older Pro.
    keptSets: Number(window.EasySvgProPanel?.keptSets) || 0,
    toolsLocked: window.EasySvgProPanel?.toolsLocked || '',
    accountUrl: window.EasySvgProPanel?.accountUrl || '',
  }

  // Pro tabs outside the catalogue show only when Pro is licensed; their order is kept, as ordering is within an area.
  const EXTRA_DEFAULT_ORDER = 50
  const knownIds = new Set([...FREE_TABS, ...PRO_TABS, UPSELL_TAB].map((t) => t.id))
  // Unlicensed, only a tab that says it works without a licence comes in:
  // Pro's Features tab, which then shows everything greyed out.
  const extras = (reg && config.proActive ? reg.list() : [])
    .filter((t) => !knownIds.has(t.id) && (config.proLicensed || t.unlicensed))
    .map((t) => {
      const asked = Number(t.order)
      // icon is a keyword this rail resolves, or the drawing itself, so an
      // extra tab can look like the rest, or bring a shape this plugin has
      // never heard of, without waiting for a release here.
      return {
        id: t.id,
        icon: t.icon,
        area: areaOf(t),
        label: t.label || t.id,
        blurb: t.blurb,
        order: Number.isFinite(asked) ? asked : EXTRA_DEFAULT_ORDER,
        locked: false,
        render: (c) => t.render(c),
      }
    })

  const listed = [
    ...FREE_TABS,
    // Licensed, show only what Pro registered: a feature switched off would otherwise come back as a locked placeholder.
    // Without Pro installed there is no licence to enter: Free only advertises,
    // in the Pro tab; the licence tab is Pro's.
    ...PRO_TABS.filter((t) => ('licence' !== t.id || config.proActive) && (!config.proLicensed || !reg || !!reg.get(t.id))).map((t) => {
      const got = reg && reg.get(t.id)
      // The licence tab must stay usable or no key could ever be entered; Pro's REST refuses the rest server-side anyway.
      const unlocked = got && (t.id === 'licence' || config.proLicensed)
      // Only offer "go to the licence tab" when there IS one to go to: Pro
      // registers it, so a Pro that is active but has not registered would
      // otherwise send the reader to another locked tab.
      const licenceReachable = canLicence && !!(reg && reg.get('licence'))
      ctx.onActivate = licenceReachable ? () => setActive('licence') : undefined
      return {
        ...t,
        // The add-on's own sentence for its tab, when it registered one.
        blurb: got?.blurb,
        // Pro marks a tab that needs attention, the licence before activation.
        alert: !!got?.alert,
        locked: !unlocked,
        render: unlocked
          ? (c) => got.render(c)
          : () => (
              <LockedTab
                tab={t}
                proActive={config.proActive}
                onActivate={licenceReachable ? () => setActive('licence') : undefined}
                askAdmin={config.proActive && !canLicence}
                onGetPro={config.proActive ? undefined : () => setActive('upsell')}
              />
            ),
      }
    }),
    ...extras,
    // Only Free on its own advertises Pro; with Pro installed its tabs speak for it.
    ...(config.proActive ? [] : [UPSELL_TAB]),
  ]
    // PHP decides what this user may see; no caps at all means an older page, not a user who may see nothing.
    .filter((t) => !config.caps || !!config.caps[config.tabCaps?.[t.id] || 'manage_options'])
    .map((t) => ({ ...t, area: areaOf(t) }))
    .sort((a, b) => PAGE_IDS.indexOf(a.area) - PAGE_IDS.indexOf(b.area) || tabRank(a) - tabRank(b))
  const tabs = listed.filter(
    (t) =>
      // The icon manager off: its tools leave the rail at once, no reload.
      (iconsEnabled || WITHOUT_ICONS.includes(t.id))
  )

  // An unknown ?tab= (a stale bookmark, a tab whose feature was switched off)
  // opens the first one instead of an empty well.
  const wanted = active
  const activeValue = tabs.some((t) => t.id === wanted) ? wanted : tabs[0]?.id
  const activeTab = tabs.find((t) => t.id === activeValue)
  const page = PAGES.find((p) => p.id === activeTab?.area) || PAGES[0]
  // The page's tabs only: the other pages are the other menu entries.
  // The add-on's Sets tab stays reachable by its address (drafts are edited
  // there), but has no trigger beside the library, which lists the sets.
  const hasLibrary = tabs.some((t) => 'library' === t.id)
  const samePage = tabs.filter((t) => t.area === page.id && !(hasLibrary && 'sets' === t.id && 'sets' !== activeValue))
  // Tools open in a side panel over the library, so there is one screen and their old addresses still land there.
  // Only on the page the library is on: Import and export keeps its screens.
  const toolTabs = samePage.some((t) => 'library' === t.id) ? samePage.filter((t) => 'library' !== t.id && 'sets' !== t.id) : []
  const tool = toolTabs.find((t) => t.id === activeValue)
  // Every page with its screens, for the drawer; Sets as on the desktop rail.
  const menuPages = PAGES.map((p) => ({ ...p, tabs: tabs.filter((t) => t.area === p.id && !(hasLibrary && 'sets' === t.id && 'sets' !== activeValue)) })).filter((p) => p.tabs.length)
  const shownValue = tool ? 'library' : activeValue
  const pageTabs = samePage.filter((t) => !toolTabs.includes(t))
  const ownRail = 'library' === shownValue
  ctx.tools = ownRail
    ? toolTabs.map((t) => ({ id: t.id, label: t.label, icon: <TabIcon icon={t.icon} />, render: t.render }))
    : []
  ctx.tool = tool ? tool.id : null

  // How much of the page is still below the window, 0 to 1, for the fade
  // over the footer: written onto it once a frame, no render per scroll.
  const footRef = useRef(null)
  useEffect(() => {
    let frame = 0
    const paint = () => {
      frame = 0
      const el = footRef.current
      if (el) {
        const below = document.documentElement.scrollHeight - window.innerHeight - window.scrollY
        el.style.setProperty('--esw-foot', String(Math.min(1, Math.max(0, below) / 48)))
      }
    }
    const later = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(paint)
      }
    }
    paint()
    window.addEventListener('scroll', later, { passive: true })
    window.addEventListener('resize', later)
    const watch = 'function' === typeof window.ResizeObserver ? new window.ResizeObserver(later) : null
    // The panel's own box: wp-admin keeps body as tall as the window.
    if (footRef.current?.parentElement) {
      watch?.observe(footRef.current.parentElement)
    }
    return () => {
      window.removeEventListener('scroll', later)
      window.removeEventListener('resize', later)
      watch?.disconnect()
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [])

  // replaceState keeps the menu highlight, back button and copied links right without making each tab a history entry.
  useEffect(() => {
    if (!activeValue) {
      return
    }
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.get('tab') === activeValue) {
        return
      }
      url.searchParams.set('tab', activeValue)
      window.history.replaceState({}, '', url)
    } catch {
      /* a blocked history is no reason to break the panel */
    }
  }, [activeValue])

  // The submenu links open each page's first tab, all of them in TAB_PAGE.
  useEffect(() => {
    markMenuPage(document, page.id, (id) => TAB_PAGE[id] || DEFAULT_PAGE)
  }, [page.id])

  // The page's own screens as rows in a side list, the same rows the icon
  // library uses for its sets: the chosen one in navy with white type. Decided
  // here, not by selectors, because Chakra's hover rule outweighs [data-selected].
  const triggers = pageTabs.map((t) => {
    const on = t.id === shownValue
    return (
    <Tabs.Trigger
      key={t.id}
      value={t.id}
      gap="3"
      w="full"
      justifyContent="flex-start"
      minH="12"
      px="4"
      borderRadius="forge"
      fontSize="ui.body"
      fontFamily="heading"
      fontWeight={on ? 'bold' : '400'}
      // The chosen screen is a light ground and bold type, no edge stripe; full navy is kept for primary buttons.
      color={on ? 'ui.heading' : t.locked ? 'ui.muted' : 'ui.text'}
      bg={on ? 'ui.menuHover' : 'transparent'}
      _hover={{ bg: on ? 'ui.menuHover' : 'ui.ghostHover', color: 'ui.heading' }}
      transition="background-color 0.15s ease, color 0.15s ease"
      css={{ '& svg': { width: '5', height: '5' } }}
    >
      <TabIcon icon={t.icon} />
      <Text as="span">{t.label}</Text>
      {t.locked ? <ProBadge>{__('Pro', 'easy-svg')}</ProBadge> : null}
      {t.alert ? (
        <Box as="span" ms="auto" color="ui.bad" display="inline-flex" role="img" aria-label={__('Needs attention', 'easy-svg')} css={{ '& svg': { width: '4.5', height: '4.5' } }}>
          <LuCircleAlert aria-hidden="true" />
        </Box>
      ) : null}
    </Tabs.Trigger>
    )
  })

  return (
    // Not overflow:hidden: that would make this box the scroll container and the sticky header would stop sticking.
    <Box
      ref={frameRef}
      data-panel-frame
      display="flex"
      flexDirection="column"
      minH="max(calc(100vh - var(--esw-admin-bar)), var(--esw-menu-h, 0px))"
      // wp-admin's bar scrolls away at 600px and below, so the sticky offset follows it.
      css={{
        '--esw-admin-bar': 'var(--wp-admin--admin-bar--height, 0px)',
        '--esw-menu-h': `${menuH}px`,
        [media.wpNarrow]: { '--esw-admin-bar': '0px', '--esw-menu-h': '0px' },
      }}
    >
      {/* A white bar of our own, naming the product only; the screen title belongs with the screen. */}
      <Flex
        borderBottomWidth="ui.hair"
        borderColor="ui.border"
        // 28px: the logo's left edge lines up with the icons of the rail below.
        px={{ base: '4', md: '7' }}
        h="ui.header"
        align="center"
        gap="3.5"
        // Sticky under wp-admin's bar, which is fixed on desktop. Its own
        // background, because the content well scrolls underneath it.
        position="sticky"
        top="var(--esw-admin-bar)"
        zIndex="3"
        bg="ui.surface"
      >
        {/* From xl the logo column matches the rail so page tabs start where content does; narrower, it would overrun a 1030 window. */}
        <Button
          ref={burgerRef}
          data-panel-menu
          // The name keeps "Easy SVG": wp-admin's own toggle on a phone is called just "Menu".
          aria-label={__('Easy SVG menu', 'easy-svg')}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          variant="ghost"
          display={{ base: 'inline-flex', lg: 'none' }}
          gap="1.5"
          minW="11"
          minH="11"
          px="2"
          ms="-2"
          borderRadius="forge"
          color="ui.heading"
          fontSize="ui.sm"
          fontWeight="medium"
          _hover={{ bg: 'ui.ghostHover' }}
          css={{ '& svg': { width: '5', height: '5' } }}
          onClick={() => setMenuOpen(true)}
        >
          <LuMenu aria-hidden="true" />
        </Button>
        <HStack gap="3.5" w={{ xl: 'ui.brand' }} flexShrink="0">
        {/* The product name, not a sentence: nothing to translate. With Pro active, Pro's wordmark. */}
        {/* A real page load, so home always lands fresh on the full icon list. */}
        <a
          href="?page=easy-svg-icons"
          aria-label={__('Icons', 'easy-svg')}
          style={{ display: 'block', lineHeight: 0 }}
        >
          <Box
            as="img"
            src={config.proLogo || productLogo}
            alt={config.proActive || config.proLogo ? __('Easy SVG Pro', 'easy-svg') : 'Easy SVG'}
            h="2.5rem"
            w="auto"
            display="block"
            data-panel-logo={config.proLogo ? 'pro-logo' : config.proActive ? 'pro' : 'free'}
          />
        </a>
        {/* A badge only when Pro is licensed; an inactive licence belongs on the licence tab, not the brand bar. */}
        {/* One badge at the small text step says Pro; a superscript PRO on the wordmark is too small to read. Pro's own logo says it already. */}
        {config.proActive && !config.proLogo ? (
          <Box
            as="span"
            data-panel-pro-badge
            bg="ui.accent"
            color="ui.heading"
            fontWeight="bold"
            fontSize="ui.sm"
            lineHeight="ui.snug"
            letterSpacing=".02em"
            px="2"
            py="0.5"
            borderRadius="full"
            aria-hidden="true"
          >
            {__('Pro', 'easy-svg')}
          </Box>
        ) : null}
        </HStack>
        {/* One bar for product, page tabs and actions; a title row above would say Icons twice. */}
        {/* The chosen page's underline is exactly as wide as its name, on the header's bottom edge. */}
        <HStack as="nav" aria-label={__('Easy SVG pages', 'easy-svg')} display={{ base: 'none', lg: 'flex' }} gap={{ lg: '5', xl: '8' }} h="full" ms="2.5" align="stretch">
          {PAGES.filter((p) => tabs.some((t) => t.area === p.id)).map((p) => {
            const on = p.id === page.id
            return (
              <Button
                key={p.id}
                data-page-tab
                variant="plain"
                h="full"
                px="0"
                minW="0"
                borderRadius="0"
                fontSize="ui.body"
                fontWeight={on ? '500' : '400'}
                color={on ? 'ui.heading' : 'ui.muted'}
                position="relative"
                transition="color 0.15s ease"
                // The underline grows from the middle; focus shows as the same line.
                _after={{
                  content: '""',
                  position: 'absolute',
                  insetInline: '0',
                  bottom: '0',
                  borderBottomWidth: 'ui.heavy',
                  borderColor: 'ui.primary',
                  transform: on ? 'scaleX(1)' : 'scaleX(0)',
                  transformOrigin: 'center',
                  transition: 'transform 0.25s ease',
                  _motionReduce: { transition: 'none' },
                }}
                _hover={{ color: 'ui.heading', _after: { transform: 'scaleX(1)' } }}
                _focusVisible={{ outline: 'none', color: 'ui.heading', _after: { transform: 'scaleX(1)' } }}
                aria-current={on ? 'page' : undefined}
                onClick={() => setActive(tabs.find((t) => t.area === p.id).id)}
              >
                {p.label}
                {/* A tab on this page needs attention: say so up here too. */}
                {tabs.some((t) => t.area === p.id && t.alert) ? (
                  <Box as="span" display="inline-flex" color="ui.bad" ms="-1" role="img" aria-label={__('Needs attention', 'easy-svg')} css={{ '& svg': { width: '4', height: '4' } }}>
                    <LuCircleAlert aria-hidden="true" />
                  </Box>
                ) : null}
              </Button>
            )
          })}
        </HStack>
        {/* Where a screen puts its main actions. Filled through a portal. */}
        <HStack id="esw-page-action" data-page-action gap="2" ms="auto" minW="0" />
        {/* Free alone: one way to the Pro page from every screen. */}
        {tabs.some((t) => 'upsell' === t.id) && 'upsell' !== activeValue ? (
          <Button
            data-pro-hint
            variant="plain"
            display={{ base: 'none', md: 'inline-flex' }}
            aria-label={__('What Pro can do', 'easy-svg')}
            gap="2"
            px="3"
            minH="11"
            minW="11"
            fontSize="ui.body"
            fontWeight="medium"
            color="ui.heading"
            _hover={{ bg: 'ui.ghostHover' }}
            onClick={() => setActive('upsell')}
          >
            <Box as="span" display="inline-flex" color="ui.accentHover" css={{ '& svg': { width: '4', height: '4' } }}>
              <LuSparkles aria-hidden="true" />
            </Box>
            {/* Beside the page words below xl the sparkle alone, so the bar fits. */}
            <Box as="span" display={{ base: 'inline', lg: 'none', xl: 'inline' }}>{__('What Pro can do', 'easy-svg')}</Box>
          </Button>
        ) : null}
      </Flex>

      {/* A narrow screen gets one list of rows; a horizontal strip would hide half of Tools at 375. */}
      <Drawer.Root open={menuOpen} onOpenChange={(e) => setMenuOpen(e.open)} finalFocusEl={() => burgerRef.current} placement="start" size="xs" lazyMount unmountOnExit>
        <Portal container={frameRef}>
          <Drawer.Backdrop />
          {/* Below wp-admin's bar, fixed or what is left of it on a phone. */}
          <Drawer.Positioner top={OVERLAY_TOP} bottom="0" h="auto" style={menuCover}>
            <Drawer.Content bg="ui.surface" data-panel-drawer>
              <Drawer.Header display="flex" alignItems="center" justifyContent="space-between" h="ui.header" px="4" py="0" borderBottomWidth="ui.hair" borderColor="ui.border">
                <Drawer.Title fontSize="ui.xl" fontWeight="bold" color="ui.heading">{__('Menu', 'easy-svg')}</Drawer.Title>
                <Drawer.CloseTrigger asChild position="static">
                  <CloseButton aria-label={__('Close', 'easy-svg')} minW="11" h="11" css={{ '& svg': { width: '5', height: '5' } }} />
                </Drawer.CloseTrigger>
              </Drawer.Header>
              <Drawer.Body px="3" py="4">
                <Stack as="nav" aria-label={__('Easy SVG pages', 'easy-svg')} gap="5">
                  {menuPages.map((p) => (
                    <Box key={p.id} data-menu-page={p.id}>
                      <Text px="4" pb="1.5" fontSize="ui.xs" fontWeight="bold" textTransform="uppercase" letterSpacing=".04em" color="ui.muted">{p.label}</Text>
                      <Stack gap="1">
                        {p.tabs.map((t) => {
                          const on = t.id === activeValue
                          return (
                            <Button
                              key={t.id}
                              data-menu-tab={t.id}
                              variant="plain"
                              gap="3"
                              w="full"
                              justifyContent="flex-start"
                              minH="11"
                              px="4"
                              borderRadius="forge"
                              fontSize="ui.body"
                              fontFamily="heading"
                              fontWeight={on ? 'bold' : '400'}
                              color={on ? 'ui.heading' : t.locked ? 'ui.muted' : 'ui.text'}
                              bg={on ? 'ui.menuHover' : 'transparent'}
                              _hover={{ bg: on ? 'ui.menuHover' : 'ui.ghostHover', color: 'ui.heading' }}
                              css={{ '& svg': { width: '5', height: '5' } }}
                              aria-current={on ? 'page' : undefined}
                              onClick={() => {
                                setActive(t.id)
                                setMenuOpen(false)
                              }}
                            >
                              <TabIcon icon={t.icon} />
                              <Text as="span">{t.label}</Text>
                              {t.locked ? <ProBadge>{__('Pro', 'easy-svg')}</ProBadge> : null}
                              {t.alert ? (
                                <Box as="span" ms="auto" color="ui.bad" display="inline-flex" role="img" aria-label={__('Needs attention', 'easy-svg')} css={{ '& svg': { width: '4.5', height: '4.5' } }}>
                                  <LuCircleAlert aria-hidden="true" />
                                </Box>
                              ) : null}
                            </Button>
                          )
                        })}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      {/* On the Root, not Tabs.Content: ark only splits these props out there, so only the active tab is in the DOM. */}
      <Tabs.Root
        value={shownValue}
        onValueChange={(e) => setActive(e.value)}
        variant="plain"
        orientation={pageTabs.length > 1 ? 'vertical' : 'horizontal'}
        colorPalette="brand"
        lazyMount
        unmountOnExit
        flex="1"
        display="flex"
        flexDirection="column"
      >
        {/* The page's name for screen readers; on screen the tab in the bar says it. */}
        <Heading as="h1" srOnly>{page.label}</Heading>
        <Flex flex="1" minW="0" bg="ui.bg" direction={{ base: 'column', lg: 'row' }} align="stretch">
        {/* Only a page with two or more screens gets a side rail; below lg the drawer lists them. */}
        {pageTabs.length > 1 && !ownRail ? (
          <Box
            as="aside"
            display={{ base: 'none', lg: 'block' }}
            w="{sizes.ui.rail}"
            flexShrink="0"
            bg="ui.surface"
            borderRightWidth="ui.hair"
            borderColor="ui.border"
            px="3"
            pt="8"
            pb="3"
          >
            <Tabs.List css={RAIL_LINES} flexDirection="column" gap="0" borderWidth="0" w="full" position="sticky" top="calc(var(--esw-admin-bar) + {sizes.ui.header} + {spacing.8})">
              {triggers}
            </Tabs.List>
          </Box>
        ) : null}
        <Box flex="1" minW="0" w="full" maxW="ui.content" px={{ base: '4', md: '6' }} py={{ base: '5', md: '6' }}>
          {/* _closed hides a mounted panel that is not current; the Root's render strategy alone can leave one visible. */}
          {tabs.map((t) => (
            <Tabs.Content key={t.id} value={t.id} ref={noTabStop} p="0" _closed={{ display: 'none' }} _focusVisible={{ outline: 'none', boxShadow: 'inset 0 0 0 {borderWidths.ui.hair} {colors.ui.primary}' }}>
              {t.render(ctx)}
            </Tabs.Content>
          ))}
        </Box>
        </Flex>
      </Tabs.Root>

      {/* The footer answers support's first question: which versions are installed. */}
      <Flex
        data-panel-footer
        ref={footRef}
        // Held at the foot of the window like the header at its top; it
        // takes the place of wp-admin's own footer, hidden on this page.
        // On a narrow screen it wraps to rows, too tall to keep in view.
        position={{ base: 'relative', lg: 'sticky' }}
        bottom="0"
        zIndex="3"
        // The icons fade out above it, as far as the page still runs on below,
        // instead of being cut at its edge; beside the rail only, which fades
        // its own rows.
        css={{
          '--esw-foot': '0',
          '&::before': {
            content: '""',
            position: 'absolute',
            insetInlineEnd: '0',
            display: { base: 'none', lg: 'block' },
            insetInlineStart: '{sizes.ui.rail}',
            bottom: '100%',
            height: '14',
            pointerEvents: 'none',
            bgImage: 'linear-gradient(to bottom, transparent, {colors.ui.bg})',
            opacity: 'var(--esw-foot)',
          },
        }}
        px={{ base: '4', md: '6' }}
        // 2 keeps the 44px links inside sizes.ui.footer; the library subtracts that height from the window.
        minH="16"
        py="2"
        borderTopWidth="ui.hair"
        borderColor="ui.border"
        bg="ui.surface"
        align="center"
        justify="space-between"
        gap="3"
        wrap="wrap"
      >
        {/* The version sits by the maker's logo, so a phone keeps it on the first row. */}
        <HStack gap="3" rowGap="1" wrap="wrap">
          <HStack as="a" href={utmUrl('https://www.unleash-wp.com/', 'footer', 'logo')} target="_blank" rel="noopener noreferrer" gap="1.5" minH="11" textDecoration="none">
            <Text as="span" fontSize="ui.xs" color="ui.footer">{__('Powered by', 'easy-svg')}</Text>
            <Box as="img" src={makerLogo} alt="UnleashWP" h="6" w="auto" display="block" />
          </HStack>
          {config.version ? (
            <Text as="span" data-footer-pipe aria-hidden="true" mx="1" fontSize="ui.xs" color="ui.footer">|</Text>
          ) : null}
          {config.version ? (
            // Both halves, where a person looks for a version before writing to support.
            <HStack gap="3" fontSize="ui.xs" color="ui.footer">
              <Text as="span">{`v${config.version}`}</Text>
              {config.proVersion ? <Text as="span">{`${__('Pro', 'easy-svg')} v${config.proVersion}`}</Text> : null}
            </HStack>
          ) : null}
        </HStack>
        {config.version ? (
          // Where an answer is, a click away; every link finger high.
          <HStack gap={{ base: '3', md: '5' }} rowGap="2" wrap="wrap" fontSize="ui.sm" color="ui.footer">
            <ReviewStars reviewUrl={config.reviewUrl || ''} proReviewUrl={config.proReviewUrl || ''} />
            <HStack
              as="a"
              href={utmUrl(`https://support.unleash-wp.com/${/^de\b/i.test(document.documentElement.lang || '') ? 'de' : 'en'}/guides/easy-svg/introduction`, 'footer', 'docs')}
              target="_blank"
              rel="noopener noreferrer"
              gap="1.5"
              minH="11"
              color="ui.footer"
              textDecoration="none"
              _hover={{ color: 'ui.heading' }}
              css={{ '& svg': { width: 'ui.glyphSm', height: 'ui.glyphSm' } }}
            >
              <LuBookOpen />
              {__('Documentation', 'easy-svg')}
            </HStack>
            <HStack
              as="a"
              href="https://account.unleash-wp.com"
              target="_blank"
              rel="noopener noreferrer"
              gap="1.5"
              minH="11"
              color="ui.footer"
              textDecoration="none"
              _hover={{ color: 'ui.heading' }}
              css={{ '& svg': { width: 'ui.glyphSm', height: 'ui.glyphSm' } }}
            >
              <LuCircleUser />
              {__('Account', 'easy-svg')}
            </HStack>
            <HStack
              as="a"
              href={utmUrl('https://support.unleash-wp.com', 'footer', 'support')}
              target="_blank"
              rel="noopener noreferrer"
              gap="1.5"
              minH="11"
              color="ui.footer"
              textDecoration="none"
              _hover={{ color: 'ui.heading' }}
              css={{ '& svg': { width: 'ui.glyphSm', height: 'ui.glyphSm' } }}
            >
              <LuLifeBuoy />
              {__('Support', 'easy-svg')}
            </HStack>
          </HStack>
        ) : null}
      </Flex>
    </Box>
  )
}
