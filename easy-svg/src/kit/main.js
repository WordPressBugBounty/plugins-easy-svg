import * as chakra from './chakra.js'
import * as emotion from '@emotion/react'
import * as ui from '../ui.jsx'
import { media } from '../theme.js'
import { system } from './system.js'
import { paintStyle } from '../panel/paint-style.js'
import { PURIFY_SVG, purifySvg, sanitizeSvg } from '../svg-purify.js'
import { scopeSvgIds } from '../svg-ids.js'

// The one Chakra, emotion and theme on the page: the panel, the hint and Pro's bundles all read this global, so their styles share one cache.
// `api` is EASY_SVG_UI_API; raise both together when the surface loses or changes a name.
if (!window.EasySvgUi) {
  window.EasySvgUi = Object.freeze({ api: 1, chakra, emotion, ...ui, system, media, paintStyle, PURIFY_SVG, purifySvg, sanitizeSvg, scopeSvgIds })
}
