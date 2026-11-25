import React from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import { system } from '../kit/system.js'
import App from './App.jsx'
import { installRegistry } from './registry.js'
import { setSelectCopy } from '../ui.jsx'
import { __ } from '@wordpress/i18n'

// The search field and no-match line in every pick-one list, translated.
setSelectCopy({ search: __('Search', 'easy-svg'), empty: __('Nothing found', 'easy-svg') })

// Define the extension registry BEFORE anything renders, so the Pro bundle
// (enqueued with this one as a dependency) can registerTab() and have the panel
// pick it up. Light only: the panel lives inside wp-admin.
installRegistry()

const el = document.getElementById('easy-svg-panel')
if (el) {
  // StrictMode stays: SCRIPT_DEBUG serves development React, which runs effects twice; production makes one request.
  createRoot(el).render(
    <React.StrictMode>
      <ChakraProvider value={system}>
        <App config={window.EasySvgPanelData || {}} />
      </ChakraProvider>
    </React.StrictMode>
  )
}
