import { getDatabase } from '../../utils/db'

export default defineEventHandler((event) => {
  const query = getQuery(event)

  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1)
  const limit = Math.min(100, Math.max(5, parseInt(String(query.limit || '25'), 10) || 25))
  const offset = (page - 1) * limit

  const search = String(query.search || '').trim()
  const category = String(query.category || '').trim()
  const region = String(query.region || '').trim()
  const notes = String(query.notes || '').trim()
  const source = String(query.source || 'all').trim().toLowerCase()
  const sortByRaw = String(query.sortBy || 'mentionCount').trim().toLowerCase()
  const sortOrder = String(query.sortOrder || 'desc').trim().toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  const db = getDatabase()

  const conditions: string[] = []
  const params: any[] = []

  // Search filter (name, brand, notes, description)
  if (search) {
    conditions.push('(name LIKE ? OR brand LIKE ? OR notes_json LIKE ? OR description LIKE ?)')
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  // Category filter
  if (category && category !== 'all') {
    conditions.push('category = ?')
    params.push(category)
  }

  // Region filter
  if (region && region !== 'all' && region !== 'ALL') {
    conditions.push('region = ?')
    params.push(region)
  }

  // Notes / Accord filter (any match)
  if (notes) {
    const noteList = notes.split(',').map((n) => n.trim().toLowerCase()).filter(Boolean)
    if (noteList.length > 0) {
      const noteClauses = noteList.map(() => '(LOWER(notes_json) LIKE ? OR LOWER(top_notes_json) LIKE ?)')
      conditions.push(`(${noteClauses.join(' OR ')})`)
      for (const n of noteList) {
        params.push(`%${n}%`, `%${n}%`)
      }
    }
  }

  // Source filter
  if (source === 'discord') {
    conditions.push("json_extract(sources_json, '$.discord.mentionCount') > 0")
  } else if (source === 'reddit') {
    conditions.push("json_extract(sources_json, '$.reddit.mentionCount') > 0")
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Determine sort column
  let orderColumn = 'mention_count'
  if (sortByRaw === 'rank') {
    orderColumn = 'rank'
  } else if (sortByRaw === 'name') {
    orderColumn = 'name'
  } else if (sortByRaw === 'threads' || sortByRaw === 'threadcount') {
    orderColumn = 'thread_count'
  } else if (sortByRaw === 'authors' || sortByRaw === 'uniqueauthors') {
    orderColumn = 'unique_authors'
  } else {
    // Default to mentions
    if (source === 'discord') {
      orderColumn = "json_extract(sources_json, '$.discord.mentionCount')"
    } else if (source === 'reddit') {
      orderColumn = "json_extract(sources_json, '$.reddit.mentionCount')"
    } else {
      orderColumn = 'mention_count'
    }
  }

  // Count total matches
  const countSql = `SELECT COUNT(*) as total FROM perfumes ${whereClause}`
  const countResult = db.prepare(countSql).get(...params) as { total: number }
  const total = countResult?.total || 0
  const totalPages = Math.ceil(total / limit)

  // Query paginated items
  const dataSql = `
    SELECT
      slug, rank, name, brand, region, country_code, category, gender, description,
      mention_count, thread_count, direct_keyword_mentions, unique_authors,
      first_mentioned, last_mentioned,
      notes_json, top_notes_json, sources_json, yearly_mentions_json, accord_dist_json, co_mentions_json
    FROM perfumes
    ${whereClause}
    ORDER BY ${orderColumn} ${sortOrder}
    LIMIT ? OFFSET ?
  `
  const rows = db.prepare(dataSql).all(...params, limit, offset) as any[]

  const items = rows.map((r) => {
    const sources = JSON.parse(r.sources_json || '{}')
    let mentionCount = r.mention_count
    if (source === 'discord' && sources?.discord) {
      mentionCount = sources.discord.mentionCount || 0
    } else if (source === 'reddit' && sources?.reddit) {
      mentionCount = sources.reddit.mentionCount || 0
    }

    return {
      rank: r.rank,
      name: r.name,
      brand: r.brand,
      region: r.region,
      countryCode: r.country_code,
      category: r.category,
      gender: r.gender,
      description: r.description,
      mentionCount,
      threadCount: r.thread_count,
      directKeywordMentions: r.direct_keyword_mentions,
      uniqueAuthors: r.unique_authors,
      firstMentioned: r.first_mentioned,
      lastMentioned: r.last_mentioned,
      notes: JSON.parse(r.notes_json || '[]'),
      topNotes: JSON.parse(r.top_notes_json || '[]'),
      sources,
      yearlyMentions: JSON.parse(r.yearly_mentions_json || '{}'),
      accordDistribution: JSON.parse(r.accord_dist_json || '{}'),
      coMentions: JSON.parse(r.co_mentions_json || '[]'),
    }
  })

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  }
})
