import { __ } from '@wordpress/i18n'
import { runHeld } from '../../held.js'
import { addedMessage, MEDIA_CHUNK, readText, reportSummary } from './helpers.js'

// Called once per render of Library, as the handlers were declared there: each closure reads that render's state.
export function addActions({
  act, addIdFor, addIds, api, clear, fileRef, intoSet, keep, label, markup, setBusy, setErr, setLabel, setMarkup,
  setPasting, setProgress, setReport, setStatus, setUploadOpen, take,
}) {
  // Only ids travel, so an offloaded library is a clear refusal per file instead of a CORS error.
  async function addFromMedia() {
    await runHeld()
    const media = window.wp && window.wp.media
    // Without the media library the files still go in, through the browser's own chooser.
    if (!media) {
      fileRef.current?.click()
      return
    }
    const frame = media({
      title: __('Choose SVGs to add as icons', 'easy-svg'),
      button: { text: __('Add as icons', 'easy-svg') },
      library: { type: 'image/svg+xml' },
      multiple: true,
    })
    // Open on the library tab: on Upload files its collection never fetches, so the person first sees an empty uploader.
    frame.on('open', () => frame.content.mode('browse'))

    frame.on('select', async () => {
      const ids = frame
        .state()
        .get('selection')
        .map((item) => item.id)
        .filter((id) => !!id)
      if (!ids.length) {
        return
      }
      // With a set on screen that takes media, the files go into that set.
      if (intoSet && 'function' === typeof intoSet.provider.addMedia) {
        clear()
        setReport(null)
        const done = await act(() => intoSet.provider.addMedia({ ids, collection: intoSet }))
        setReport(Array.isArray(done?.rows) && done.rows.length ? done.rows : null)
        return
      }
      setBusy(true)
      clear()
      setReport(null)
      const rows = []
      let fresh = null
      // Sent in chunks the server accepts whole, for the same reason adds are
      // sequential: each answer carries the fresh page, and the last is true.
      for (let i = 0; i < ids.length; i += MEDIA_CHUNK) {
        setProgress({ done: i, total: ids.length })
        try {
          fresh = await api.post('/library/media', { ids: ids.slice(i, i + MEDIA_CHUNK), limit: keep() })
          for (const row of fresh.report || []) {
            const ok = 'added' === row.state
            rows.push({ file: row.label || `#${row.id}`, ok, message: ok ? addedMessage(row) : row.message })
          }
        } catch (e) {
          setErr(e.message)
          break
        }
      }
      if (fresh) {
        take(fresh)
      }
      setReport(rows)
      setProgress(null)
      if (rows.every((r) => r.ok)) {
        setUploadOpen(false)
      }
      setBusy(false)
    })
    frame.open()
  }
  async function addPasted() {
    if (!markup.trim()) {
      return
    }
    if (intoSet) {
      clear()
      const done = await act(() =>
        intoSet.provider.add({ icons: [{ name: label.trim() || 'icon', markup }], to: intoSet.id, collection: intoSet })
      )
      if (done && (done.rows || []).every((r) => r.ok)) {
        setLabel('')
        setMarkup('')
        setPasting(false)
      } else if (Array.isArray(done?.rows)) {
        setReport(done.rows)
      }
      return
    }
    setBusy(true)
    clear()
    try {
      const addKey = `paste:${label}\n${markup}`
      const fresh = await api.post('/library/add', { label, markup, request_id: addIdFor(addKey), limit: keep() })
      addIds.current.delete(addKey)
      take(fresh)
      setLabel('')
      setMarkup('')
      setPasting(false)
      setStatus(addedMessage(fresh?.added))
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  return { addFromMedia, addPasted }
}

// Called once per render of Library too; Library keeps a hoisted addFiles that calls this one.
export function fileAdder({
  act, addIdFor, addIds, api, clear, intoSet, keep, setBusy, setMoved, setPickRound, setProgress, setReport,
  setUploadOpen, take,
}) {
  // Sequential, one per request: each answer is the fresh page, and parallel inserts would race for the same unique slug.
  async function addFiles(fileList) {
    const given = Array.from(fileList || [])
    if (!given.length) {
      return
    }
    // A PNG or a PDF is refused here, by name, before anything is sent: the
    // report says so next to the file, and nothing claims to have added it.
    const zipOk = intoSet && 'function' === typeof intoSet.provider.importFile
    const fits = (f) => /\.svg$/i.test(f.name) || 'image/svg+xml' === f.type || (zipOk && /\.zip$/i.test(f.name))
    const files = given.filter(fits)
    const refused = given
      .filter((f) => !fits(f))
      .map((f) => ({ file: f.name, ok: false, message: zipOk ? __('Only SVG or ZIP files.', 'easy-svg') : __('Only SVG files.', 'easy-svg') }))
    if (!files.length) {
      clear()
      setUploadOpen(true)
      setReport(refused)
      return
    }
    if (intoSet) {
      clear()
      setReport(null)
      setUploadOpen(true)
      setProgress({ done: 0, total: files.length })
      const importer = 'function' === typeof intoSet.provider.importFile
      const icons = []
      const bundles = []
      const rows = [...refused]
      for (const file of files) {
        // A ZIP, or an SVG that is a font of glyphs, is a bundle of icons: the
        // set's own import reads it. Everything else is one icon.
        if (/\.zip$/i.test(file.name)) {
          bundles.push(file)
          continue
        }
        const text = await readText(file).catch(() => '')
        if (/<glyph\b/i.test(text)) {
          bundles.push(file)
          continue
        }
        icons.push({ name: file.name.replace(/\.svg$/i, ''), markup: text })
      }
      const done = await act(async () => {
        const said = []
        const undos = []
        const take = (done) => {
          said.push(done?.message || __('Done.', 'easy-svg'))
          rows.push(...(done?.rows || []))
          if ('function' === typeof done?.undo) {
            undos.push(done.undo)
          }
        }
        if (icons.length) {
          take(await intoSet.provider.add({ icons, to: intoSet.id, collection: intoSet }))
        }
        for (const file of bundles) {
          if (!importer) {
            rows.push({ file: file.name, ok: false, message: __('This set cannot import a bundle.', 'easy-svg') })
            continue
          }
          try {
            take(await intoSet.provider.importFile({ file, collection: intoSet }))
          } catch (e) {
            rows.push({ file: file.name, ok: false, message: e.message })
          }
        }
        return {
          message: said.join(' ') || __('Nothing was added.', 'easy-svg'),
          undo: undos.length
            ? async () => {
                for (const undo of undos.slice().reverse()) {
                  await undo()
                }
                return { message: __('Undone.', 'easy-svg') }
              }
            : null,
        }
      })
      if (done && rows.length && rows.every((r) => r.ok)) {
        // All in: the one green line, and the add-on's Undo stays with it;
        // the report's own line has none to give.
        setMoved({ message: reportSummary(rows), undo: 'function' === typeof done.undo ? done.undo : null })
        setReport(null)
      } else {
        setReport(rows.length ? rows : null)
      }
      setProgress(null)
      if (!rows.some((r) => !r.ok)) {
        setUploadOpen(false)
      }
      setPickRound((n) => n + 1)
      return
    }
    setBusy(true)
    clear()
    setReport(null)
    setUploadOpen(true)
    const rows = [...refused]
    let fresh = null
    let n = 0
    setProgress({ done: 0, total: files.length })
    for (const file of files) {
      setProgress({ done: n++, total: files.length })
      try {
        const markupOfFile = await readText(file)
        const fileLabel = file.name.replace(/\.svg$/i, '')
        const addKey = `file:${file.name}:${file.size}:${file.lastModified}`
        fresh = await api.post('/library/add', {
          label: fileLabel,
          markup: markupOfFile,
          request_id: addIdFor(addKey),
          limit: keep(),
        })
        addIds.current.delete(addKey)
        rows.push({ file: file.name, ok: true, message: addedMessage(fresh?.added) })
      } catch (e) {
        rows.push({ file: file.name, ok: false, message: e.message })
      }
    }
    if (fresh) {
      take(fresh)
    }
    // One file whose name was taken: the toast says the name it got, not a report.
    const added = fresh?.added
    if (1 === rows.length && rows[0].ok && added?.slug && added?.wanted && added.slug !== added.wanted) {
      setMoved({ message: rows[0].message, undo: null })
      setReport(null)
    } else {
      setReport(rows)
    }
    setProgress(null)
    if (rows.every((r) => r.ok)) {
      setUploadOpen(false)
    }
    setBusy(false)
    setPickRound((n) => n + 1)
  }
  return { addFiles }
}
