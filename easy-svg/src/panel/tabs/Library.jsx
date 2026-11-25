import { useEffect, useMemo, useRef, useState } from 'react'
import { useRovingTiles, stillThere } from '../focus.js'
import { createListCollection, IconButton, Portal, Stack } from '@chakra-ui/react'
import { TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortIdOf } from '../rail-sort.jsx'
import { useBarCover } from '../overlay-top.js'
import { LuLayoutGrid, LuLibrary } from 'react-icons/lu'
import { __, _x, sprintf } from '@wordpress/i18n'
import { SkeletonRows, SearchField } from '../../ui.jsx'
import { Notice, ReportList } from '../parts.jsx'
import { makeApi } from '../api.js'
import { getRegistry } from '../registry.js'
import { railEntries, railNeighbours } from '../rail-rows.js'
import { indexOrLoad, latestOnly, settleCollections } from '../load-guard.js'
import { loadBins } from '../trash-bins.js'
import {
  nameOf,
  refOf,
  FILE_ACCEPT,
  POINTER_DRAG,
  TOUCH_DRAG,
  NoTouchPointerSensor,
  TrashGlyph,
  AddGlyph,
  reportSummary,
  listOf,
  totalOf,
  TRASH_VIEW,
  httpsOnly,
  newRequestId,
  reasonOf,
} from './library/helpers.js'
import { Tip } from './library/widgets.jsx'
import { entryOf } from './library/RailRow.jsx'
import { allPickedIn, emptyHere as isEmptyHere, everyIcon } from './library/library-logic.js'
import { LibraryOff } from './library/LibraryOff.jsx'
import {
  deleteDialogView,
  uploadSurfaceView,
  ruleRenameDialogView,
  pasteDialogView,
  pagerView,
  messagesView,
} from './library/dialogs.jsx'
import { detailsDialogView } from './library/DetailsDialog.jsx'
import {
  exportDialogView,
  newSetRowView,
  renameSetDialogView,
  deleteSetDialogView,
  importSetDialogView,
} from './library/setDialogs.jsx'
import { moveDialogView } from './library/MoveDialog.jsx'
import { sidebarView, railDrawerView } from './library/Rail.jsx'
import { railMenusView } from './library/railMenus.jsx'
import { templatesDialogView, toolsView, toolDrawerView } from './library/tools.jsx'
import { toolbarView } from './library/Toolbar.jsx'
import { trashHeadView, trashBodyView } from './library/TrashView.jsx'
import { libraryLayoutView } from './library/layout.jsx'
import { trashActions } from './library/trashActions.js'
import { collectionActions } from './library/collectionActions.js'
import { editActions } from './library/editActions.js'
import { addActions, fileAdder } from './library/addActions.js'
import {
  useDetailIcon,
  usePageItems,
  useShownIcons,
  useFileDrop,
  useLoadMore,
  useLibrarySearch,
  usePageAction,
  useNewSetFocus,
  useRailPick,
  useTileFlip,
  useRuleRename,
  useStickyBar,
  useRailDrawer,
  useKeyHandler,
  useToast,
  useMoreTrash,
  useTrashList,
} from './library/hooks.js'
import { railActions } from './library/railActions.js'
import { keyShortcuts } from './library/keyShortcuts.js'

export default function Library({ ctx }) {
  const api = makeApi(ctx)
  const accountUrl = httpsOnly(ctx.accountUrl)
  const [icons, setIcons] = useState(null)
  const [total, setTotal] = useState(0)
  const [libraryTotal, setLibraryTotal] = useState(0)
  const [err, setErr] = useState('')
  const [status, setStatus] = useState('')
  // Spoken after a set moves; the visible status stays the provider's word.
  const [orderSaid, setOrderSaid] = useState('')
  // Order saves run one after another, so the last move is the order saved last.
  const orderChain = useRef(Promise.resolve())
  const orderSeq = useRef(0)
  // The order last known saved: a refusal goes back to it, not to a move still unsaved.
  const orderSaved = useRef(null)
  // The file picker keeps what it accepted and refuses the same file again
  // without a word; a new key after each batch gives it an empty hand.
  const [pickRound, setPickRound] = useState(0)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  // The term as typed now, for a list read again after an await.
  const queryRef = useRef(query)
  queryRef.current = query
  // The search and a list read after a copy ask the same question; only the newest answer lands.
  const askList = useRef(latestOnly()).current
  const [searching, setSearching] = useState(false)
  const [report, setReport] = useState(null)
  const [pasting, setPasting] = useState(false)
  const [label, setLabel] = useState('')
  const [markup, setMarkup] = useState('')
  // One request_id per add, kept until that add worked.
  const addIds = useRef(new Map())
  const addIdFor = (key) => {
    if (!addIds.current.has(key)) {
      addIds.current.set(key, newRequestId())
    }
    return addIds.current.get(key)
  }
  const [picked, setPicked] = useState(() => new Set())
  // Select mode: ticks on the tiles, and a click picks instead of opening the menu.
  const [selecting, setSelecting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const { keys } = useKeyHandler()
  // Taking the last tick off ends edit mode; switching it on with none picked
  // does not.
  const hadPicks = useRef(false)
  useEffect(() => {
    if (picked.size) {
      hadPicks.current = true
    } else if (hadPicks.current) {
      hadPicks.current = false
      setSelecting(false)
    }
  }, [picked])
  const [dropOver, setDropOver] = useState(null)
  // Icons are dragged with dnd-kit: a picture follows the pointer, and a
  // press only becomes a drag after a few pixels, so a click stays a click.
  const sensors = useSensors(
    useSensor(NoTouchPointerSensor, POINTER_DRAG),
    useSensor(TouchSensor, TOUCH_DRAG)
  )
  const { railInline, railOpen, setRailOpen, railButton, railCover } = useRailDrawer()
  const [activeDrag, setActiveDrag] = useState(null)
  // `add=1` is where Media's Add icon leads: the add area is open on arrival.
  const [uploadOpen, setUploadOpen] = useState(
    () => typeof window !== 'undefined' && '1' === new URLSearchParams(window.location.search).get('add')
  )
  const { stickyRef } = useStickyBar()
  const { ruleRename, setRuleRename, rule, setRule, renamerRef } = useRuleRename()
  const [progress, setProgress] = useState(null)
  // A long batch, which otherwise shows nothing while it runs: { verb, done, total }.
  const [working, setWorking] = useState(null)
  // A round that all went in says so in one green line; only refusals list.
  useEffect(() => {
    if (report && report.length && report.every((r) => r.ok)) {
      setMoved({ message: reportSummary(report), undo: null })
      setReport(null)
    }
  }, [report])
  const { flipFrom, snapTiles } = useTileFlip({ activeDrag })
  // A set being exported: { collection, mode, hours, url, error }.
  const [exporting, setExporting] = useState(null)
  const [newSet, setNewSet] = useState(null)
  const [railQuery, setRailQuery] = useState('')
  const { railPick, setRailPick, railAnchor, railModClick } = useRailPick()
  const [railFind, setRailFind] = useState(false)
  const { newSetInput } = useNewSetFocus({ icons, newSet })
  const [renaming, setRenaming] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [importing, setImporting] = useState(null)
  // The icon whose details are open: { id, focus } where focus may be 'name'.
  const [details, setDetails] = useState(null)
  // The icon the details showed last, kept while the dialog animates out.
  const lastDetail = useRef(null)
  const [draftName, setDraftName] = useState('')
  // A move being aimed: { refs, copies, from, copy }; with copy the chosen set gets a copy.
  const [moving, setMoving] = useState(null)
  const [moveTarget, setMoveTarget] = useState('')
  const [moveQuery, setMoveQuery] = useState('')
  const [moveNaming, setMoveNaming] = useState(null)
  // The last sets moved to, newest first; a convenience of this browser only.
  const [recentSets, setRecentSets] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('easy-svg:recent-sets') || '[]').slice(0, 3)
    } catch {
      return []
    }
  })
  const [page, setPage] = useState(1)
  const { pageAction } = usePageAction()
  // Every delete takes a second click: { id } for one tile, { bulk: true } for the
  // selection bar, { purge } for what leaves the trash for good.
  const [confirming, setConfirming] = useState(null)
  const tiles = useRovingTiles()
  // Where focus goes back to after a dialog or a removal: the control that
  // started it, or the tile now in its place when that control is gone.
  const returnTo = useRef({ el: null, index: -1 })
  const remember = () => {
    const el = document.activeElement
    returnTo.current = { el, index: tiles.indexOf(el) }
  }
  // Never nothing: a dialog that closes calls focus() on what this returns.
  const giveBack = () =>
    stillThere(returnTo.current.el) || tiles.tileAt(returnTo.current.index) || document.querySelector('[data-tile-open]') || document.body
  // After a state update has rendered: the element may only exist then.
  const focusSoon = (find) => requestAnimationFrame(() => find()?.focus())
  // After a copy: only when focus went nowhere, its bar or dialog gone; never away from where it was put.
  const focusIfLost = () =>
    requestAnimationFrame(() => {
      const now = document.activeElement
      if (!now || now === document.body || !now.isConnected) {
        giveBack()?.focus()
      }
    })
  const [copyHelp, setCopyHelp] = useState('')
  const fileRef = useRef(null)
  // An add-on's collections (contract 3), and which of them the grid shows:
  // 'all', 'library' or a collection id.
  const [collections, setCollections] = useState([])
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const templatesContent = useRef(null)
  // A link can open the grid on one collection (`collection=`) or with a new
  // set being named (`new-set=1`): where the Sets tab and the set list lead.
  const linked = useRef(
    typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search)
  )
  const [pickedView, setView] = useState('all')
  const [providers, setProviders] = useState([])
  // How many providers failed to answer: a missing part is said, not shown as a smaller library.
  const [collectionsFailed, setCollectionsFailed] = useState(0)
  // With no collections provider "All icons" is the library again: one entry.
  const view = 'all' === pickedView && 0 === providers.length ? 'library' : pickedView
  const [moved, setMoved] = useState(null)
  // How many library icons lie in the trash (every library answer says so), the list once
  // its view is open, and what each provider keeps in a trash of its own.
  const [trashCount, setTrashCount] = useState(0)
  const [trash, setTrash] = useState(null)
  const [bins, setBins] = useState([])
  const {
    trashTotal, askTrash, trashAt, loadTrash, trashMore, setTrashMore, trashPicked, setTrashPicked, trashOpen,
  } = useTrashList({
    api, bins, setPicked, setSelecting, setTrash, setTrashCount, trashCount, view,
  })
  // With the icon manager off nothing of the trash is asked for: a provider's route answers 403 there.
  const iconsOn = useRef(false)
  const iconsWere = useRef(!!ctx.iconsEnabled)
  iconsOn.current = !!ctx.iconsEnabled
  useEffect(() => {
    if (iconsWere.current !== !!ctx.iconsEnabled) {
      iconsWere.current = !!ctx.iconsEnabled
      reloadCollections.current()
    }
  }, [ctx.iconsEnabled])
  const { loadMoreTrash } = useMoreTrash({ api, askTrash, loadTrash, setErr, setTrash, setTrashMore, trash, view })
  useToast({ moved, setMoved, setStatus, status })
  const reloadCollections = useRef(() => {})
  const askedMarkup = useRef(new Set())
  // The link waits for what it names: an add-on registers its collections
  // after the panel's first load. A collection that never comes leaves the
  // grid on All icons, and a click of the person's own ends the wait.
  useEffect(() => {
    const wanted = linked.current.get('collection')
    if (wanted && collections.some((c) => c.id === wanted)) {
      linked.current.delete('collection')
      setView(wanted)
    }
    if ('1' === linked.current.get('new-set') && providers.some((p) => 'function' === typeof p.create)) {
      linked.current.delete('new-set')
      setNewSet({ name: '' })
    }
  }, [collections, providers])

  function choose(id) {
    linked.current.delete('collection')
    setView(id)
  }

  useEffect(() => {
    const reg = getRegistry()
    if (!reg || typeof reg.collectionProviders !== 'function') {
      return undefined
    }
    let ac = null
    const load = () => {
      ac?.abort()
      ac = new AbortController()
      const signal = ac.signal
      setProviders(reg.collectionProviders())
      askedMarkup.current = new Set()
      settleCollections(reg.collectionProviders(), (p) => indexOrLoad(p, signal)).then(({ collections: loaded, failed }) => {
        if (!signal.aborted) {
          setCollections(loaded)
          setCollectionsFailed(failed)
          // Only a fresh list ends this: lazy markup also changes the list, and would bring the tile back.
          setLanded((was) => (was.size ? new Set() : was))
        }
      })
      // Read with the collections: whatever changed a set may have changed what its provider keeps in the trash.
      // Returned, so a caller that moves focus into the trash can wait until the new rows are there.
      return loadBins(iconsOn.current ? reg.collectionProviders() : [], signal).then((list) => {
        if (!signal.aborted) {
          setBins(list)
        }
      })
    }
    reloadCollections.current = load
    load()
    const off = reg.subscribe(load)
    return () => {
      off()
      ac?.abort()
    }
  }, [])

  // One place unwraps a library response, so a route that still answers the old
  // bare array keeps working and the total only has to be read once.
  const take = (res, filtered = false) => {
    const list = listOf(res)
    setIcons(list)
    setTotal(totalOf(res, list.length))
    // A search answer lists only the matches, so the library's size comes from the other routes.
    if (!filtered) {
      setLibraryTotal(totalOf(res, list.length))
    }
    if (res && 'number' === typeof res.trash_total) {
      setTrashCount(res.trash_total)
    }
    // A selection may not outlive the list it was made in: after Select all and a search, off-screen ids would stay picked,
    // the bar would still count them, and Remove would delete what nobody can see.
    setPicked((prev) => {
      if (0 === prev.size) {
        return prev
      }
      const live = new Set(list.map((ic) => ic.id))
      const next = new Set()
      prev.forEach((id) => {
        if (live.has(id)) {
          next.add(id)
        }
      })
      return next.size === prev.size ? prev : next
    })
  }

  // The paste form renders below the fold with nothing focused, so a click looks dead; focus pulls it into view.
  useEffect(() => {
    if (!pasting) {
      return
    }
    const el = document.getElementById('esw-icon-name')
    if (el) {
      el.focus()
      el.scrollIntoView({ block: 'center' })
    }
  }, [pasting])

  // SVG code pasted anywhere in the library (not into a field) opens the paste form with it filled in.
  useEffect(() => {
    const onPaste = (e) => {
      const t = e.target
      if (!ctx.svgUploads || busy || pasting || (t && (t.closest?.('input, textarea, [contenteditable="true"]')))) {
        return
      }
      const code = (e.clipboardData?.getData('text/plain') || '').trim()
      if (!/^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(code)) {
        return
      }
      e.preventDefault()
      setMarkup(code)
      setPasting(true)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [busy, pasting, ctx.svgUploads])

  useLibrarySearch({ api, askList, ctx, query, setErr, setSearching, take })

  const { all, keep, loadingMore, loadMore, loadRest } = useLoadMore({ api, icons, query, setErr, setIcons, setTotal })

  const { grid } = useFileDrop({ addFiles, busy, ctx })

  // Built when the collections or the term change, not on every render: a set can hold thousands of icons.
  // Icons dropped on a set leave this one at once: the list that says so comes a moment later.
  const [landed, setLanded] = useState(() => new Set())
  const droppedOnSet = useRef(false)
  const { collectionTiles, shown } = useShownIcons({ collections, icons, landed, query, view })
  const { libraryCount, extra, pageCount, onPage, needMore, pageItems } = usePageItems({
    all, askedMarkup, busy, icons, loadMore, loadingMore, page, query, setCollections, setPage, shown, total, view,
  })
  // Removing reaches the library's and a writable set's icons, never a folder's.
  // Names carried twice in this view also show their slug, as the media library does.
  // A copy in another set has the same slug too: a second line would say nothing, so it has none.
  const own = pageItems
  // Where a tile may go: a collection that is not read only, of a provider
  // that takes moves.
  const targets = collections.filter((c) => !c.readonly && c.provider && 'function' === typeof c.provider.move)
  const { detailIc, detailCover } = useDetailIcon({ collectionTiles, details, icons })
  // The open tool, looked up once: its drawer and its cover of the bar.
  const toolList = ctx.tools || []
  const openTool = toolList.find((t) => t.id === ctx.tool)
  const toolCover = useBarCover(!!openTool)

  // The heading counts what the list beside it shows, so the two numbers never disagree.
  const allCount = libraryTotal + collections.reduce((n, c) => n + c.icons.length, 0)
  const exporter = providers.find((p) => 'function' === typeof p.exportIcons)
  const pickedTiles = shown.filter((ic) => picked.has(ic.id))

  // Offered once to the add-on's Bulk and Styles tabs; session only, and nothing but icon addresses.
  const pickedRefs = pickedTiles.map(refOf).join('\n')
  useEffect(() => {
    try {
      if (pickedRefs) {
        window.sessionStorage.setItem('easy-svg:selection', JSON.stringify(pickedRefs.split('\n')))
      } else {
        window.sessionStorage.removeItem('easy-svg:selection')
      }
    } catch {
      // Storage refused (private mode): the other tabs simply start empty.
    }
  }, [pickedRefs])
  const pickedLibrary = pickedTiles.filter((ic) => !ic.readonly).map((ic) => ic.id)
  const exportTooMany = exporter && Number.isFinite(exporter.exportMax) && pickedTiles.length > exporter.exportMax

  // Picked set icons leave their sets; a folder's or theme's stay where they are.
  const removable = pickedTiles.filter((ic) => ic.canRemove)
  const removing = pickedLibrary.length + removable.length

  const creator = providers.find((p) => 'function' === typeof p.create)
  // Rename by a rule (Pro, with Bulk on): find and replace, put in front or
  // behind, shown as old and new before anything is saved.
  const renamer = providers.find((p) => 'function' === typeof p.renamePreview)
  renamerRef.current = renamer
  // Where a provider's collections would be, it says which feature is off
  // and how to switch it on.
  const hints = providers.filter((p) => p.hint && p.hint.text)
  const toastUndo = !err && !!moved?.undo
  const toastTrash = !err && !!moved?.openTrash && TRASH_VIEW !== view

  // The set on screen, when it takes files: then an upload goes there.
  const intoSet = collections.find((c) => c.id === view && !c.readonly && 'function' === typeof c.provider?.add) || null
  // An empty set or library has nothing to show but the way to fill it.
  const emptyHere = isEmptyHere({ shown, query, searching, intoSet, view })
  // A set that imports bundles takes a ZIP too, in every chooser and drop.
  const acceptFiles = intoSet && 'function' === typeof intoSet.provider.importFile ? `${FILE_ACCEPT},.zip,application/zip` : FILE_ACCEPT

  // Every id of the view, every page of it, not a size comparison: a count can read "all" while the
  // picked ids belong to a list that is no longer on screen.
  const allPicked = allPickedIn({ shown, picked, viewTotal: libraryCount + extra.length })
  // Select all takes the whole view; library icons not fetched yet are fetched first.
  async function pickEvery() {
    let fetched = null
    if (libraryCount > all.length) {
      setBusy(true)
      try {
        fetched = await loadRest(libraryCount)
      } catch (e) {
        setErr(reasonOf(e))
        return
      } finally {
        setBusy(false)
      }
    }
    setPicked(new Set(everyIcon({ shown, loaded: all.length, fetched }).map((ic) => ic.id)))
  }

  // Above the early returns: the rail's rows, kept per set so a click or a search draws none of them again.
  const railCache = useRef(new WeakMap())
  const setRows = useMemo(() => railEntries(collections, railCache.current, entryOf), [collections])
  // What a memoised row calls when it is used: read then, so it is never a render behind.
  const railAct = useRef(null)
  const sortKept = useRef([])

  // Every control on this screen depends on the Icon-library toggle, so nothing
  // is revealed while the feature is off; point back to Settings instead.
  if (!ctx.iconsEnabled) {
    return <LibraryOff ctx={ctx} />
  }

  const clear = () => {
    setErr('')
    setStatus('')
    setCopyHelp('')
  }

  function onPick(e) {
    addFiles(e.target.files)
    // So picking the same file twice in a row still fires a change event.
    e.target.value = ''
  }

  // What the Trash view lists and what of it is picked: icons by id, a provider's entries by bin and id.
  const trashItems = trash?.items || []
  const trashEntries = bins.flatMap((bin) => bin.entries.map((entry) => ({ key: `${bin.id}:${entry.id}`, bin, entry })))
  const trashKeys = [...trashItems.map((ic) => ic.id), ...trashEntries.map((row) => row.key)]
  const pickedIcons = trashItems.filter((ic) => trashPicked.has(ic.id))
  const pickedEntries = trashEntries.filter((row) => trashPicked.has(row.key))

  const { remove, markTrashRow, openTrash, restoreTrashed, restorePicked, restoreEntry, confirmPurge } = trashActions({
    api, bins, choose, clear, confirming, ctx, focusSoon, keep, loadTrash, pickedEntries, pickedIcons,
    reloadCollections, setBusy, setConfirming, setErr, setMoved, setPicked, setSelecting, setStatus,
    setTrashPicked, take, trashAt, view,
  })
  const pasteLabel = __('Paste SVG code', 'easy-svg')

  const fileInput = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={acceptFiles}
        multiple
        hidden
        tabIndex={-1}
        onChange={onPick}
      />
    </>
  )

  // What the dialog is about to delete: a tile's one icon, or the selection.
  const confirmIds = confirming ? (confirming.bulk ? pickedLibrary : [confirming.id]) : []
  const purging = confirming?.purge || null
  const confirmName = purging
    ? purging.item?.label || purging.item?.slug || ''
    : confirming && !confirming.bulk
      ? nameOf(confirming.setIcon || all.find((ic) => ic.id === confirming.id) || { slug: '' })
      : ''
  // How many library icons the delete reaches: they go to the trash, or for good where the site keeps none.
  const confirmLibrary = confirming && !purging && !confirming.setIcon ? confirmIds.length : 0
  const {
    moveTo, copierOf, copyTargetsOf, copyTo, removePicked, confirmRemove, exportPicked, act, openRuleRename,
    applyRuleRename, runHint, trashCollection, undoMove,
  } = collectionActions({
    api, askList, busy, collectionTiles, collections, confirmIds, confirming, ctx, exportTooMany, exporter,
    focusSoon, giveBack, moved, pickedLibrary, pickedTiles, query, queryRef, reloadCollections, remember,
    removable, remove, renamer, rule, ruleRename, setBusy, setConfirming, setErr, setMoved, setPicked, setRule,
    setRuleRename, setStatus, setView, setWorking, take, view,
  })
  const {
    openDetails, closeDetails, openMove, confirmMove, switchIcons, removeIcon, toggleAll, togglePicked, rename,
    copyCall,
  } = editActions({
    act, allPicked, api, clear, copyTargetsOf, copyTo, ctx, keep, moveTarget, moveTo, moving, pickEvery, recentSets,
    reloadCollections, remember, setBusy, setConfirming, setCopyHelp, setDetails, setDraftName, setErr,
    setMoveNaming, setMoveQuery, setMoveTarget, setMoved, setMoving, setPicked, setRecentSets, setStatus, shown,
    take, targets,
  })
  // A declaration, hoisted as the handler was: the drop zone above the early return takes it before fileAdder runs.
  function addFiles(fileList) {
    return addFilesNow(fileList)
  }
  const { addFiles: addFilesNow } = fileAdder({
    act, addIdFor, addIds, api, clear, intoSet, keep, setBusy, setMoved, setPickRound, setProgress, setReport,
    setUploadOpen, take,
  })
  const { addFromMedia, addPasted } = addActions({
    act, addIdFor, addIds, api, clear, fileRef, intoSet, keep, label, markup, setBusy, setErr, setLabel, setMarkup,
    setPasting, setProgress, setReport, setStatus, setUploadOpen, take,
  })
  const deleteDialog = deleteDialogView({
    bins, busy, confirmLibrary, confirmName, confirmPurge, confirmRemove, confirming, ctx, giveBack, purging,
    removing, setConfirming, trashCount, trashTotal,
  })

  // Said before a file is picked, not after: the server refuses every one of them on this network.
  const noSvgNotice = ctx.svgUploads ? null : (
    <Notice data-no-svg-uploads status="warning" role="status">
      {__('SVG uploads are switched off on this network. A network administrator can switch them on under Network Admin, Settings, Upload file types.', 'easy-svg')}
    </Notice>
  )
  const uploadSurface = noSvgNotice || uploadSurfaceView({
    acceptFiles, addFiles, addFromMedia, busy, pasteLabel, pickRound, setPasting,
  })

  // The page's one primary action, beside its title the way "Add New Media
  // File" sits beside "Media Library": a plain plus that opens the add area.
  // Pasted SVG code opens the paste form on its own; new sets live in the rail.
  const addMenu = (
    <Tip label={__('Add icon', 'easy-svg')}>
      <IconButton
        data-add-icon
        variant="solid"
        colorPalette="brand"
        disabled={busy || !ctx.svgUploads}
        aria-label={__('Add icon', 'easy-svg')}
        onClick={() => setUploadOpen(true)}
        css={{ '& svg': { width: 'ui.glyphMd', height: 'ui.glyphMd' } }}
      >
        <AddGlyph />
      </IconButton>
    </Tip>
  )
  const headerAction = pageAction ? <Portal container={{ current: pageAction }}>{addMenu}</Portal> : null

  const ruleRenameDialog = ruleRenameDialogView({
    applyRuleRename, busy, giveBack, rule, ruleRename, setRule, setRuleRename,
  })

  const pasteDialog = pasteDialogView({
    addPasted, busy, label, markup, pasteLabel, pasting, setLabel, setMarkup, setPasting,
  })

  const pager = pagerView({ busy, extra, libraryCount, onPage, pageCount, setPage })
  const messages = messagesView({ copyHelp, setCopyHelp })
  const reportBox = report ? (
    <ReportList
      summary={reportSummary(report)}
      rows={report}
      onDismiss={() => setReport(null)}
      dismissLabel={__('Dismiss this report', 'easy-svg')}
    />
  ) : null

  if (detailIc) {
    lastDetail.current = detailIc
  }
  const detailsDialog = detailsDialogView({
    busy, closeDetails, copierOf, copyTargetsOf, copyTo, ctx, detailCover, detailIc, details, draftName,
    focusIfLost, giveBack, lastDetail, moveTo, openMove, railCache, remember, removeIcon, rename, setDetails,
    setDraftName, switchIcons, targets,
  })

  // A set's export: a ZIP for this computer, or a link another site imports.
  const exportSet = exporting?.collection
  const exportRefs = exportSet ? exportSet.icons.map((x) => x.ref || `${exportSet.id}/${x.slug}`) : []
  const exportTooBig = exporter && Number.isFinite(exporter.exportMax) && exportRefs.length > exporter.exportMax
  const canLink = 'function' === typeof exportSet?.provider?.shareLink
  async function runExport() {
    if (!exporting) {
      return
    }
    if ('download' === exporting.mode) {
      const set = exporting.collection
      setExporting(null)
      await act(() => exporter.exportIcons({ refs: exportRefs, collection: set }))
      return
    }
    setBusy(true)
    try {
      const made = await exportSet.provider.shareLink({ collection: exportSet, hours: Number(exporting.hours) })
      setExporting((x) => (x ? { ...x, url: made?.url || '', error: '' } : x))
    } catch (e) {
      setExporting((x) => (x ? { ...x, error: e.message } : x))
    } finally {
      setBusy(false)
    }
  }
  const exportDialog = exportDialogView({
    busy, canLink, exportRefs, exportSet, exportTooBig, exporter, exporting, runExport, setExporting,
  })

  // A new set is named in a row of the side list, as the move dialog adds
  // one: it opens empty, with the upload area, so icons go in straight away.
  async function createSet() {
    const name = newSet?.name.trim()
    if (!name || !creator) {
      return
    }
    setNewSet(null)
    const made = await act(() => creator.create({ label: name }))
    if (made?.id) {
      setView(made.id)
      setUploadOpen(true)
    }
  }
  const newSetRow = newSetRowView({ busy, createSet, creator, newSet, newSetInput, setNewSet })

  const renameSetDialog = renameSetDialogView({ act, busy, renaming, setRenaming })
  const deleteSetDialog = deleteSetDialogView({ busy, deleting, setDeleting, setRailPick, trashCollection })
  const importSetDialog = importSetDialogView({
    busy, creator, importing, reloadCollections, setBusy, setImporting, setMoved, setView,
  })

  const moveDialog = moveDialogView({
    act, busy, confirmMove, copyTargetsOf, creator, giveBack, moveNaming, moveQuery, moveTarget, moving,
    recentSets, setMoveNaming, setMoveQuery, setMoveTarget, setMoving, targets,
  })

  if (err && icons === null) {
    return <Notice bad role="alert" retry={__('Try again', 'easy-svg')}>{err}</Notice>
  }

  if (icons === null) {
    return <SkeletonRows rows={3} />
  }

  const pickedSets = collections.filter((c) => railPick.has(c.id))

  const viewEntries = createListCollection({
    items: [
      ...(providers.length ? [{ id: 'all', label: __('All icons', 'easy-svg'), count: allCount, icon: <LuLayoutGrid /> }] : []),
      { id: 'library', label: _x('Library', 'rail entry for the icon library', 'easy-svg'), count: libraryTotal, icon: <LuLibrary /> },
      // Always there for who may manage icons, empty or not: an entry that comes and goes is hard to find again.
      ...(ctx.canManage ? [{ id: TRASH_VIEW, label: __('Trash', 'easy-svg'), count: trashTotal, icon: <TrashGlyph /> }] : []),
    ],
    itemToValue: (e) => e.id,
    itemToString: (e) => e.label,
  })
  // A long list of sets is found by typing; a short one needs no field.
  const findSets = collections.length >= 10
  const setTerm = findSets && railFind ? railQuery.trim().toLowerCase() : ''
  const setEntries = createListCollection({
    items: setRows.filter((e) => !setTerm || `${e.label} ${e.originName}`.toLowerCase().includes(setTerm)),
    itemToValue: (e) => e.id,
    itemToString: (e) => e.label,
  })
  // The sets that move by hand: writable, from a provider that keeps an order,
  // and not while a search shows only some of them.
  const sortOwn = (c) => !c.readonly && 'function' === typeof c.provider?.reorder
  const sortNow = setTerm ? [] : collections.filter(sortOwn).map(sortIdOf)
  // The same array while the order is the same: a new one is a new sort context for every row.
  if (sortNow.join('\n') !== sortKept.current.join('\n')) {
    sortKept.current = sortNow
  }
  const sortIds = sortKept.current
  const sortSet = new Set(sortIds)
  const targetSet = new Set(targets)
  const railNear = setTerm ? new Map() : railNeighbours(collections, sortOwn)
  const sortedById = (id) => collections.find((c) => sortIdOf(c) === String(id))
  // One place up or down among its provider's sets: Alt and an arrow, or the menu.
  const neighbour = (c, step) => railNear.get(c)?.[step < 0 ? 0 : 1] || null

  const { pickInRail, reorderSets, moveSet } = railActions({
    collections, neighbour, orderChain, orderSaved, orderSeq, railAnchor, setCollections, setEntries, setErr,
    setOrderSaid, setRailPick, setStatus, sortOwn, sortedById, view,
  })
  const { libraryMenu, setMenu, railBulkMenu } = railMenusView({
    act, ctx, exporter, neighbour, pickedSets, railAct, setCopyHelp, setDeleting, setExporting, setRenaming,
    setStatus,
  })
  railAct.current = {
    setRenaming,
    moveSet,
    menu: (kind, c, entry) => ('library' === kind ? libraryMenu : kind.startsWith('bulk:') ? railBulkMenu() : setMenu(c, entry)),
  }

  const sidebar = sidebarView({
    accountUrl, busy, choose, collections, collectionsFailed, creator, ctx, dragging, dropOver, exporter, findSets,
    hints, moveSet, neighbour, newSet, newSetRow, openTemplates, pickInRail, providers, railAct, railAnchor,
    railFind, railInline, railModClick, railNear, railPick, railQuery, reloadCollections, runHint, setDeleting,
    setEntries, setImporting, setNewSet, setRailFind, setRailOpen, setRailPick, setRailQuery, setRenaming, setTerm,
    sortSet, targetSet, view, viewEntries,
  })
  const railDrawer = railDrawerView({ railButton, railCover, railOpen, setRailOpen, sidebar, sortIds })

  // The templates gallery, from an add-on that offers one; else its page.
  const templater = providers.find((p) => 'function' === typeof p.templates) || null
  function openTemplates() {
    if (templater) {
      setTemplatesOpen(true)
    } else {
      ctx.goTo?.('packs')
    }
  }
  const templatesDialog = templatesDialogView({
    ctx, reloadCollections, setTemplatesOpen, templater, templatesContent, templatesOpen,
  })

  const tools = toolsView({ ctx, toolList })
  const toolDrawer = toolDrawerView({ ctx, openTool, toolCover, toolList })

  // Nothing stored yet: the empty state IS the upload surface. Only without a
  // search term, though: a search answers empty the same way. Nor while a
  // provider has a set to begin or a hint to give.
  if (all.length === 0 && !query.trim() && !collections.length && !creator && !hints.length && !trashTotal && TRASH_VIEW !== view) {
    return (
      <Stack gap="5">
        {headerAction}
        {messages}
        {reportBox}
        {uploadSurface}
        {fileInput}
        {pasteDialog}
        {toolDrawer}
        {templatesDialog}
        {ruleRenameDialog}
        {deleteDialog}
      </Stack>
    )
  }

  // Edit mode: the bar over the icons says what can be done with the pick,
  // for one icon its own actions, for several what reaches all of them.
  const one = 1 === pickedTiles.length ? pickedTiles[0] : null
  const leaveEditing = () => {
    setSelecting(false)
    setPicked(new Set())
    setTrashPicked(new Set())
  }
  const search = (
    <SearchField
      id="esw-icon-search"
      label={__('Search icons by name', 'easy-svg')}
      placeholder={_x('Search', 'placeholder of the icon search field', 'easy-svg')}
      w={{ base: 'full', md: selecting ? 'ui.searchGridPick' : 'ui.searchGrid' }}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  )
  // What can be done with the whole pick, for the right-click menu on a picked
  // tile: the same actions as the edit bar, each only where it applies.
  const switchable = pickedTiles.filter((ic) => !ic.source || ic.canSwitch)
  // Greyed out where it would change nothing: all already off, or all on.
  const anyOn = switchable.some((ic) => !ic.off)
  const anyOff = switchable.some((ic) => ic.off)
  // A read-only pick is copied from the menu too, as from the bar.
  const bulkCopier = copierOf(pickedTiles)
  const bulkActions = {
    count: pickedTiles.length,
    anyOn,
    anyOff,
    onMove: !bulkCopier && targets.length && pickedTiles.some((ic) => !ic.source?.readonly) ? () => { remember(); openMove(pickedTiles) } : null,
    onCopyLibrary: bulkCopier ? () => copyTo(bulkCopier, 'easy-svg', pickedTiles.map(refOf)) : null,
    onCopySet: bulkCopier && copyTargetsOf(bulkCopier).length ? () => { remember(); openMove(pickedTiles, bulkCopier) } : null,
    onOff: switchable.length ? () => switchIcons(switchable, true) : null,
    onOn: switchable.length ? () => switchIcons(switchable, false) : null,
    onRename: renamer ? () => openRuleRename(pickedTiles) : null,
    onExport: exporter && !exportTooMany ? exportPicked : null,
    onRemove: removing ? removePicked : null,
  }

  keyShortcuts({
    keys, leaveEditing, openDetails, pickEvery, picked, removeIcon, removePicked, removing, selecting,
    setSelecting, shown, trashOpen,
  })

  // Says what is being edited: the set or view chosen in the rail.
  const editSet = setEntries.items.find((e) => e.id === view)
  const editEntry = editSet || viewEntries.items.find((e) => e.id === view)
  let editLabel = __('Edit mode', 'easy-svg')
  if (trashOpen) {
    editLabel = __('Edit', 'easy-svg')
  } else if (editSet?.readonly) {
    // A set read from files cannot be edited here; the mode only picks icons to move or export.
    editLabel = __('Select icons', 'easy-svg')
  } else if (editSet) {
    editLabel = __('Edit set', 'easy-svg')
  } else if ('all' === editEntry?.id) {
    // Its own string: "All icons" mid-sentence would keep its capital.
    editLabel = __('Edit all icons', 'easy-svg')
  } else if (editEntry) {
    editLabel = sprintf(
      // translators: %s: name of the view shown, e.g. All icons.
      __('Edit %s', 'easy-svg'),
      editEntry.label
    )
  }

  // The button shows one plain word; editLabel stays its accessible name.
  const editWord = editSet?.readonly ? __('Select', 'easy-svg') : __('Edit', 'easy-svg')

  const trashAll = trashKeys.length > 0 && trashKeys.every((key) => trashPicked.has(key))
  const barCount = trashOpen ? pickedIcons.length + pickedEntries.length : picked.size
  const toggleAllTrash = () => setTrashPicked(trashAll ? new Set() : new Set(trashKeys))
  // Taking the last tick off ends edit mode, as in the grid.
  const pickInTrash = (key, on) => {
    const next = new Set(trashPicked)
    if (on) {
      next.add(key)
    } else {
      next.delete(key)
    }
    setTrashPicked(next)
    if (!next.size && trashPicked.size) {
      setSelecting(false)
    }
  }
  const askPurge = (purge) => {
    remember()
    setConfirming({ purge })
  }

  const toolbar = toolbarView({
    allPicked, anyOff, anyOn, askPurge, barCount, busy, copierOf, copyCall, copyTargetsOf, copyTo, ctx, editLabel, editWord,
    editSet, emptyHere, exportPicked, exportTooMany, exporter, focusIfLost, leaveEditing, one, openDetails,
    openMove, openRuleRename, own, picked, pickedEntries, pickedIcons, pickedTiles, railButton, railInline,
    remember, removeIcon, removePicked, removing, renamer, restorePicked, search, selecting, setRailOpen,
    setSelecting, switchIcons, targets, toggleAll, toggleAllTrash, tools, trashAll, trashKeys, trashOpen,
    trashTotal,
  })

  const trashHead = trashHeadView({ ctx })
  const trashBody = trashBodyView({
    askPurge, bins, busy, loadMoreTrash, loadTrash, markTrashRow, pickInTrash, reloadCollections, restoreEntry,
    restoreTrashed, selecting, tiles, trash, trashItems, trashMore, trashPicked, trashTotal,
  })

  return libraryLayoutView({
    activeDrag, addFromMedia, bulkActions, busy, collectionTiles, copierOf, copyCall, copyTargetsOf, copyTo, ctx,
    deleteDialog, deleteSetDialog, detailsDialog, dropOver, droppedOnSet, emptyHere, err, exportDialog, fileInput,
    flipFrom, grid, headerAction, importSetDialog, noSvgNotice, messages, moveDialog, moveTo, moved, needMore, openDetails,
    openMove, openTrash, orderSaid, pageItems, pager, pasteDialog, pasteLabel, picked, pickedTiles, progress,
    query, railDrawer, railInline, remember, removeIcon, renameSetDialog, reorderSets, reportBox, ruleRenameDialog,
    searching, selecting, sensors, setActiveDrag, setDragging, setDropOver, setErr, setLanded, setMoved,
    setPasting, setQuery, setStatus, setUploadOpen, shown, sidebar, snapTiles, sortIds, sortedById,
    status, stickyRef, switchIcons, targets, templatesDialog, tiles, toastTrash, toastUndo, togglePicked,
    toolDrawer, toolbar, trashBody, trashHead, trashOpen, undoMove, uploadOpen, view, working,
  })
}
