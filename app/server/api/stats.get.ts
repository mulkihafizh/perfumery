import { getDatabase } from '../utils/db'

export default defineEventHandler(() => {
  const db = getDatabase()

  const metaRows = db.prepare('SELECT key, value FROM meta').all() as Array<{ key: string; value: string }>
  const metaMap = new Map<string, any>()
  for (const row of metaRows) {
    try {
      metaMap.set(row.key, JSON.parse(row.value))
    } catch {
      metaMap.set(row.key, row.value)
    }
  }

  const countRow = db.prepare('SELECT COUNT(*) as total FROM perfumes').get() as { total: number }

  return {
    meta: metaMap.get('meta') || {},
    regions: metaMap.get('regions') || {},
    categories: metaMap.get('categories') || {},
    topContributors: metaMap.get('topContributors') || [],
    totalPerfumes: countRow?.total || 0,
  }
})
