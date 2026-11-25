

// Called once per render of Library, as the handlers were declared there: each closure reads that render's state.
export function keyShortcuts({
  keys, leaveEditing, openDetails, pickEvery, picked, removeIcon, removePicked, removing, selecting,
  setSelecting, shown, trashOpen,
}) {
  keys.current = (e) => {
    const t = e.target
    if (!(t instanceof window.HTMLElement)) {
      return
    }
    if (t.closest('input, textarea, select, [contenteditable=true], [role=dialog], [role=alertdialog], [role=menu]')) {
      return
    }
    // The Trash view has no search to jump to and no details to open; Escape still ends its edit mode.
    if (trashOpen) {
      if ('Escape' === e.key && selecting) {
        e.preventDefault()
        leaveEditing()
      }
      return
    }
    const inGrid = !!t.closest('[data-icon-grid]')
    const tileEl = t.closest('[data-icon-key]')
    const ic = tileEl ? shown.find((x) => (x.key || x.ref || `easy-svg/${x.slug}`) === tileEl.getAttribute('data-icon-key')) : null
    const mod = e.metaKey || e.ctrlKey
    if (mod && 'a' === e.key.toLowerCase() && inGrid) {
      e.preventDefault()
      setSelecting(true)
      pickEvery()
      return
    }
    if (mod || e.altKey) {
      return
    }
    // "/" finds, as on GitHub; Cmd+K is taken by the WordPress command palette.
    if ('/' === e.key && !document.querySelector('[role=dialog], [role=alertdialog]')) {
      const field = document.getElementById('esw-icon-search')
      if (field) {
        e.preventDefault()
        field.focus()
        return
      }
    }
    // The menu key and Shift+F10 open the tile's menu where a right click would.
    if (tileEl && ('ContextMenu' === e.key || (e.shiftKey && 'F10' === e.key))) {
      e.preventDefault()
      const box = tileEl.getBoundingClientRect()
      tileEl.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 }))
      return
    }
    if ('Escape' === e.key && selecting) {
      e.preventDefault()
      leaveEditing()
      return
    }
    if (('Delete' === e.key || 'Backspace' === e.key) && inGrid) {
      if (picked.size > 1 && removing) {
        e.preventDefault()
        removePicked()
      } else if (ic && !(ic.readonly && !ic.canRemove)) {
        e.preventDefault()
        removeIcon(ic)
      }
      return
    }
    if ('F2' === e.key && ic && !(ic.readonly && !ic.canRename)) {
      e.preventDefault()
      openDetails(ic, 'name')
    }
  }
}
