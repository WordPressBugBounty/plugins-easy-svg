// The extension API Pro consumes; the full contract per level is in docs/wiki.md.
// A provider's optional `trashBin` lists what it trashed in the library's Trash view; registering again makes the library read it again.
// A remove() answer may carry `openTrash: true` when its icons went to that bin; the toast then offers Open trash.
// Pro does not bundle this file, and its script depends on the panel's, so the registry always exists first.
export function installRegistry() {
  if (typeof window === 'undefined') return
  if (window.EasySvgPanel && window.EasySvgPanel.__installed) return

  const registered = new Map()
  const providers = new Map()
  const listeners = new Set()
  const notify = () =>
    listeners.forEach((fn) => {
      try {
        fn()
      } catch {
        /* a bad listener must not break registration */
      }
    })

  window.EasySvgPanel = {
    __installed: true,
    // Lets an add-on that must also run on an older free plugin ask for the level instead of guessing.
    api: Number((window.EasySvgPanelData && window.EasySvgPanelData.panelApi) || 1),
    registerTab(tab) {
      if (!tab || !tab.id || typeof tab.render !== 'function') return
      registered.set(tab.id, tab)
      notify()
    },
    registerCollections(provider) {
      if (!provider || !provider.id || typeof provider.load !== 'function') return
      providers.set(provider.id, provider)
      notify()
    },
    collectionProviders() {
      return [...providers.values()]
    },
    get(id) {
      return registered.get(id)
    },
    list() {
      return [...registered.values()]
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

export function getRegistry() {
  return (typeof window !== 'undefined' && window.EasySvgPanel) || null
}
