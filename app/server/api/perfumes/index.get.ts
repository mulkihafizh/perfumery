import { getPerfumesList } from '../../utils/db'

export default defineEventHandler((event) => {
  const query = getQuery(event)

  return getPerfumesList({
    page: Math.max(1, parseInt(String(query.page || '1'), 10) || 1),
    limit: Math.min(100, Math.max(5, parseInt(String(query.limit || '25'), 10) || 25)),
    search: String(query.search || '').trim(),
    category: String(query.category || '').trim(),
    region: String(query.region || '').trim(),
    notes: String(query.notes || '').trim(),
    source: String(query.source || 'all').trim().toLowerCase(),
    sortBy: String(query.sortBy || 'mentionCount').trim().toLowerCase(),
    sortOrder: String(query.sortOrder || 'desc').trim().toLowerCase(),
  })
})
