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
        // Ensure perfumery.db is bundled alongside the server runtime for Vercel / serverless deployments
        const possibleDbSources = [
          path.resolve(nitro.options.srcDir, 'server/data/perfumery.db'),
          path.resolve(nitro.options.rootDir, 'server/data/perfumery.db'),
          path.resolve(nitro.options.rootDir, 'app/server/data/perfumery.db'),
        ]
        const srcDb = possibleDbSources.find(p => fs.existsSync(p))
        if (srcDb && nitro.options.output?.serverDir) {
          const destDir = path.resolve(nitro.options.output.serverDir, 'data')
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true })
          }
          const destDb = path.resolve(destDir, 'perfumery.db')
          fs.copyFileSync(srcDb, destDb)
          console.log(`[nitro] ✓ Bundled SQLite database to ${destDb}`)
        }
      })
    },
  },
})
