/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

/**
 * Moteur de lecture d'étiquette (Tesseract) servi par l'appli elle-même dans
 * /ocr/ : pas de CDN tiers. Copié depuis node_modules à la construction.
 */
const FICHIERS_OCR: Record<string, string> = {
  'worker.min.js': 'tesseract.js/dist/worker.min.js',
  'tesseract-core-lstm.wasm.js': 'tesseract.js-core/tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'fra.traineddata.gz': '@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz',
}
const lireOcr = (nom: string) => readFileSync(fileURLToPath(new URL(`./node_modules/${FICHIERS_OCR[nom]}`, import.meta.url)))

function moteurOcr(): Plugin {
  return {
    name: 'moteur-ocr',
    configureServer(serveur) {
      serveur.middlewares.use((req, res, suite) => {
        const nom = req.url?.split('?')[0].split('/ocr/')[1]
        if (!nom || !(nom in FICHIERS_OCR)) return suite()
        res.setHeader('Content-Type', nom.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
        res.end(lireOcr(nom))
      })
    },
    generateBundle() {
      for (const nom of Object.keys(FICHIERS_OCR)) this.emitFile({ type: 'asset', fileName: `ocr/${nom}`, source: lireOcr(nom) })
    },
  }
}

// Sur GitHub Pages l'appli est servie sous /<nom-du-depot>/ :
// le workflow de déploiement passe ce chemin via VITE_BASE.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    vue(),
    moteurOcr(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Œnoleptica',
        short_name: 'Œnoleptica',
        description: 'Ma cave à vin, dans ma poche : vins, vignerons, stock et profils organoleptiques.',
        lang: 'fr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#4A1325',
        theme_color: '#4A1325',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // le moteur SQLite (.wasm) doit être disponible hors ligne
        globPatterns: ['**/*.{js,css,html,wasm,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // le moteur de lecture d'étiquette n'est téléchargé qu'au premier usage
        globIgnores: ['ocr/**'],
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.includes('/ocr/'),
          handler: 'CacheFirst',
          options: { cacheName: 'moteur-ocr', expiration: { maxEntries: 10 } },
        }],
      },
    }),
  ],
  worker: { format: 'es' },
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
