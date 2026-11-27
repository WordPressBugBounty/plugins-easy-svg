import { PointerSensor } from '@dnd-kit/core'
import {
  LuArrowRightLeft,
  LuCopy,
  LuEllipsisVertical,
  LuFolder,
  LuPencil,
  LuPlus,
  LuTrash2,
  LuUpload,
  LuArchiveRestore,
} from 'react-icons/lu'
import { __, _n, sprintf } from '@wordpress/i18n'
import { refOf } from './library-logic.js'
// The shared kit's rule: the stored markup is already server-hardened, and a pasted draft is sanitised before innerHTML.
export { sanitizeSvg, purifySvg } from '../../../svg-purify.js'
export { scopeSvgIds } from '../../../svg-ids.js'

// What a theme or a template writes to render the icon. This is what the copy
// action puts on the clipboard, and the only reason a slug is worth seeing.
// A checkerboard, as an image editor shows a transparent canvas; tiles and the detail view share it.
export const CHECKER = {
  bg: 'ui.surface',
  bgImage: 'conic-gradient({colors.ui.sunk} 25%, transparent 0 50%, {colors.ui.sunk} 0 75%, transparent 0)',
  bgSize: '{sizes.ui.checker} {sizes.ui.checker}',
}

const iconCall = (slug) => `easy_svg_icon( '${slug}' )`

// Core's Icon block passes its icons through an allow-list of svg, path and
// polygon (class-wp-icons-registry.php, 7.0): a rect, a circle or a line is
// dropped, and an icon drawn with them renders as nothing at all.
const BLOCK_DRAWS = new Set(['path', 'polygon'])

const BLOCK_WRAPS = new Set(['svg', 'g', 'title', 'desc'])

const blockCanDraw = (markup) => {
  try {
    const doc = new window.DOMParser().parseFromString(String(markup || ''), 'image/svg+xml')
    const names = Array.from(doc.getElementsByTagName('*')).map((el) => el.localName)
    return names.some((n) => BLOCK_DRAWS.has(n)) && names.every((n) => BLOCK_DRAWS.has(n) || BLOCK_WRAPS.has(n))
  } catch {
    return false
  }
}

// The three ways to place an icon, each copied as it is written. The block is
// core's Icon block, which exists only where WordPress has the icon registry.
// A provider's ref goes into PHP, a shortcode and a block comment unescaped; one that could break out of them gets no copy form.
const SAFE_REF = /^[A-Za-z0-9_.:\/-]+$/

export const callForms = (ic, iconBlock) => (SAFE_REF.test(refOf(ic)) ? [
  { id: 'php', label: __('PHP', 'easy-svg'), text: iconCall(ic.ref || ic.slug) },
  { id: 'shortcode', label: __('Shortcode', 'easy-svg'), text: `[easy_svg_icon name="${refOf(ic)}"]` },
  ...(iconBlock
    ? [
        blockCanDraw(ic.content)
          ? { id: 'block', label: __('Block', 'easy-svg'), text: `<!-- wp:icon {"icon":"${refOf(ic)}"} /-->` }
          : {
              id: 'block',
              label: __('Block', 'easy-svg'),
              text: __('Not for this icon: the Icon block draws only paths and polygons.', 'easy-svg'),
              disabled: true,
            },
      ]
    : []),
] : [])

export const nameOf = (ic) => ic.label || ic.slug

// What a tile carries when it is dragged, and the address it moves by.
// How many addresses one move hands a provider; Pro's route takes 25.
// Inset, so the scrolling rail cannot cut it off; one hairline, as a keyboard needs no more.
export const LIST_FOCUS = { outline: 'none', '&:not([data-by-pointer])': { boxShadow: 'inset 0 0 0 {borderWidths.ui.hair} {colors.ui.primary}' } }

// A click focuses the list too, and the browser then reports keyboard focus: the line is for the keyboard only.
export const BY_POINTER = {
  onPointerDownCapture: (e) => e.currentTarget.setAttribute('data-by-pointer', ''),
  // On key up, and captured: the sets list has key-down handlers of its own that this must not replace.
  onKeyUpCapture: (e) => e.currentTarget.removeAttribute('data-by-pointer'),
  onBlur: (e) => e.currentTarget.removeAttribute('data-by-pointer'),
}

// A move rewrites the pages calling each icon, so the add-on takes 25 a request; a copy touches no page and takes 500.
export const MOVE_BATCH = 25
export const COPY_BATCH = 500

export { refOf } from './library-logic.js'

// A taken name is stored as `star-2`, and that slug is what a call must use, so
// the message names it instead of saying only that something was added.
export const addedMessage = (added) =>
  added?.slug && added?.wanted && added.slug !== added.wanted
    ? sprintf(
        // translators: %1$s: the slug the icon was stored under. %2$s: the slug that was already taken.
        __('Added as “%1$s”: “%2$s” was taken.', 'easy-svg'),
        added.slug,
        added.wanted
      )
    : __('Icon added.', 'easy-svg')

// Nothing is pre-judged in the browser: the server owns the verdict and the sentence for it.
export const FILE_ACCEPT = '.svg,image/svg+xml'

// How many files one pick may carry. Ark's FileUpload takes ONE without it, whatever `multiple` says.
export const MAX_FILES = 100

// What /library/media accepts in one request, mirrored here so the picker can
// send a larger selection as several. The server refuses more than this; it does
// not silently take the first few.
export const MEDIA_CHUNK = 25

export const readText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error(__('That file could not be read.', 'easy-svg')))
    reader.readAsText(file)
  })

// Glyphs on currentColor follow the button's hover colours; decorative, as each button carries an aria-label.
// Menus portal inside the panel, the only place the scoped Chakra reset and tokens reach.
// The line after a move, from the add-on's own counts.
export function countedLine({ moved, copied, exists }) {
  const parts = []
  if (moved) {
    // translators: %d: number of icons moved.
    parts.push(sprintf(_n('%d icon moved.', '%d icons moved.', moved, 'easy-svg'), moved))
  }
  if (copied) {
    // translators: %d: number of icons copied into a set.
    parts.push(sprintf(_n('%d icon copied.', '%d icons copied.', copied, 'easy-svg'), copied))
  }
  if (exists) {
    // translators: %d: number of icons the set already had.
    parts.push(sprintf(_n('%d icon was already in the set.', '%d icons were already in the set.', exists, 'easy-svg'), exists))
  }
  return parts.join(' ') || __('Nothing to move.', 'easy-svg')
}

export const PANEL_ROOT = { current: typeof document !== 'undefined' ? document.getElementById('easy-svg-panel') : null }

// Drawers go into the panel's frame: it holds --esw-admin-bar, #easy-svg-panel does not.
export const FRAME_ROOT = { get current() { return PANEL_ROOT.current?.querySelector('[data-panel-frame]') || PANEL_ROOT.current } }

// A finger presses and holds before a tile or a set lifts, so a swipe scrolls
// the page; a small wobble while holding still counts as holding.
const TOUCH_HOLD_MS = 250

// How long a toast stays when nobody is on it.
export const TOAST_MS = 4000

// The longest a pointer or focus left on it can hold it: a drop often ends right over it.
export const TOAST_HOLD_MAX_MS = 8000

// While the pointer or the focus stays on it, how often it asks again.
export const TOAST_RECHECK_MS = 1000

const TOUCH_WOBBLE = 8

// Fixed objects: new options on each render give the drag context a new value, and every rail row draws again.
export const POINTER_DRAG = { activationConstraint: { distance: 6 } }

export const TOUCH_DRAG = { activationConstraint: { delay: TOUCH_HOLD_MS, tolerance: TOUCH_WOBBLE } }

// The mouse and pen keep the pointer sensor as they had it; touch goes to the
// touch sensor alone, or a swipe over the grid would drag after a few pixels.
export class NoTouchPointerSensor extends PointerSensor {
  static activators = [{
    eventName: 'onPointerDown',
    handler: (e, opts) => 'touch' !== e.nativeEvent.pointerType && PointerSensor.activators[0].handler(e, opts),
  }]
}

// A separate inset stroke between rows: a border bent with the rounded corners; direct children, as a right-click row is relabelled.
export const ROW_LINES = {
  '& > *': { position: 'relative' },
  '& > * + *::before': {
    content: '""',
    position: 'absolute',
    top: '0',
    insetInline: '3',
    height: '{borderWidths.ui.hair}',
    bg: 'ui.border',
    pointerEvents: 'none',
  },
  '& > [data-selected]::before, & > [data-selected] + *::before': { display: 'none' },
  // Picked rows run together as one band, as a list of files picked in the
  // Finder does: no line between them, rounded only at the band's ends.
  '& > [data-picked] + [data-picked]::before': { display: 'none' },
  '& > [data-picked] + [data-picked]': { borderTopRadius: '0' },
  '& > [data-picked]:has(+ [data-picked])': { borderBottomRadius: '0' },
  // A group's title is no row: no line between it and its first row.
  '& > [data-part="item-group-label"] + *::before': { display: 'none' },
}

// A symbol in the edit bar: no frame of its own, the bar's lines part them.
// The bar clips its cells to its rounded corners, so the focus ring goes inside.
// A thumb's 44 below lg, where the bar wraps; the bar's full height from lg.
export const BAR_BUTTON = { size: 'md', variant: 'ghost', borderRadius: '0', h: { base: '11', lg: 'full' }, w: { base: '11', lg: '16' }, _focusVisible: { outlineOffset: 'calc(-1 * {borderWidths.ui.focus})' } }

// Every menu on this screen: room around each entry and the hand on all of them.
// Fixed, not absolute: an absolute menu that closes sits outside the page for a moment, and wp-admin scrolls to it when a dialog opens from the menu.
export const MENU_FIXED = { strategy: 'fixed' }

// The rail's lists leave the scroll alone: a click on a row would scroll the rail to put that row at its top and the list would jump under the pointer.
export const KEEP_SCROLL = () => {}

// Writes how far the rail runs past its top and bottom edges onto it, for
// its fades; no render, as it changes on every scroll.
export function railFades(el) {
  if (!el) {
    return
  }
  const below = el.scrollHeight - el.clientHeight - el.scrollTop
  el.style.setProperty('--esw-rail-top', String(Math.min(1, el.scrollTop / 48)))
  // The sets' title, held at the top: a fade under it once rows pass beneath.
  const head = el.querySelector('[data-sets-head]')
  if (head?.parentElement) {
    const under = el.scrollTop - head.parentElement.offsetTop
    el.style.setProperty('--esw-rail-head', String(Math.min(1, Math.max(0, under) / 24)))
  }
  el.style.setProperty('--esw-rail-bottom', String(Math.min(1, Math.max(0, below) / 48)))
}

// --esw-stuck runs 0 to 1 over the first scroll, so the bar's grey fades in both ways instead of switching.
export const STICKY_BAR = {
  '--esw-stuck': '0',
  '& > *': { pointerEvents: 'auto', position: 'relative' },
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    bgImage: 'linear-gradient(to bottom, {colors.ui.bg} 0%, {colors.ui.bg} 62%, transparent 100%)',
    opacity: 'var(--esw-stuck)',
  },
  '& [data-toolbar] :is(.chakra-button, input)': {
    boxShadow: '0 calc({spacing.1} * var(--esw-stuck)) calc({spacing.3.5} * var(--esw-stuck)) color-mix(in srgb, {colors.ui.shadowInk} calc(9% * var(--esw-stuck)), transparent)',
  },
}

// How far the page scrolls before the bar is fully lifted.
export const STUCK_RANGE = 48

// Stuck to the rail's edges, so a row fades out instead of being cut.
export const RAIL_FADE = { position: 'sticky', flexShrink: '0', h: '6', zIndex: '1', pointerEvents: 'none', opacity: '0', animationTimeline: 'scroll(nearest)', animationTimingFunction: 'linear', animationFillMode: 'both' }

export const MENU_CONTENT = {
  minW: '60',
  // A menu taller than the room left scrolls, so its last entry is never off screen.
  maxH: 'var(--available-height)',
  overflowY: 'auto',
  p: '2',
  bg: 'ui.menu',
  // A line and a deeper shadow: the soft blue alone sits flat on the grey page.
  borderWidth: 'ui.hair',
  borderColor: 'ui.border',
  boxShadow: 'lg',
  css: {
    // A menu that scrolls fades at the edge with more to see; the scroll timeline stays off on one that fits.
    '&::before, &::after': {
      content: '""',
      display: 'block',
      position: 'sticky',
      height: '6',
      zIndex: '1',
      pointerEvents: 'none',
      opacity: '0',
      animationTimeline: 'scroll(self)',
      animationTimingFunction: 'linear',
      animationFillMode: 'both',
    },
    '&::before': { top: '0', mb: '-6', animationName: 'eswFadeIn', bgImage: 'linear-gradient(to bottom, {colors.ui.menu}, transparent)' },
    '&::after': { bottom: '0', mt: '-6', animationName: 'eswFadeOut', bgImage: 'linear-gradient(to top, {colors.ui.menu}, transparent)' },
    '& [data-part=item]': { cursor: 'pointer', py: '2.5', px: '3', gap: '3', fontSize: 'ui.body', borderRadius: 'forge' },
    // Navy with white type under the pointer, as the side list marks its row.
    '& [data-part=item][data-highlighted]': { bg: 'ui.primary', color: 'white' },
    '& [data-part=item][data-danger][data-highlighted]': { bg: 'ui.bad', color: 'white' },
    // Greyed out where it would change nothing.
    '& [data-part=item][data-disabled]': { opacity: 0.4, cursor: 'default' },
    '& [data-part=item] svg': { width: '4', height: '4', flexShrink: 0 },
    '& [data-part=item-group-label]': { px: '3', pt: '2', pb: '1' },
    '& [data-part=separator]': { my: '2' },
  },
}

// Lucide, as the account portal and Chakra's own examples use them.
export const CopyGlyph = LuCopy

export const MoveGlyph = LuArrowRightLeft

export const RenameGlyph = LuPencil

export const TrashGlyph = LuTrash2

export const RestoreGlyph = LuArchiveRestore

export const AddGlyph = LuPlus

export const MoreGlyph = LuEllipsisVertical

export const UploadGlyph = LuUpload

export const FolderGlyph = LuFolder

// How many files of how many were kept. The verdict per file is the server's own
// sentence; only the tally is assembled here.
export function reportSummary(rows) {
  const stored = rows.filter((r) => r.ok).length
  return sprintf(
    // translators: 1: number of files stored, 2: number of files picked.
    _n('%1$d of %2$d file stored.', '%1$d of %2$d files stored.', rows.length, 'easy-svg'),
    stored,
    rows.length
  )
}

// Both the old bare array and { items, total, truncated } are accepted, so the client never depends on which arrives.
export function listOf(res) {
  return Array.isArray(res) ? res : (res && Array.isArray(res.items) ? res.items : [])
}

export function totalOf(res, fallback) {
  return res && 'number' === typeof res.total ? res.total : fallback
}

// One page of the library at a time: the whole list with every icon's markup is too heavy, and a cap would leave icons unreachable.
export const PAGE = 100

// Tiles on one page of the grid.
export const PER_PAGE = 60

// The rail's entry for the trash; the colon keeps it apart from every collection's id.
export const TRASH_VIEW = ':trash'

// As many ids as one restore or purge request takes, and as many icons as the trash lists at once.
export const TRASH_PAGE = 100

// Seconds since 1970 from the library, an ISO date from a provider.
export function whenTrashed(stamp) {
  const date = 'number' === typeof stamp ? new Date(stamp * 1000) : new Date(String(stamp || ''))
  if (!stamp || Number.isNaN(date.getTime())) {
    return ''
  }
  return date.toLocaleDateString(window.document.documentElement.lang || undefined, { dateStyle: 'medium' })
}

// "3 icons and 1 set", for the question before a final delete.
export function trashWords(icons, sets) {
  const a = icons ? sprintf(_n('%d icon', '%d icons', icons, 'easy-svg'), icons) : ''
  // translators: %d: number of icon sets.
  const b = sets ? sprintf(_n('%d set', '%d sets', sets, 'easy-svg'), sets) : ''
  // translators: 1: a number of icons, e.g. "3 icons". 2: a number of sets, e.g. "1 set".
  return a && b ? sprintf(__('%1$s and %2$s', 'easy-svg'), a, b) : a || b
}

// A phone three across, a tablet four; from lg the tile's width decides. The trash draws the same grid.
// auto-fill, not auto-fit: with three icons auto-fit would stretch them across the row.
export const GRID_COLUMNS = {
  base: 'repeat(3, minmax(0, 1fr))',
  sm: 'repeat(3, minmax(0, 1fr))',
  md: 'repeat(4, minmax(0, 1fr))',
  lg: 'repeat(auto-fill, minmax({sizes.ui.tile}, 1fr))',
}

// What a restore answered, in one line: how many are back, under which name, and how many are not.
export function restoredSaid(back) {
  const n = back.restored.length
  const renamed = back.restored.filter((r) => r.slug && r.wanted && r.slug !== r.wanted)
  const parts = []
  if (1 === n && renamed.length) {
    parts.push(
      sprintf(
        // translators: 1: the name the icon answers to now, 2: the name it had, which another icon took meanwhile.
        __('Icon restored as “%1$s”, because “%2$s” is taken now.', 'easy-svg'),
        renamed[0].slug,
        renamed[0].wanted
      )
    )
  } else if (n) {
    parts.push(
      1 === n
        ? __('Icon restored.', 'easy-svg')
        : // translators: %d: number of icons restored from the trash.
          sprintf(_n('%d icon restored.', '%d icons restored.', n, 'easy-svg'), n)
    )
    if (renamed.length) {
      parts.push(
        sprintf(
          // translators: %d: number of restored icons whose old name was taken.
          _n('%d has a new name, because the old one is taken now.', '%d have a new name, because the old one is taken now.', renamed.length, 'easy-svg'),
          renamed.length
        )
      )
    }
  }
  if (back.missed.length) {
    parts.push(
      sprintf(
        // translators: %d: number of icons that are still in the trash.
        _n('%d icon could not be restored. It is still in the trash.', '%d icons could not be restored. They are still in the trash.', back.missed.length, 'easy-svg'),
        back.missed.length
      )
    )
  }
  const gone = (back.gone || []).length
  if (gone) {
    parts.push(
      sprintf(
        // translators: %d: number of icons that were deleted from the trash before they could be restored.
        _n('%d icon was already deleted permanently.', '%d icons were already deleted permanently.', gone, 'easy-svg'),
        gone
      )
    )
  }
  return { message: parts.join(' ') || __('Done.', 'easy-svg'), failed: back.missed.length > 0 || gone > 0, undo: null }
}

// Why a provider refused, in words: a rejection may carry no message at all.
export const reasonOf = (e) => (e && 'string' === typeof e.message && e.message) || __('The change was not saved. Try again.', 'easy-svg')

export function libraryPath(term, offset = 0) {
  const q = new URLSearchParams({ offset: String(offset), limit: String(PAGE) })
  if (term) q.set('search', term)
  return `/library?${q}`
}

// An address another plugin hands in is followed only over https; anything else draws no link.
export function httpsOnly(url) {
  try {
    return 'https:' === new URL(String(url || '')).protocol ? String(url) : ''
  } catch {
    return ''
  }
}

// A retry after a timeout sends the id again, and the server answers with the first add instead of a name-2 copy.
export function newRequestId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

// The async clipboard first. Where it refuses (plain HTTP, a page that lost focus to a menu), the old copy command, which a click still allows.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Falls through to the copy command.
  }
  const back = document.activeElement
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  let done = false
  try {
    done = document.execCommand('copy')
  } catch {
    done = false
  }
  field.remove()
  back?.focus?.({ preventScroll: true })
  return done
}
