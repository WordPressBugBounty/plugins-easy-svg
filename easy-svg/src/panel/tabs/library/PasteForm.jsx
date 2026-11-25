import { useEffect, useId, useRef } from 'react'
import {
  Alert,
  Button,
  Input,
  Box,
  Flex,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react'
import { __ } from '@wordpress/i18n'
import { FormField } from '../../../ui.jsx'
import { purifySvg, sanitizeSvg, scopeSvgIds } from './helpers.js'

// Where the user switched highlighting off in their profile, the textarea stays.
const CODE_THEME = {
  '& .CodeMirror, & textarea': {
    height: 'ui.code',
    width: '100%',
    background: 'code.bg',
    color: 'code.text',
    fontFamily: '"Ubuntu Mono", ui-monospace, monospace',
    fontSize: 'ui.body',
    lineHeight: 'ui.relaxed',
    borderRadius: 'forge',
    border: '{borderWidths.ui.hair} solid',
    borderColor: 'code.bg',
  },
  '& textarea': { padding: '{spacing.3} {spacing.3.5}', resize: 'vertical' },
  '& .CodeMirror-gutters': { background: 'code.gutter', borderRight: '0' },
  '& .CodeMirror-linenumber': { color: 'code.muted' },
  '& .CodeMirror-placeholder, & textarea::placeholder': { color: 'code.muted !important' },
  '& .CodeMirror-cursor': { borderLeftColor: 'code.cursor' },
  '& .CodeMirror-activeline-background': { background: 'code.activeLine' },
  '& .CodeMirror-activeline-gutter': { background: 'code.activeLine' },
  '& .CodeMirror-selected, & .CodeMirror-focused .CodeMirror-selected': { background: 'code.selection' },
  '& .cm-tag, & .cm-bracket': { color: 'code.tag' },
  '& .cm-attribute': { color: 'code.attribute' },
  '& .cm-string': { color: 'code.string' },
  '& .cm-comment': { color: 'code.muted' },
  '& .cm-error': { color: 'code.error' },
}

function CodeEditor({ id, value, onChange, label }) {
  const area = useRef(null)
  const mirror = useRef(null)
  const change = useRef(onChange)
  change.current = onChange
  useEffect(() => {
    const settings = window.EasySvgPanelData?.codeEditor
    const editor = window.wp?.codeEditor
    if (!settings || !editor || !area.current) {
      return undefined
    }
    const made = editor.initialize(area.current, {
      ...settings,
      codemirror: { ...(settings.codemirror || {}), mode: 'xml', lineNumbers: true, lineWrapping: true },
    })
    const cm = made.codemirror
    cm.getInputField().setAttribute('aria-label', label)
    mirror.current = cm
    // Measured once the dialog has finished opening, not while it animates.
    const settle = window.setTimeout(() => cm.refresh(), 250)
    const onEdit = () => change.current(cm.getValue())
    cm.on('change', onEdit)
    return () => {
      window.clearTimeout(settle)
      cm.off('change', onEdit)
      cm.toTextArea()
      mirror.current = null
    }
  }, [label])
  // A value set from outside (a cleared form) reaches the editor too.
  useEffect(() => {
    if (mirror.current && mirror.current.getValue() !== value) {
      mirror.current.setValue(value)
    }
  }, [value])
  return (
    // Full width: inside a field the wrapper would otherwise shrink to the
    // width of what has been typed, which is nothing at first.
    <Box css={CODE_THEME} w="full">
      <textarea
        ref={area}
        id={id}
        aria-label={label}
        placeholder="<svg></svg>"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </Box>
  )
}

// What DOMPurify took out of the pasted markup, by name: the same cleaning the
// preview uses. The server cleans again on save; this only says it up front.
function removedBy(markup) {
  if (!markup.trim()) {
    return []
  }
  const names = purifySvg(markup).removed.map((r) =>
    r.attribute ? `${r.attribute.name}=""` : `<${String(r.element?.nodeName || '').toLowerCase()}>`
  )
  // body is DOMPurify's own wrapper, never something the paste held.
  return [...new Set(names.filter((n) => !['<>', '<#text>', '<body>'].includes(n)))]
}

// Pasting SVG code: the name, the code in a real code editor, and beside them
// the drawing as it will look, at the sizes a theme uses.
export function PasteForm({ label, setLabel, markup, setMarkup, addPasted, busy, setPasting }) {
  const clean = sanitizeSvg(markup)
  const scope = useId()
  const removed = removedBy(markup)
  const takesColour = /currentcolor/i.test(clean)
  return (
    <Stack
      as="form"
      gap="5"
      onSubmit={(e) => {
        e.preventDefault()
        addPasted()
      }}
    >
      <Flex direction={{ base: 'column', md: 'row' }} gap="6">
        <Stack flex="1" minW="0" gap="5">
          <FormField label={__('Name', 'easy-svg')} htmlFor="esw-icon-name">
            <Input
              id="esw-icon-name"
              placeholder={__('e.g. arrow-right', 'easy-svg')}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </FormField>
          <FormField label={__('SVG code', 'easy-svg')} htmlFor="esw-icon-markup">
            <CodeEditor id="esw-icon-markup" label={__('SVG code', 'easy-svg')} value={markup} onChange={setMarkup} />
          </FormField>
        </Stack>

        <Stack w={{ base: 'full', md: 'ui.side' }} flexShrink="0" gap="3">
          <Text fontSize="ui.body" fontWeight="bold" color="ui.heading">{__('Preview', 'easy-svg')}</Text>
          <Flex
            h="ui.preview"
            align="center"
            justify="center"
            borderWidth="ui.hair"
            borderColor="ui.border"
            borderRadius="forge"
            color="ui.heading"
            bg="ui.surface"
            bgImage="conic-gradient({colors.ui.bg} 25%, transparent 0 50%, {colors.ui.bg} 0 75%, transparent 0)"
            bgSize="{sizes.ui.checker} {sizes.ui.checker}"
          >
            {clean ? (
              <Box boxSize="24" aria-hidden="true" overflow="hidden" css={{ '& svg': { width: '100%', height: '100%' } }} dangerouslySetInnerHTML={{ __html: scopeSvgIds(clean, scope) }} />
            ) : null}
          </Flex>
          {removed.length ? (
            <Alert.Root status="error" borderRadius="forge" role="status">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title fontSize="ui.body">{__('Will be removed', 'easy-svg')}</Alert.Title>
                <Alert.Description fontSize="ui.body" fontFamily="mono">{removed.join(', ')}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          ) : null}
          {clean && takesColour ? (
            <Alert.Root status="success" borderRadius="forge">
              <Alert.Indicator />
              <Alert.Title fontSize="ui.body">{__('Takes the text color', 'easy-svg')}</Alert.Title>
            </Alert.Root>
          ) : null}
        </Stack>
      </Flex>

      <HStack gap="3" justify="flex-end" pt="4" borderTopWidth="ui.hair" borderColor="ui.border">
        <Button variant="outline" onClick={() => setPasting(false)} disabled={busy}>
          {__('Cancel', 'easy-svg')}
        </Button>
        <Button type="submit" variant="solid" disabled={!clean} loading={busy}>
          {__('Add icon', 'easy-svg')}
        </Button>
      </HStack>
    </Stack>
  )
}
