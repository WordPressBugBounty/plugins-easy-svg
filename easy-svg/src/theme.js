// Chakra UI v3 design system: the UnleashWP tokens (navy brand, yellow accent,
// Ubuntu, the "forge" radius), copied from the account app so the editor looks
// like the rest of UnleashWP. Light-only here: it lives inside wp-admin.
import { createSystem, defineConfig } from '@chakra-ui/react'

// One set of widths for the props and for the few raw media queries below.
const breakpoints = { sm: '560px', md: '640px', lg: '780px', xl: '1280px', '2xl': '1536px' }

// Every root the plugins mount: the panel, the Plugins screen hint, and any element carrying data-easy-svg-ui (Pro's set editor and network screen).
const ROOTS = ['#easy-svg-panel', '#easy-svg-hint', '[data-easy-svg-ui]']
const inRoots = (tail = '') => ROOTS.map((root) => root + tail).join(', ')

export const config = defineConfig({
  globalCss: {
    // A scroll edge's fade: on once the menu has moved, off at its end.
    '@keyframes eswFadeIn': { '0%': { opacity: 0 }, '8%, 100%': { opacity: 1 } },
    '@keyframes eswFadeOut': { '0%, 92%': { opacity: 1 }, '100%': { opacity: 0 } },
    // colorPalette makes navy the default for Chakra's palette-driven parts; scoped to the roots, as wp-admin is not ours to restyle.
    [inRoots()]: { fontFamily: 'body', color: 'ui.text', colorPalette: 'brand' },
    // wp-admin's grey placeholder sits at 4.6:1; the muted token keeps it clear of 4.5:1. Important, because wp-admin's rule is unlayered.
    [inRoots(' ::placeholder')]: { color: 'ui.muted !important', opacity: 1 },
    // The page words in the header show focus as their underline instead.
    [inRoots(' *:focus-visible:not([data-page-tab])')]: {
      outline: '2px solid',
      outlineColor: 'ui.primary',
      outlineOffset: '2px',
    },
    // Checkboxes and radio cards focus a hidden input; the ring belongs on what is seen.
    [`${inRoots(' [data-part=control][data-focus-visible]')}, ${inRoots(' [data-part=item-control][data-focus-visible]')}`]: {
      outline: '2px solid',
      outlineColor: 'ui.primary',
      outlineOffset: '2px',
    },
    // An empty checkbox needs 3:1 against white to be found at all (WCAG 1.4.11).
    [inRoots(' [data-scope=checkbox][data-part=control]:not([data-state=checked]):not([data-state=indeterminate])')]: {
      borderColor: 'ui.muted',
    },
    '@media (prefers-reduced-motion: reduce)': {
      [`${inRoots(' *')}, ${inRoots(' *::before')}, ${inRoots(' *::after')}, [data-scope][data-part=content], [data-scope][data-part=positioner]`]: {
        animationDuration: '0.01ms !important',
        animationIterationCount: '1 !important',
        transitionDuration: '0.01ms !important',
      },
    },
  },
  theme: {
    breakpoints,
    tokens: {
      // wp-admin's menu (9990) and admin bar (99999) cover Chakra's defaults; wp.media (160000) still opens over these.
      zIndex: {
        dropdown: { value: 100000 },
        overlay: { value: 100010 },
        modal: { value: 100020 },
        popover: { value: 100030 },
        skipNav: { value: 100040 },
        toast: { value: 100050 },
        tooltip: { value: 100060 },
      },
      colors: {
        navy: { value: '#203159' },
        navyDeep: { value: '#0f131f' },
        navy2: { value: '#2a3f6f' },
        yellow: { value: '#fcbe00' },
        slate: { value: '#727f9f' },
        slate2: { value: '#35415b' },
        brand: {
          50: { value: '#eef1f6' },
          100: { value: '#d7dded' },
          200: { value: '#b0bcd6' },
          300: { value: '#8496bd' },
          400: { value: '#5d6f9f' },
          500: { value: '#3c4e7d' },
          600: { value: '#2a3b64' },
          700: { value: '#203159' },
          800: { value: '#1a2747' },
          900: { value: '#141d35' },
          950: { value: '#0f131f' },
        },
      },
      // Ubuntu ships with the plugin and renders the whole panel, as brand headings over system body text read as two designs.
      // One type scale in rem, so a reader's browser size still applies.
      fontSizes: {
        ui: {
          '2xs': { value: '0.6875rem' },
          xs: { value: '0.75rem' },
          sm: { value: '0.8125rem' },
          md: { value: '0.875rem' },
          lg: { value: '0.9375rem' },
          body: { value: '0.9375rem' },
          xl: { value: '1.125rem' },
          '2xl': { value: '1.25rem' },
          '3xl': { value: '1.375rem' },
          '4xl': { value: '1.5rem' },
          '5xl': { value: '1.75rem' },
          '6xl': { value: '2.125rem' },
          '7xl': { value: '2.875rem' },
        },
      },
      fonts: {
        heading: { value: 'Ubuntu, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
        body: { value: 'Ubuntu, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
        mono: { value: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace' },
      },
      radii: {
        forge: { value: '0.3125rem' },
      },
      // Search field widths, the same names in both plugins.
      sizes: {
        ui: {
          searchMax: { value: '18.75rem' },
          searchGrid: { value: '20rem' },
          searchGridPick: { value: '15rem' },
          searchToolbar: { value: '11.25rem' },
          // The panel's fixed bars: header, footer, wp-admin's own bar, Pro's editor bar.
          header: { value: '72px' },
          footer: { value: '64px' },
          adminBar: { value: '32px' },
          editorBar: { value: '65px' },
          rail: { value: '280px' },
          brand: { value: '252px' },
          heroCta: { value: '380px' },
          // Measures of pages, dialogs and fields.
          narrow: { value: '420px' },
          confirm: { value: '440px' },
          actionBar: { value: '460px' },
          dialogMd: { value: '560px' },
          form: { value: '640px' },
          page: { value: '720px' },
          dialogLg: { value: '760px' },
          licence: { value: '820px' },
          wide: { value: '900px' },
          editor: { value: '1180px' },
          // Every screen's content stops here, so a wide window does not stretch cards and rows apart.
          content: { value: '1280px' },
          field: { value: '320px' },
          sideSm: { value: '240px' },
          side: { value: '260px' },
          sideLg: { value: '300px' },
          sideMax: { value: '340px' },
          // Heights of lists, menus and previews that scroll inside themselves.
          pickList: { value: '200px' },
          menuMin: { value: '200px' },
          dropZone: { value: '200px' },
          menuMax: { value: '270px' },
          listMax: { value: '280px' },
          code: { value: '280px' },
          listTall: { value: '360px' },
          preview: { value: '180px' },
          skeletonLabel: { value: '110px' },
          // Grid cells and the drawings in them.
          tile: { value: '104px' },
          tilePro: { value: '124px' },
          tileFa: { value: '88px' },
          tileSwap: { value: '220px' },
          dropCircle: { value: '72px' },
          tileIcon: { value: '52px' },
          pin: { value: '52px' },
          previewLg: { value: '28px' },
          glyphLg: { value: '26px' },
          previewMd: { value: '24px' },
          glyphMd: { value: '22px' },
          checker: { value: '16px' },
          glyphSm: { value: '15px' },
          // A rating star: 18px in a 24px target, so 6px stay between two stars.
          glyphStar: { value: '18px' },
        },
      },
      // Lines: hair for borders, focus for rings (a ring inside a clipped cell is pulled in by it).
      borderWidths: {
        ui: {
          hair: { value: '1px' },
          mid: { value: '1.5px' },
          focus: { value: '2px' },
          bold: { value: '2px' },
          heavy: { value: '3px' },
          // The media library's upload frame.
          drop: { value: '4px' },
          dot: { value: '6px' },
        },
      },
      // Steps below Chakra's spacing scale: a pressed button's nudge, a label's gap.
      spacing: {
        ui: {
          nudge: { value: '1px' },
          labelGap: { value: '5px' },
        },
      },
      lineHeights: {
        ui: {
          solid: { value: '1' },
          tight: { value: '1.1' },
          heading: { value: '1.2' },
          snug: { value: '1.4' },
          body: { value: '1.5' },
          relaxed: { value: '1.6' },
          control: { value: '20px' },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Both surfaces per token; the dark column is Forge's, value for value, and dark is what renders under the panel's class.
        brand: {
          solid: { value: { base: '{colors.brand.700}', _dark: '{colors.brand.400}' } },
          contrast: { value: '#ffffff' },
          fg: { value: { base: '{colors.brand.700}', _dark: '{colors.brand.300}' } },
          muted: { value: { base: '{colors.brand.100}', _dark: '{colors.brand.900}' } },
          subtle: { value: { base: '{colors.brand.50}', _dark: '{colors.brand.950}' } },
          emphasized: { value: { base: '{colors.brand.200}', _dark: '{colors.brand.800}' } },
          focusRing: { value: { base: '{colors.brand.600}', _dark: '{colors.brand.400}' } },
        },
        // The account app's primary action: yellow with navy ink (7.6:1). As a
        // palette, so a Chakra Button takes it with colorPalette="accent".
        accent: {
          solid: { value: '{colors.yellow}' },
          contrast: { value: '{colors.navy}' },
          fg: { value: { base: '{colors.navy}', _dark: '{colors.yellow}' } },
          muted: { value: { base: '#fde9a8', _dark: '#3d3410' } },
          subtle: { value: { base: '#fff6d6', _dark: '#2a2410' } },
          emphasized: { value: { base: '#e6ac00', _dark: '#ffd34d' } },
          // The theme's own ring, not a yellow one.
          focusRing: { value: { base: '{colors.brand.600}', _dark: '{colors.brand.400}' } },
        },
        'ui.bg': { value: { base: '#eef1f6', _dark: '#0a0e16' } },
        'ui.surface': { value: { base: '#ffffff', _dark: '#141a27' } },
        'ui.sunk': { value: { base: '#f5f7fa', _dark: '#1b2231' } },
        'ui.border': { value: { base: '#e3e7f0', _dark: '#2b3446' } },
        'ui.heading': { value: { base: '{colors.navy}', _dark: '#eaf0ff' } },
        'ui.text': { value: { base: '#2b3242', _dark: '#dbe2ef' } },
        'ui.muted': { value: { base: '#55607a', _dark: '#94a1bd' } },
        // The footer: a plain grey, light but above the 4.5:1 of small text on white.
        'ui.footer': { value: { base: '#5f6368', _dark: '#a3a8b4' } },
        'ui.primary': { value: { base: '{colors.navy}', _dark: '#7c93ff' } },
        'ui.accent': { value: '{colors.yellow}' },
        'ui.tagbg': { value: { base: '#eceef5', _dark: '#232b40' } },
        'ui.tagfg': { value: { base: '{colors.navy}', _dark: '#b9c7ff' } },
        'ui.good': { value: '#1a8f57' },
        'ui.goodInk': { value: { base: '#157a45', _dark: '#4bd08a' } },
        'ui.bad': { value: '#c0392b' },
        'ui.goodBg': { value: { base: '#e3f3ea', _dark: '#13301f' } },
        'ui.badBg': { value: { base: '#fbe7e4', _dark: '#331a17' } },
        'ui.badInk': { value: { base: '#a5342a', _dark: '#ff9c8f' } },
        'ui.ghostHover': { value: { base: 'rgba(32,49,89,.06)', _dark: 'rgba(124,147,255,.12)' } },
        // Menus float on a soft blue, so they read apart from the white cards.
        'ui.menu': { value: { base: '#f8faff', _dark: '#18213a' } },
        'ui.menuHover': { value: { base: '#ebf1fd', _dark: '#24305180' } },
        'ui.ring': { value: { base: 'rgba(32,49,89,.26)', _dark: 'rgba(124,147,255,.42)' } },
        'ui.rangeFill': { value: { base: '#e7ebf5', _dark: '#26314d' } },
        // Hover and state tones, one per role, so the two buttons share one of each.
        'ui.accentHover': { value: '#e6ac00' },
        'ui.primaryHover': { value: '#2c4070' },
        'ui.selectedHover': { value: 'rgba(32,49,89,.08)' },
        'ui.hoverSoft': { value: 'rgba(32,49,89,.045)' },
        'ui.scrollbar': { value: 'rgba(32,49,89,.22)' },
        'ui.borderStrong': { value: '#c8d0de' },
        'ui.wpBorder': { value: '#c3c4c7' },
        'ui.stage': { value: '#dde2ea' },
        'ui.warnBg': { value: '#fff7e0' },
        'ui.goodSoft': { value: '#6fb592' },
        'ui.goodTint': { value: '#e6f4ec' },
        'ui.goodDeep': { value: '#2f7a53' },
        // A veil over a card while it works, and over the grid while a file is dragged in.
        'ui.veil': { value: 'rgba(255,255,255,.9)' },
        'ui.veilBg': { value: 'rgba(238,241,246,.97)' },
        // The ink of the panel's shadows, for the sticky bar that mixes its own alpha.
        'ui.shadowInk': { value: '#18181b' },
        // The SVG code field is dark in both modes, like the Forge editor.
        'code.bg': { value: '#0f131f' },
        'code.text': { value: '#e6eaf2' },
        'code.gutter': { value: '#141d35' },
        'code.muted': { value: '#8496bd' },
        'code.cursor': { value: '#ffffff' },
        'code.activeLine': { value: '#1a2747' },
        'code.selection': { value: '#2a3b64' },
        'code.tag': { value: '#fcbe00' },
        'code.attribute': { value: '#9cc2ff' },
        'code.string': { value: '#8fe3b0' },
        'code.error': { value: '#ff9e8f' },
        // Other companies' marks keep their own colour.
        // Nested, not 'vendor.x': the Si marks read the variable by name, and a
        // dotted key would put an escaped dot into it.
        vendor: {
          mcp: { value: '#000000' },
          elementor: { value: '#92003b' },
          fontawesome: { value: '#538dd7' },
          gutenberg: { value: '#000000' },
          wordpress: { value: '#21759b' },
        },
      },
      shadows: {
        // Plain values, not { base, _dark }: the conditional form loses to Chakra's own shadows.sm/md/lg.
        sm: { value: '0 1px 2px rgba(32,49,89,.06)' },
        md: { value: '0 6px 24px rgba(32,49,89,.09)' },
        lg: { value: '0 18px 48px rgba(32,49,89,.16)' },
        // The panel's own elevations, one name per look. Plain values, like the three above.
        'ui.raised': { value: '0 1px 2px rgba(24,24,27,.06)' },
        'ui.raisedHover': { value: '0 6px 16px rgba(24,24,27,.10)' },
        'ui.card': { value: '0 1px 3px rgba(24,24,27,.08)' },
        'ui.cardHover': { value: '0 8px 22px rgba(24,24,27,.10)' },
        'ui.tile': { value: '0 4px 14px rgba(24,24,27,.08)' },
        'ui.tileHover': { value: '0 8px 20px rgba(24,24,27,.12)' },
        'ui.lift': { value: '0 4px 12px rgba(24,24,27,.10)' },
        'ui.chip': { value: '0 2px 4px rgba(24,24,27,.1)' },
        'ui.menu': { value: '0 12px 32px rgba(24,24,27,.14)' },
        'ui.dialog': { value: '0 12px 40px rgba(24,24,27,.14)' },
        'ui.drop': { value: '0 6px 24px rgba(32,49,89,.25)' },
        'ui.chosenRing': { value: 'inset 0 0 0 1px rgba(255,255,255,.55)' },
      },
    },
    // Buttons and fields as roomy as the side list's rows, the size found easiest to hit.
    recipes: {
      button: {
        variants: {
          size: {
            // sm and md alike so a dialog's buttons line up; xs keeps its small box for crosses and ⋮ but not smaller text.
            // textStyle, not fontSize: the recipe's own textStyle won over a bare size.
            xs: { textStyle: 'md', fontSize: 'ui.body', fontWeight: '500' },
            sm: { h: '11', minW: '11', px: '5', textStyle: 'md', fontSize: 'ui.body', fontWeight: '500' },
            md: { h: '11', minW: '11', px: '5', textStyle: 'md', fontSize: 'ui.body', fontWeight: '500' },
          },
        },
      },
      input: {
        variants: {
          size: {
            md: { h: '11', minW: '11', fontSize: 'ui.body' },
          },
        },
      },    },
    // Text in a dialog, a details list and a select at 16px like the
    // buttons: Chakra's recipes set these to 14px.
    slotRecipes: {
      dialog: {
        base: { content: { textStyle: 'md' }, body: { textStyle: 'md' }, title: { m: '0!', minW: '0', overflowWrap: 'anywhere' }, description: { textWrap: 'pretty' } },
        variants: {
          // Held from the top, not centred: a dialog whose content settles after opening would otherwise grow or shrink around its middle and twitch.
          placement: {
            center: { positioner: { alignItems: 'flex-start', pt: '12vh' }, content: { mt: '0', mb: '12', my: 'unset' } },
          },
        },
      },
      dataList: {
        variants: {
          size: { md: { root: { textStyle: 'md' }, itemLabel: { fontWeight: '500' } } },
        },
      },
      select: {
        variants: {
          size: { md: { trigger: { textStyle: 'md' }, item: { textStyle: 'md' }, content: { textStyle: 'md' } } },
        },
      },
      nativeSelect: {
        variants: {
          size: { md: { field: { textStyle: 'md' } } },
        },
      },
    },
    // Typography scale for the panel. 400, 500 (buttons, chosen rows) and 700
    // are bundled; anything else would be a synthesised faux-bold. Apply with textStyle="…".
    textStyles: {
      h1: {
        value: {
          fontSize: 'ui.5xl',
          fontWeight: '700',
          letterSpacing: '-0.01em',
          color: 'ui.heading',
        },
      },
      sectionTitle: {
        value: {
          fontSize: 'ui.body',
          fontWeight: '700',
          color: 'ui.heading',
        },
      },
      fieldLabel: {
        value: {
          fontSize: 'ui.md',
          fontWeight: '700',
          color: 'ui.heading',
        },
      },
      description: {
        value: {
          fontSize: 'ui.md',
          fontWeight: '400',
          lineHeight: '1.5',
          color: 'ui.muted',
        },
      },
      caption: {
        value: {
          // 14px, the same step as descriptions: body text is 16px, notes 14px.
          fontSize: 'ui.md',
          fontWeight: '400',
          color: 'ui.muted',
        },
      },
    },
  },
})

// Chakra's reset is confined to the plugin roots, as unscoped it bordered every wp-admin menu item; tokens stay on html to resolve.
export const media = {
  // wp-admin's bar scrolls with the page only up to 600px; above that it is fixed.
  wpNarrow: '@media screen and (max-width: 600px)',
  // The sets beside the grid, from lg as the panel's own rail: below it they sit in a drawer.
  railWide: `@media (min-width: ${breakpoints.lg})`,
}

const ROOT = `:where(${ROOTS.join(', ')})`

// Any base config, scoped to the plugin roots: src/kit/system.js passes Chakra's full one, the hint a base with its button only.
export function scopedSystem(base, own = config) {
  const scopedGlobalCss = Object.fromEntries(
    Object.entries(base.globalCss ?? {})
      // html would paint wp-admin's own canvas, line height and colours.
      .filter(([selector]) => selector !== 'html')
      .map(([selector, styles]) => [
        selector
          .split(',')
          .map((part) => `${ROOT} ${part.trim()}`)
          .concat(selector === '*' ? [ROOT] : [])
          .join(', '),
        styles,
      ])
  )
  return createSystem(
    {
      ...base,
      preflight: { scope: ROOT },
      globalCss: {
        ...scopedGlobalCss,
        // The scoped reset puts html's line height and font smoothing on the root; the panel keeps inheriting wp-admin's.
        [ROOT]: {
          // wp-admin's 13px is small for a screen people work in; the panel
          // reads at 16px, and Chakra's rem sizes keep their own steps.
          fontSize: 'ui.body',
          lineHeight: 'inherit',
          WebkitFontSmoothing: 'inherit',
          MozOsxFontSmoothing: 'inherit',
          textRendering: 'inherit',
        },
      },
    },
    own
  )
}
