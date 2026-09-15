import path from 'node:path'
import fs from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

let _db: DatabaseSync | null = null

export function getDatabase(): DatabaseSync {
  if (_db) return _db

  const cwd = process.cwd()
  const possiblePaths = [
    path.resolve(cwd, 'server/data/perfumery.db'),
    path.resolve(cwd, 'app/server/data/perfumery.db'),
    path.resolve(cwd, 'data/perfumery.db'),
    path.resolve(cwd, '.output/server/data/perfumery.db'),
    path.resolve(cwd, '../server/data/perfumery.db'),
    path.resolve(cwd, '../../server/data/perfumery.db'),
    '/var/task/data/perfumery.db',
    '/var/task/server/data/perfumery.db',
  ]

  let dbPath = possiblePaths.find(p => fs.existsSync(p))

  if (!dbPath) {
    // Fallback: try to find relative to this file / module
    try {
      const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(new URL(import.meta.url).pathname)
      const relPaths = [
        path.resolve(dirname, '../data/perfumery.db'),
        path.resolve(dirname, '../../data/perfumery.db'),
        path.resolve(dirname, 'data/perfumery.db'),
        path.resolve(dirname, '../../../data/perfumery.db'),
      ]
      dbPath = relPaths.find(p => fs.existsSync(p))
    } catch {}
  }

  if (!dbPath) {
    throw new Error(
      `Perfumery SQLite database not found. Looked in:\n${possiblePaths.join('\n')}\nPlease run 'npm run db:build' to generate the database.`
    )
  }

  _db = new DatabaseSync(dbPath, { open: true, readOnly: true })
  return _db
}
