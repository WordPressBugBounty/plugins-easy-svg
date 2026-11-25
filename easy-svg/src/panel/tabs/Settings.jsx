import { useEffect, useRef, useState } from 'react'
import { Stack } from '@chakra-ui/react'
import { __ } from '@wordpress/i18n'
import { MainSwitch, SaveState, SkeletonRows, Toast, UndoToast, useAutosave } from '../../ui.jsx'
import { LuShapes } from 'react-icons/lu'
import { Notice } from '../parts.jsx'
import { makeApi } from '../api.js'

// Coerce the server payload to a stable shape: the autosave compares with
// Object.is to skip a write that changes nothing.
const normalize = (s) => ({
  icons: !!s?.icons,
})

export default function Settings({ ctx }) {
  const api = makeApi(ctx)

  // The write the autosave has on its way, so switching on can wait for it.
  const writing = useRef(Promise.resolve())
  const auto = useAutosave((patch) => {
    const write = (async () => {
      const n = normalize(await api.post('/settings', patch))
      if (undefined !== patch.icons && ctx.setIconsEnabled) ctx.setIconsEnabled(!!n.icons)
      return n
    })()
    writing.current = write.catch(() => {})
    return write
  })
  const form = auto.value

  const [err, setErr] = useState('')
  const [note, setNote] = useState('')

  // Aborted on unmount: two loads can resolve out of order and leave the form on pre-save values.
  useEffect(() => {
    const ac = new AbortController()
    api
      .get('/settings', { signal: ac.signal })
      .then((data) => {
        auto.prime(normalize(data))
      })
      .catch((e) => {
        if ('AbortError' !== e.name) {
          setErr(e.message)
        }
      })
    return () => ac.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (err && !form) {
    return <Notice bad role="alert" retry={__('Try again', 'easy-svg')}>{err}</Notice>
  }
  if (!form) {
    return (
      <Stack gap="5">
        <SkeletonRows rows={3} />
      </Stack>
    )
  }

  // Only the changed field is sent; switching off is undoable, as that is the stray click that takes something away.
  const toggle = async (k, v) => {
    if (v && 'icons' === k) {
      // Switched on: straight into the library, loaded fresh, so the block, the editor and every icon tool are there at once.
      // After an "off" still on its way, not beside it: a late "off" would win.
      setNote(__('Icon manager switched on.', 'easy-svg'))
      await writing.current
      try {
        await api.post('/settings', { icons: true })
      } catch (e) {
        setNote('')
        setErr(e.message)
        return
      }
      window.location.assign(`${window.location.pathname}?page=easy-svg-icons&tab=library`)
      return
    }
    // Off offers Undo in the toast.
    setNote('')
    auto.set({ [k]: !!v }, { undoable: !v })
  }

  return (
    <Stack gap="5">
      {/* The tab says where this is; the tiles need no title of their own. */}
      {/* SVG uploads have no switch; the icon manager is the one choice, with or without Pro. */}
      <MainSwitch
        id="esw-setting-icons"
        checked={!!form.icons}
        onChange={(v) => toggle('icons', v)}
        icon={<LuShapes />}
        label={__('Manage icons', 'easy-svg')}
        description={__('Shows your icons and the Icon block.', 'easy-svg')}
      />

      {err ? <Notice bad role="alert">{err}</Notice> : null}

      <SaveState
        state={auto.state}
        error={auto.error}
        savingLabel={__('Saving', 'easy-svg')}
        savedLabel={__('Saved', 'easy-svg')}
      />

      {note ? (
        <Toast onDismiss={() => setNote('')} dismissLabel={__('Dismiss', 'easy-svg')}>
          {note}
        </Toast>
      ) : null}

      <UndoToast
        onUndo={auto.undo}
        label={__('Switched off.', 'easy-svg')}
        undoLabel={__('Undo', 'easy-svg')}
      />
    </Stack>
  )
}
