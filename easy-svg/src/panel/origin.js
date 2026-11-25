// Where a provider's collection comes from: Pro sends origin { kind, name, over, made } and can_edit.
import { LuCircleHelp, LuCode, LuFolder, LuFolderCode, LuLock, LuNetwork, LuPackage, LuPalette, LuPlug, LuPlugZap } from 'react-icons/lu'
import { __, sprintf } from '@wordpress/i18n'

const GLYPHS = {
  set: LuFolder,
  network: LuNetwork,
  theme: LuPalette,
  plugin: LuPlug,
  'mu-plugin': LuPlugZap,
  dropin: LuPackage,
  folder: LuFolderCode,
  code: LuCode,
}
// A kind this panel does not know yet, or none at all.
const UNKNOWN_GLYPH = LuCircleHelp
export const LockGlyph = LuLock

export function originGlyph(origin) {
  return GLYPHS[origin?.kind] || UNKNOWN_GLYPH
}

// Only the server's own verdict locks: a provider without can_edit keeps its readonly as before.
export const isLocked = (c) => false === c?.can_edit

// The origin in words, "From theme: Twenty Twenty-Five"; a nameless source falls back to the collection's label.
export function originLine(origin, label = '') {
  const name = origin?.name || label
  switch (origin?.kind) {
    case 'set':
      return 'preset' === origin.made
        ? __('Set made from a preset', 'easy-svg')
        : String(origin.made || '').startsWith('import')
          ? __('Imported set', 'easy-svg')
          : __('Own set', 'easy-svg')
    case 'network':
      // translators: %s: name of the network set.
      return sprintf(__('From the network: %s', 'easy-svg'), name)
    case 'theme':
      // translators: %s: name of the theme.
      return sprintf(__('From theme: %s', 'easy-svg'), name)
    case 'plugin':
      // translators: %s: name of the plugin.
      return sprintf(__('From plugin: %s', 'easy-svg'), name)
    case 'mu-plugin':
      // translators: %s: name of the must-use plugin.
      return sprintf(__('From must-use plugin: %s', 'easy-svg'), name)
    case 'dropin':
      // translators: %s: name of the drop-in.
      return sprintf(__('From drop-in: %s', 'easy-svg'), name)
    case 'folder':
      // translators: %s: name of the folder.
      return sprintf(__('From folder: %s', 'easy-svg'), name)
    case 'code':
      // translators: %s: name the collection was registered with.
      return sprintf(__('Registered in code: %s', 'easy-svg'), name)
    default:
      return __('Origin unknown', 'easy-svg')
  }
}

export const readOnlyWord = () => __('Read only', 'easy-svg')

// The status beside an icon's details: who holds it, in two words.
export function lockedBy(origin) {
  switch (origin?.kind) {
    case 'plugin':
    case 'mu-plugin':
    case 'dropin':
      return __('Locked by plugin', 'easy-svg')
    case 'theme':
      return __('Locked by theme', 'easy-svg')
    case 'network':
      return __('Locked by network', 'easy-svg')
    default:
      return readOnlyWord()
  }
}
