import { defaultBaseConfig, mergeConfigs } from '@chakra-ui/react'
// Chakra's theme modules one by one: its theme index builds every recipe, which is most of the kit's weight.
import { animations } from 'chakra-theme/tokens/animations.js'
import { aspectRatios } from 'chakra-theme/tokens/aspect-ratios.js'
import { blurs } from 'chakra-theme/tokens/blurs.js'
import { borders } from 'chakra-theme/tokens/borders.js'
import { colors } from 'chakra-theme/tokens/colors.js'
import { cursor } from 'chakra-theme/tokens/cursor.js'
import { durations } from 'chakra-theme/tokens/durations.js'
import { easings } from 'chakra-theme/tokens/easings.js'
import { fontSizes } from 'chakra-theme/tokens/font-sizes.js'
import { fontWeights } from 'chakra-theme/tokens/font-weights.js'
import { fonts } from 'chakra-theme/tokens/fonts.js'
import { keyframes } from 'chakra-theme/tokens/keyframes.js'
import { letterSpacings } from 'chakra-theme/tokens/letter-spacing.js'
import { lineHeights } from 'chakra-theme/tokens/line-heights.js'
import { radii } from 'chakra-theme/tokens/radius.js'
import { sizes } from 'chakra-theme/tokens/sizes.js'
import { spacing } from 'chakra-theme/tokens/spacing.js'
import { zIndices } from 'chakra-theme/tokens/z-indices.js'
import { semanticColors } from 'chakra-theme/semantic-tokens/colors.js'
import { semanticRadii } from 'chakra-theme/semantic-tokens/radii.js'
import { semanticShadows } from 'chakra-theme/semantic-tokens/shadows.js'
import { breakpoints } from 'chakra-theme/breakpoints.js'
import { globalCss } from 'chakra-theme/global-css.js'
import { layerStyles } from 'chakra-theme/layer-styles.js'
import { textStyles } from 'chakra-theme/text-styles.js'
import { buttonRecipe } from 'chakra-theme/recipes/button.js'
import { config, scopedSystem } from '../theme.js'

// The Plugins screen draws one card: Chakra's tokens and the button recipe, as its default theme has them.
const base = mergeConfigs(defaultBaseConfig, {
  preflight: true,
  cssVarsPrefix: 'chakra',
  cssVarsRoot: ':where(html, .chakra-theme)',
  globalCss,
  theme: {
    breakpoints,
    keyframes,
    tokens: { aspectRatios, animations, blurs, borders, colors, durations, easings, fonts, fontSizes, fontWeights, letterSpacings, lineHeights, radii, spacing, sizes, zIndex: zIndices, cursor },
    semanticTokens: { colors: semanticColors, shadows: semanticShadows, radii: semanticRadii },
    textStyles,
    layerStyles,
    recipes: { button: buttonRecipe },
  },
})

export const system = scopedSystem(base, { ...config, theme: { ...config.theme, recipes: { button: config.theme.recipes.button }, slotRecipes: {} } })
