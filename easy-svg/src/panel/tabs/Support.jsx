import { useEffect, useState } from 'react'
import { Box, Stack, Textarea, useClipboard } from '@chakra-ui/react'
import { LuCheck, LuCopy } from 'react-icons/lu'
import { __ } from '@wordpress/i18n'
import { IconAction, Section, Toast } from '../../ui.jsx'
import { Notice } from '../parts.jsx'
import { makeApi } from '../api.js'

export default function Support({ ctx }) {
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  // The trigger of Clipboard.Root forces its own aria-label over the visible text (WCAG 2.5.3); the hook leaves the button's name alone.
  const clipboard = useClipboard({ value: text, timeout: 3000 })

  useEffect(() => {
    const ac = new AbortController()
    makeApi(ctx)
      .supportReport({ signal: ac.signal })
      .then((r) => setText(r?.text ?? ''))
      .catch((e) => {
        if ('AbortError' !== e.name) setErr(e.message || __('The report could not be loaded.', 'easy-svg'))
      })
    return () => ac.abort()
    // The ctx object is rebuilt on every render of the app; only the load matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Stack gap="5" maxW="ui.page">
      <Section title={__('Support report', 'easy-svg')} description={__('Copy this report into your support request.', 'easy-svg')}>
        {err ? <Notice bad role="alert" retry={__('Try again', 'easy-svg')}>{err}</Notice> : null}
        {/* Grows with the report: no inner scrollbar on a short one, no cut-off line on a long one. */}
        <Box position="relative">
          <Textarea data-support-report readOnly autoresize value={text} rows={8} fontFamily="mono" fontSize="ui.sm" pe="12" aria-label={__('Support report', 'easy-svg')} />
          <IconAction data-copy-report label={__('Copy report', 'easy-svg')} disabled={!text} onClick={() => clipboard.copy()} position="absolute" top="2" insetEnd="2" bg="ui.surface">
            {clipboard.copied ? <LuCheck /> : <LuCopy />}
          </IconAction>
        </Box>
        {clipboard.copied ? <Toast>{__('Report copied. Paste it into your support request.', 'easy-svg')}</Toast> : null}
      </Section>
    </Stack>
  )
}
