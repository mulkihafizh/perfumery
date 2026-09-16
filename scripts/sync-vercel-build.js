import fs from 'node:fs'
import path from 'node:path'

console.log('[build-sync] Synchronizing build outputs for Vercel deployment...')

if (fs.existsSync('app/.vercel/output')) {
  if (!fs.existsSync('.vercel')) {
    fs.mkdirSync('.vercel', { recursive: true })
  }
  fs.cpSync('app/.vercel/output', '.vercel/output', { recursive: true })
  console.log('[build-sync] ✓ Mirrored app/.vercel/output to .vercel/output')
}

if (fs.existsSync('app/.output')) {
  fs.cpSync('app/.output', '.output', { recursive: true })
  console.log('[build-sync] ✓ Mirrored app/.output to .output')
}

console.log('[build-sync] Ready for Vercel deployment.')
