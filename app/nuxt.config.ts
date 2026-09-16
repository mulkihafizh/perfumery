import path from 'node:path'
import fs from 'node:fs'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  app: {
    head: {
      title: 'Perfumery Leaderboard — Community Fragrance Rankings',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Discover the most discussed and recommended perfumes from the Motion Ime Discord community and r/fragrance Reddit. Browse rankings, scent notes, and real conversations.',
        },
        { name: 'theme-color', content: '#0e0e11' },
      ],
    },
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
    '@nuxt/icon',
  ],

  googleFonts: {
    families: {
      'Plus+Jakarta+Sans': [400, 500, 600, 700],
    },
    display: 'swap',
    download: true,
    inject: true,
  },

  css: ['~/assets/css/main.css'],

  hooks: {
    'nitro:init'(nitro) {
      nitro.hooks.hook('compiled', (nitro) => {
        // Ensure server data files are bundled alongside the server runtime for Vercel / serverless deployments
        const dataDirs = [
          path.resolve(nitro.options.srcDir, 'server/data'),
          path.resolve(nitro.options.rootDir, 'server/data'),
          path.resolve(nitro.options.rootDir, 'app/server/data'),
        ]
        const srcDataDir = dataDirs.find(d => fs.existsSync(d))
        if (srcDataDir && nitro.options.output?.serverDir) {
          const destDir = path.resolve(nitro.options.output.serverDir, 'data')
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true })
          }
          for (const file of fs.readdirSync(srcDataDir)) {
            const srcFile = path.resolve(srcDataDir, file)
            const destFile = path.resolve(destDir, file)
            if (fs.statSync(srcFile).isFile()) {
              fs.copyFileSync(srcFile, destFile)
              console.log(`[nitro] ✓ Bundled ${file} to ${destFile}`)
            }
          }
        }
      })
    },
  },
})
