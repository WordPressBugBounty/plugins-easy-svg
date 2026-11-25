import { defaultConfig } from '@chakra-ui/react'
import { scopedSystem } from '../theme.js'

// Apart from theme.js, so the hint can read the theme without Chakra's every recipe.
export const system = scopedSystem(defaultConfig)
