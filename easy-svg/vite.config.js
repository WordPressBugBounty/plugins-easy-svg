import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))

// Built aside, then renamed into build/ file by file: wp-env serves build/ live,
// and a page loaded mid-build got no panel. The whole folder moves, because
// vite copies public/fonts in beside the bundle.
const ASIDE = 'node_modules/.cache/build-panel'
function swapIn(into) {
  const move = (from, to) => {
    mkdirSync(to, { recursive: true })
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        move(join(from, entry.name), join(to, entry.name))
      } else {
        renameSync(join(from, entry.name), join(to, entry.name))
      }
    }
  }
  return {
      name: 'swap-in',
      closeBundle() {
        move(ASIDE, into)
        rmSync(ASIDE, { recursive: true, force: true })
      },
    }
  }

// The modules build/ui.js puts on window.EasySvgUi. The panel and the hint read them from there, so a page holds
// one Chakra, one emotion cache and one theme however many bundles draw on it. Pro's vite.config.js maps the same names.
const KIT_FILES = ['src/ui.jsx', 'src/theme.js', 'src/kit/system.js', 'src/panel/paint-style.js', 'src/svg-purify.js', 'src/svg-ids.js'].map((f) => resolve(here, f))
const KIT_PACKAGES = { '@chakra-ui/react': 'window.EasySvgUi.chakra', '@emotion/react': 'window.EasySvgUi.emotion' }
function fromUiKit() {
  return {
    name: 'easy-svg-ui',
    // Ahead of Vite's own resolver, which would bundle node_modules/@chakra-ui.
    enforce: 'pre',
    async resolveId(id, importer, options) {
      if (KIT_PACKAGES[id]) {
        return `\0easy-svg-ui:${id}`
      }
      if (!importer || !id.startsWith('.')) {
        return null
      }
      const found = await this.resolve(id, importer, { ...options, skipSelf: true })
      return found && KIT_FILES.includes(found.id) ? '\0easy-svg-ui:kit' : null
    },
    load(id) {
      if (!id.startsWith('\0easy-svg-ui:')) {
        return null
      }
      const from = KIT_PACKAGES[id.slice('\0easy-svg-ui:'.length)] || 'window.EasySvgUi'
      // Every named import becomes a property of the global, whatever the module exports.
      return { code: `export const __kit = ${from}\nexport default __kit\n`, syntheticNamedExports: '__kit' }
    },
  }
}

// The minifier may name a bundled function `__`, `_x`, `_n` or `_nx`, and translate.wordpress.org then lists its calls
// (`_x("width")` from Chakra) as strings to translate. Renamed after minifying; wp.i18n calls are `o.__(...)` and stay.
const I18N_NAMES = new Set(['__', '_x', '_n', '_nx', '_e', 'esc_html__', 'esc_attr__'])
function noI18nLookalikes() {
  return {
    name: 'no-i18n-lookalikes',
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue
        const ast = this.parse(chunk.code)
        const hits = []
        const walk = (node, parent, key) => {
          if (!node || typeof node.type !== 'string') return
          const isPropertyName = (parent?.type === 'MemberExpression' && key === 'property' && !parent.computed)
            || (parent?.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand)
            || (parent?.type === 'MethodDefinition' && key === 'key' && !parent.computed)
          if (node.type === 'Identifier' && I18N_NAMES.has(node.name) && !isPropertyName) {
            if (parent?.type === 'Property' && parent.shorthand) {
              throw new Error(`no-i18n-lookalikes: shorthand property ${node.name} in ${chunk.fileName}`)
            }
            hits.push(node)
          }
          for (const [k, v] of Object.entries(node)) {
            if (Array.isArray(v)) v.forEach((c) => walk(c, node, k))
            else if (v && typeof v.type === 'string') walk(v, node, k)
          }
        }
        walk(ast, null, null)
        if (!hits.length) continue
        let code = chunk.code
        for (const n of hits.sort((a, b) => b.start - a.start)) {
          const fresh = `${n.name}$esvg`
          if (chunk.code.includes(fresh)) throw new Error(`no-i18n-lookalikes: ${fresh} already in ${chunk.fileName}`)
          code = code.slice(0, n.start) + fresh + code.slice(n.end)
        }
        chunk.code = code
      }
    },
  }
}

  // Three IIFE bundles; React, ReactDOM, the JSX runtime and wp.i18n come from WordPress, so the bundles reference the globals.
  // `--mode ui` builds the kit, `--mode hint` the small hint for the Plugins screen, the default mode the Icons panel.
  export default defineConfig(({ mode }) => {
    const hint = mode === 'hint'
    const kit = mode === 'ui'
    const entry = kit ? 'src/kit/main.js' : hint ? 'src/hint/main.jsx' : 'src/panel/main.jsx'
    const name = kit ? 'ui' : hint ? 'hint' : 'panel'
    return {
    plugins: [react(), ...(kit || hint ? [] : [fromUiKit()]), noI18nLookalikes(), swapIn('build')],
    // Chakra's theme modules by file, which its package exports do not list; only the hint reads them.
    resolve: { alias: { 'chakra-theme': resolve(here, 'node_modules/@chakra-ui/react/dist/esm/theme') } },
    // The fonts come along with the panel build; the hint uses those.
    publicDir: hint || kit ? false : 'public',
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      // Vite 6 made this `true`; `auto` keeps the shipped bundle as Vite 5 built it.
      commonjsOptions: { strictRequires: 'auto' },
      outDir: ASIDE,
      emptyOutDir: true,
      // Written for debugging but not shipped (src/ is), so the bundle names no map.
      sourcemap: 'hidden',
      lib: {
        entry,
        formats: ['iife'],
        name: kit ? 'EasySvgUiKit' : hint ? 'EasySvgHintApp' : 'EasySvgPanelApp',
        fileName: () => `${name}.js`,
      },
      rollupOptions: {
        // React, the JSX runtime and wp.i18n come from WordPress: Chakra and our code must share one React, or children fail to render.
        external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@wordpress/i18n'],
        output: {
          assetFileNames: `${name}.[ext]`,
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            'react-dom/client': 'ReactDOM',
            'react/jsx-runtime': 'ReactJSXRuntime',
            'react/jsx-dev-runtime': 'ReactJSXRuntime',
            '@wordpress/i18n': 'wp.i18n',
          },
        },
      },
    },
  }
})
