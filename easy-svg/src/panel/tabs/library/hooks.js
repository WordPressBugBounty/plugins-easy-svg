import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useBreakpointValue } from '@chakra-ui/react'
import { useBarCover } from '../../overlay-top.js'
import { useDropZone } from '../../../ui.jsx'
import { missingMarkup, withMarkup } from '../../lazy-markup.js'
import { latestOnly } from '../../load-guard.js'
import { appendUnique, binTotal } from '../../trash-bins.js'
import { detailIcon, pageWindow, shownIcons } from './library-logic.js'
import { TOAST_HOLD_MAX_MS, TOAST_MS, TOAST_RECHECK_MS, PANEL_ROOT, STUCK_RANGE, listOf, totalOf, PAGE, PER_PAGE, TRASH_VIEW, TRASH_PAGE, libraryPath } from './helpers.js'

export function useKeyHandler() {
  // Shortcuts never fire while typing in a field or while a dialog is open.
  const keys = useRef(null)
  useEffect(() => {
    const onKey = (e) => {
      keys.current?.(e)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return { keys }
}

export function useRailDrawer() {
  // Below lg the sets leave the grid's side for a drawer, opened from the toolbar.
  const railInline = useBreakpointValue({ base: false, lg: true }, { ssr: false })
  // A button per page does not fit a phone, so there the pager says where you are.
  const [railOpen, setRailOpen] = useState(false)
  const railButton = useRef(null)
  const railCover = useBarCover(railOpen)
  // Wide again, the drawer is gone: it must not reopen by itself on the next narrowing.
  useEffect(() => {
    if (railInline) {
      setRailOpen(false)
    }
  }, [railInline])
  return { railInline, railOpen, setRailOpen, railButton, railCover }
}

export function useStickyBar() {
  // How far the page has scrolled, as 0 to 1, written straight onto the bar
  // once a frame: a React render per scroll event would stutter.
  const stickyRef = useRef(null)
  useEffect(() => {
    let frame = 0
    const paint = () => {
      frame = 0
      const el = stickyRef.current
      if (el) {
        el.style.setProperty('--esw-stuck', String(Math.min(1, Math.max(0, window.scrollY / STUCK_RANGE))))
      }
    }
    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(paint)
      }
    }
    paint()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
    }
  }, [])
  return { stickyRef }
}

export function useRuleRename() {
  const [ruleRename, setRuleRename] = useState(null)
  const [rule, setRule] = useState({ find: '', replace: '', prefix: '', suffix: '' })
  const ruleRefs = ruleRename?.refs || null
  // A slow answer for an older rule may not replace the plan of the rule now typed.
  const askPreview = useRef(latestOnly()).current
  // The plan follows the rule as it is typed, a moment after the last key.
  useEffect(() => {
    const isLatest = askPreview()
    if (!ruleRefs) {
      return undefined
    }
    if (!rule.find && !rule.prefix && !rule.suffix) {
      setRuleRename((r) => (r ? { ...r, plan: null } : r))
      return undefined
    }
    const timer = window.setTimeout(async () => {
      try {
        const plan = await renamerRef.current?.renamePreview({ refs: ruleRefs, rule })
        if (isLatest()) {
          setRuleRename((r) => (r ? { ...r, plan: plan || [], error: '' } : r))
        }
      } catch (e) {
        if (isLatest()) {
          setRuleRename((r) => (r ? { ...r, error: e.message } : r))
        }
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [rule, ruleRefs, askPreview])
  const renamerRef = useRef(null)
  return { ruleRename, setRuleRename, rule, setRule, renamerRef }
}

export function useTileFlip({ activeDrag }) {
  // Where every tile stood before a drag took one out or put it back, so the
  // rest can glide into their new places instead of jumping.
  const flipFrom = useRef(null)
  const snapTiles = () => {
    const rects = new Map()
    document.querySelectorAll('[data-icon-grid] [data-icon-key]').forEach((el) => {
      rects.set(el.getAttribute('data-icon-key'), el.getBoundingClientRect())
    })
    return rects
  }
  useLayoutEffect(() => {
    const from = flipFrom.current
    flipFrom.current = null
    if (!from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    document.querySelectorAll('[data-icon-grid] [data-icon-key]').forEach((el) => {
      const was = from.get(el.getAttribute('data-icon-key'))
      const now = el.getBoundingClientRect()
      // A dragged tile is hidden, so its old rect is 0,0: it would fly in from the window's corner.
      if (!was?.width || !now.width || (was.left === now.left && was.top === now.top)) {
        return
      }
      el.style.transition = 'none'
      el.style.transform = `translate(${was.left - now.left}px, ${was.top - now.top}px)`
      el.getBoundingClientRect()
      el.style.transition = 'transform 220ms ease'
      el.style.transform = ''
    })
  }, [activeDrag])
  return { flipFrom, snapTiles }
}

export function useRailPick() {
  // Sets picked in the rail with Shift or Cmd/Ctrl, as the media library
  // picks files, to export or delete together; and where a Shift range starts.
  const [railPick, setRailPick] = useState(() => new Set())
  const railAnchor = useRef(null)
  const railModClick = useRef(false)
  const railPicked = railPick.size > 0
  useEffect(() => {
    if (!railPicked) {
      return undefined
    }
    const drop = (e) => {
      if ('Escape' === e.key) {
        setRailPick(new Set())
      }
    }
    document.addEventListener('keydown', drop)
    return () => document.removeEventListener('keydown', drop)
  }, [railPicked])
  return { railPick, setRailPick, railAnchor, railModClick }
}

export function useNewSetFocus({ icons, newSet }) {
  // Focused a frame after it appears: the menu that opened it hands focus
  // back to its own button as it closes, which would take it away again.
  const newSetInput = useRef(null)
  const newSetOpen = !!newSet
  // And again once the list has loaded: a link (`new-set=1`) opens the field
  // while the rail is still a skeleton, and the focus went to nothing.
  const listShown = null !== icons
  useEffect(() => {
    if (!newSetOpen) {
      return undefined
    }
    const timer = window.setTimeout(() => newSetInput.current?.focus(), 60)
    return () => window.clearTimeout(timer)
  }, [newSetOpen, listShown])
  return { newSetInput }
}

export function usePageAction() {
  // The page header's slot for its action (App.jsx), found once mounted.
  const [pageAction, setPageAction] = useState(null)
  useEffect(() => {
    setPageAction(document.getElementById('esw-page-action'))
  }, [])
  return { pageAction }
}

export function useTrashList({ api, bins, setPicked, setSelecting, setTrash, setTrashCount, trashCount, view }) {
  const trashTotal = trashCount + binTotal(bins)
  const askTrash = useRef(latestOnly()).current
  // Which row of the Trash view held the focus when an action began.
  const trashAt = useRef(-1)
  const loadTrash = async () => {
    const isLatest = askTrash()
    try {
      const res = await api.get(`/library/trash?limit=${TRASH_PAGE}`)
      if (isLatest()) {
        const items = listOf(res)
        setTrash({ items, total: totalOf(res, items.length) })
        setTrashCount(totalOf(res, items.length))
      }
    } catch (e) {
      if (isLatest()) {
        setTrash({ error: e.message })
      }
    }
  }
  const [trashMore, setTrashMore] = useState(false)
  // The Trash view's own pick: icon ids, and `bin:entry` for what a provider keeps. Edit mode itself is the grid's.
  const [trashPicked, setTrashPicked] = useState(() => new Set())
  const trashOpen = TRASH_VIEW === view
  // A pick made in one view means nothing in the other: into the trash and out of it, edit mode ends.
  const wasTrash = useRef(false)
  useEffect(() => {
    if (wasTrash.current !== trashOpen) {
      wasTrash.current = trashOpen
      setSelecting(false)
      setPicked(new Set())
      setTrashPicked(new Set())
    }
  }, [trashOpen, setSelecting, setPicked])
  return { trashTotal, askTrash, trashAt, loadTrash, trashMore, setTrashMore, trashPicked, setTrashPicked, trashOpen }
}

export function useMoreTrash({ api, askTrash, loadTrash, setErr, setTrash, setTrashMore, trash, view }) {
  const loadMoreTrash = async () => {
    const isLatest = askTrash()
    const from = (trash?.items || []).length
    setTrashMore(true)
    try {
      const res = await api.get(`/library/trash?limit=${TRASH_PAGE}&offset=${from}`)
      if (isLatest()) {
        setTrash((was) => {
          const items = appendUnique(was?.items || [], listOf(res))
          // A page that brought nothing new ends the list, whatever the count says.
          return { items, total: items.length > from ? Math.max(items.length, totalOf(res, items.length)) : items.length }
        })
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setTrashMore(false)
    }
  }
  useEffect(() => {
    if (TRASH_VIEW === view) {
      loadTrash()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])
  return { loadMoreTrash }
}

export function useToast({ moved, setMoved, setStatus, status }) {
  // One toast at a time, the newest: a fresh line replaces the other kind.
  useEffect(() => {
    if (status) {
      setMoved(null)
    }
  }, [status, setMoved])
  useEffect(() => {
    if (moved) {
      setStatus('')
    }
  }, [moved, setStatus])
  // Kept under the pointer or keyboard focus (WCAG 2.2.1); focus a removed tile handed over does not count, it held it for good.
  // Asked of the page when the time is up: a pointerleave or blur that never came (a drop, a removed button) held it for good.
  useEffect(() => {
    if (!moved && !status) {
      return undefined
    }
    let t
    const shown = Date.now()
    const leave = () => {
      const box = PANEL_ROOT.current?.querySelector('[data-library-toast]')
      if (box && Date.now() - shown < TOAST_HOLD_MAX_MS && (box.matches(':hover') || box.querySelector(':focus-visible'))) {
        t = window.setTimeout(leave, TOAST_RECHECK_MS)
        return
      }
      setMoved(null)
      setStatus('')
    }
    t = window.setTimeout(leave, TOAST_MS)
    return () => window.clearTimeout(t)
  }, [moved, status, setMoved, setStatus])
}

export function useLibrarySearch({ api, askList, ctx, query, setErr, setSearching, take }) {
  // The server searches, as one response is not the whole library; each keystroke replaces the request in flight.
  useEffect(() => {
    if (!ctx.iconsEnabled) return undefined
    const ac = new AbortController()
    const term = query.trim()
    const run = () => {
      setSearching(!!term)
      const isLatest = askList()
      api
        .get(libraryPath(term), { signal: ac.signal })
        .then((res) => {
          if (isLatest()) {
            take(res, !!term)
          }
          setSearching(false)
        })
        .catch((e) => {
          if ('AbortError' !== e.name) {
            setErr(e.message)
            setSearching(false)
          }
        })
    }
    // No wait for the first load, and a short one for typing.
    const timer = window.setTimeout(run, query === '' ? 0 : 250)
    return () => {
      window.clearTimeout(timer)
      ac.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.iconsEnabled, query])
}

export function useLoadMore({ api, icons, query, setErr, setIcons, setTotal }) {
  const all = icons || []
  // A change answers with as many icons as are on screen, so a page loaded
  // with Load more does not vanish after a rename (500 at most per answer).
  const keep = () => Math.min(500, Math.max(PAGE, (icons || []).length))
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const res = await api.get(libraryPath(query.trim(), all.length))
      const more = listOf(res)
      setIcons((prev) => {
        const seen = new Set((prev || []).map((ic) => ic.id))
        return [...(prev || []), ...more.filter((ic) => !seen.has(ic.id))]
      })
      setTotal(totalOf(res, all.length + more.length))
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoadingMore(false)
    }
  }
  // Select all needs the whole library, not the batches fetched so far: the rest comes now, a batch at a time.
  const loadRest = async (upTo) => {
    let list = [...all]
    let total = upTo
    setLoadingMore(true)
    try {
      while (list.length < total) {
        const res = await api.get(libraryPath(query.trim(), list.length))
        const more = listOf(res)
        const seen = new Set(list.map((ic) => ic.id))
        const fresh = more.filter((ic) => !seen.has(ic.id))
        total = totalOf(res, list.length + more.length)
        if (!fresh.length) {
          break
        }
        list = [...list, ...fresh]
      }
      setIcons(list)
      setTotal(total)
      return list
    } finally {
      setLoadingMore(false)
    }
  }
  return { all, keep, loadingMore, loadMore, loadRest }
}

export function useFileDrop({ addFiles, busy, ctx }) {
  // The grid takes drops too, as adding where you look is the obvious gesture.
  // Above the early return: a hook may not be skipped, and iconsEnabled flips the moment Settings saves.
  const grid = useDropZone({ onFiles: addFiles, disabled: busy || !ctx.svgUploads })
  // Files dropped anywhere on this page are added too: there is no "next to
  // the drop area" while the library is open. Registered before the panel's
  // own guard, which then sees the drop handled and says nothing.
  const addRef = useRef(addFiles)
  addRef.current = addFiles
  // Read at drop time: with the library off or a write running, the drop is
  // left to the panel's guard.
  const takesDrop = useRef(false)
  takesDrop.current = !!ctx.iconsEnabled && !!ctx.svgUploads && !busy
  useEffect(() => {
    const drop = (e) => {
      const files = e.dataTransfer?.files
      if (e.defaultPrevented || !takesDrop.current || !files || !files.length) {
        return
      }
      e.preventDefault()
      addRef.current(files)
    }
    window.addEventListener('drop', drop)
    return () => window.removeEventListener('drop', drop)
  }, [])
  return { grid }
}

export function useShownIcons({ collections, icons, landed, query, view }) {
  // Above the early return, as a hook may not be skipped. The server's answer is the list: it searched the whole library.
  // A collection's icons join as their own tiles, never selectable, renamed or deleted from here.
  const term = query.trim().toLowerCase()
  const collectionTiles = useMemo(
    () =>
      collections.flatMap((c) =>
        c.icons
          .filter((ic) => !term || `${ic.label || ''} ${ic.slug || ''} ${ic.ref || ''}`.toLowerCase().includes(term))
          .map((ic) => ({
            ...ic,
            id: ic.key || ic.ref,
            readonly: true,
            collection: c.id,
            source: c,
            canRename: !c.readonly && 'function' === typeof c.provider?.relabel,
            canRemove: !c.readonly && 'function' === typeof c.provider?.remove,
            canSwitch: !c.readonly && 'function' === typeof c.provider?.switchIcons,
          }))
      ),
    [collections, term]
  )
  const shown = useMemo(() => shownIcons({ view, icons, collectionTiles, landed }), [view, icons, collectionTiles, landed])
  return { collectionTiles, shown }
}

export function usePageItems({
  all, askedMarkup, busy, icons, loadMore, loadingMore, page, query, setCollections, setPage, shown, total, view,
}) {
  // Pages, so the grid never draws more than one page of tiles; library icons are fetched a batch at a time.
  const { libraryCount, extra, pageCount, onPage, needMore, pageItems } = pageWindow({ all, page, perPage: PER_PAGE, shown, total, view })
  useEffect(() => {
    if (needMore && !loadingMore && !busy && icons !== null) {
      loadMore()
    }
  })
  useEffect(() => {
    setPage(1)
  }, [view, query, setPage])
  // A collection listed by index has no drawings: ask for the tiles on screen.
  useEffect(() => {
    for (const [provider, refs] of missingMarkup(pageItems, askedMarkup.current)) {
      refs.forEach((ref) => askedMarkup.current.add(ref))
      Promise.resolve(provider.markup({ refs }))
        .then((got) => setCollections((list) => withMarkup(list, got || {})))
        .catch(() => {})
    }
  })
  return { libraryCount, extra, pageCount, onPage, needMore, pageItems }
}

export function useDetailIcon({ collectionTiles, details, icons }) {
  // Looked up fresh among every icon, so a rename shows at once and a moved icon stays open at its new address.
  const detailOpen = !!details
  const detailPool = useMemo(() => (detailOpen ? [...(icons || []), ...collectionTiles] : []), [detailOpen, icons, collectionTiles])
  // While a moved icon's new set is still loading the old one is gone: the window keeps it, so it neither closes nor reopens.
  const detailSeen = useRef(null)
  const { found, icon: detailIc } = detailIcon({ details, pool: detailPool, seen: detailSeen.current })
  if (found) {
    detailSeen.current = found
  }
  const detailCover = useBarCover(!!detailIc)
  return { detailIc, detailCover }
}
