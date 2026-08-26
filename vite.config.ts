import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { createVitestExclude } from './scripts/lib/vitest-exclude.js'

const directoryEntryPaths = new Set(['/dakota', '/server', '/wolves'])

function redirectDirectoryEntries(): Plugin {
  return {
    name: 'redirect-directory-entries',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!directoryEntryPaths.has(url.pathname)) {
          next()
          return
        }

        res.writeHead(302, { Location: `${url.pathname}/${url.search}` })
        res.end()
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    environment: 'happy-dom',
    exclude: createVitestExclude(),
    coverage: {
      provider: 'v8',
      // Count every source file, not only files imported by tests, so that
      // untested components cannot sit at 0% outside the report.
      include: ['src/**'],
      reporter: ['text', 'lcov'],
      thresholds: {
        // Ratchet ~3pt below the LOWEST measured figure across supported Node
        // versions. v8 coverage is Node-version sensitive: the same commit
        // measures 77.8/67.3/79.5/77.6 on Node 24 (CI) but 73.6/65.1/77.6/73.2
        // on Node 22, a ~4pt spread. Thresholds set against the CI figure alone
        // fail for contributors on Node 22, so floor them against the lower
        // number and keep margin for churn.
        'statements': 70,
        'branches': 62,
        'functions': 74,
        'lines': 70,
        // Backstop for Vue components (measured 72.3/62.8/76.6/71.7 on Node 22)
        // so component coverage cannot regress behind a healthy global average.
        'src/components/**': {
          statements: 68,
          branches: 58,
          functions: 72,
          lines: 68,
        },
      },
    },
  },
  plugins: [
    redirectDirectoryEntries(),
    tailwindcss(),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag.startsWith('google-cast-')
        }
      }
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        'main': resolve(__dirname, 'index.html'),
        'testing': resolve(__dirname, 'public/testing.html'),
        'dakota': resolve(__dirname, 'dakota/index.html'),
        'server': resolve(__dirname, 'server/index.html'),
        'wolves': resolve(__dirname, 'wolves/index.html'),
        'wolves/experience': resolve(__dirname, 'wolves/experience/index.html'),
      },
      output: {
        manualChunks: (id: string) => {
          if (['vue', 'vue-i18n'].some(mod => id.includes(`/node_modules/${mod}`))) {
            return 'vue-vendor'
          }
          if (id.includes('/node_modules/@iconify-prerendered/vue-mdi')) {
            return 'ui-icons'
          }
          if (['marked', 'js-yaml', '@vueuse/core', '@vueuse/components'].some(mod => id.includes(`/node_modules/${mod}`))) {
            return 'utils'
          }
          return undefined
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
      '@/components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@/composables': fileURLToPath(new URL('./src/composables', import.meta.url)),
      '@/utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
    },
  },
})
