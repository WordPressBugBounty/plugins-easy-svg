import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]'
const TEXT_INPUT = /^(text|search|email|url|number|password)$/

function focusables(tile) {
  return Array.from(tile.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.disabled && !el.closest('[hidden]') && el.getAttribute('aria-hidden') !== 'true'
  )
}

// One tile in the tab order and arrows between them: four stops per icon made 500 icons some 2,000 Tab presses (WCAG 2.4.1).
export function useRovingTiles(attr = 'data-icon-key') {
  const ref = useRef(null)
  const active = useRef(0)

  const tiles = () => (ref.current ? Array.from(ref.current.querySelectorAll(`:scope > [${attr}]`)) : [])

  const apply = () => {
    const all = tiles()
    if (!all.length) return
    active.current = Math.min(active.current, all.length - 1)
    all.forEach((tile, i) => {
      for (const el of focusables(tile)) {
        if (i === active.current) {
          if (el.hasAttribute('data-roving')) {
            const orig = el.getAttribute('data-roving')
            if (orig === '') el.removeAttribute('tabindex')
            else el.setAttribute('tabindex', orig)
            el.removeAttribute('data-roving')
          }
        } else if (!el.hasAttribute('data-roving')) {
          el.setAttribute('data-roving', el.getAttribute('tabindex') ?? '')
          el.setAttribute('tabindex', '-1')
        }
      }
    })
  }

  useEffect(() => {
    const grid = ref.current
    if (!grid) return undefined
    apply()

    const tileOf = (el) => {
      const tile = el && el.closest ? el.closest(`[${attr}]`) : null
      return tile && tile.parentElement === grid ? tile : null
    }

    const onFocusIn = (e) => {
      const tile = tileOf(e.target)
      if (!tile) return
      const i = tiles().indexOf(tile)
      if (i !== -1 && i !== active.current) {
        active.current = i
        apply()
      }
    }

    const columns = (all) => {
      const top = Math.round(all[0].getBoundingClientRect().top)
      let n = 1
      while (n < all.length && Math.round(all[n].getBoundingClientRect().top) === top) n++
      return n
    }

    // Capture: a menu trigger would otherwise take ArrowDown for itself.
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target
      if (t && t.tagName === 'INPUT' && TEXT_INPUT.test(t.type || 'text')) return
      const tile = tileOf(t)
      if (!tile) return
      const all = tiles()
      const from = all.indexOf(tile)
      const cols = columns(all)
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key]
      let to = null
      if (step !== undefined) to = from + step
      else if (e.key === 'Home') to = 0
      else if (e.key === 'End') to = all.length - 1
      if (to === null || to < 0 || to >= all.length || to === from) return
      e.preventDefault()
      e.stopPropagation()
      const pos = focusables(tile).indexOf(t)
      active.current = to
      apply()
      const next = focusables(all[to])
      ;(next[Math.max(0, pos)] || next[0])?.focus()
    }

    // New or removed tiles join the scheme as they render.
    const observer = new window.MutationObserver(apply)
    observer.observe(grid, { childList: true, subtree: true })
    grid.addEventListener('focusin', onFocusIn)
    grid.addEventListener('keydown', onKey, true)
    return () => {
      observer.disconnect()
      grid.removeEventListener('focusin', onFocusIn)
      grid.removeEventListener('keydown', onKey, true)
    }
  })

  return {
    ref,
    indexOf: (el) => {
      const tile = el && el.closest ? el.closest(`[${attr}]`) : null
      return tile ? tiles().indexOf(tile) : -1
    },
    tileAt: (index) => {
      const all = tiles()
      if (!all.length || index < 0) return null
      const tile = all[Math.min(index, all.length - 1)]
      active.current = Math.min(index, all.length - 1)
      apply()
      return focusables(tile)[0] || null
    },
  }
}

/** The element that had focus, if it is still on the page; else the fallback. */
export function stillThere(el, fallback = null) {
  return el && el.isConnected ? el : fallback
}
