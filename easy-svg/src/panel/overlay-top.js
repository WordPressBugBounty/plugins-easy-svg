import { useLayoutEffect, useState } from 'react'

// How much of the window wp-admin's bar covers now. On a phone it scrolls with
// the page, so an overlay opened at the top would start under it.
function barCover() {
  return Math.max(0, Math.round(document.getElementById('wpadminbar')?.getBoundingClientRect().bottom || 0))
}

// Measured as an overlay opens (it holds the page's scroll still) and again on
// a resize or a turn of the phone while it is open.
export function useBarCover(open) {
  const [cover, setCover] = useState(0)
  useLayoutEffect(() => {
    if (!open) {
      return undefined
    }
    const measure = () => setCover(barCover())
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])
  return { '--esw-bar-cover': `${cover}px` }
}

// An overlay's top: below the fixed bar, or below what is left of a scrolling one.
export const OVERLAY_TOP = 'max(var(--esw-admin-bar, 0px), var(--esw-bar-cover, 0px))'
