import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Box, ChakraProvider, CloseButton, Flex, Text } from '@chakra-ui/react'
import { __ } from '@wordpress/i18n'
import { system } from './system.js'
import { Button } from '../ui.jsx'

// Words come from PHP, which prints a plain notice first, so the form also works without JavaScript.
function Hint({ data, onGone }) {
  const [busy, setBusy] = useState(false)

  const dismiss = () => {
    const body = new URLSearchParams({ action: 'easy_svg_dismiss_icons_hint', nonce: data.dismissNonce })
    fetch(data.ajax, { method: 'POST', credentials: 'same-origin', body })
    onGone()
  }

  return (
    <Box
      as="form"
      method="post"
      action={data.post}
      onSubmit={() => setBusy(true)}
      bg="ui.surface"
      borderWidth="ui.hair"
      borderColor="ui.border"
      borderRadius="forge"
      boxShadow="sm"
      px="4"
      py="3"
    >
      <input type="hidden" name="action" value="easy_svg_enable_icons" />
      <input type="hidden" name="_wpnonce" value={data.enableNonce} />
      <Flex gap="4" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}>
        <Box flex="1" minW="0">
          <Text as="div" fontFamily="heading" fontWeight="bold" fontSize="ui.lg" color="ui.heading" m="0">
            {data.copy?.[0]}
          </Text>
          <Text as="div" fontSize="ui.md" color="ui.muted" mt="0.5" mb="0">
            {data.copy?.[1]}
          </Text>
        </Box>
        <Flex gap="2" wrap="wrap" align="center">
          <Button type="submit" variant="primary" size="sm" loading={busy}>
            {__('Switch it on', 'easy-svg')}
          </Button>
        </Flex>
        <CloseButton
          size="sm"
          alignSelf={{ base: 'flex-end', md: 'center' }}
          order={{ base: -1, md: 0 }}
          aria-label={__('Dismiss this notice', 'easy-svg')}
          onClick={dismiss}
        />
      </Flex>
    </Box>
  )
}

const el = document.getElementById('easy-svg-hint')
const data = window.EasySvgIconsHint
if (el && data) {
  // From here the card draws itself; the notice frame around the fallback goes.
  el.setAttribute('data-chakra', '')
  const root = createRoot(el)
  root.render(
    <ChakraProvider value={system}>
      <Hint data={data} onGone={() => { root.unmount(); el.remove() }} />
    </ChakraProvider>
  )
}
