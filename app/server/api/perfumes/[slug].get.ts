import { getDatabase } from '../../utils/db'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Slug parameter is required' })
  }

  const db = getDatabase()

  const row = db.prepare(`
    SELECT
      slug, rank, name, brand, region, country_code, category, gender, description,
      mention_count, thread_count, direct_keyword_mentions, unique_authors,
      first_mentioned, last_mentioned,
      notes_json, top_notes_json, sources_json, yearly_mentions_json, accord_dist_json, co_mentions_json
    FROM perfumes
    WHERE slug = ?
  `).get(slug) as any

  if (!row) {
    throw createError({ statusCode: 404, message: `Perfume '${slug}' not found` })
  }

  // Fetch sample mentions
  const mentions = db.prepare(`
    SELECT author, content, timestamp, source, url, score
    FROM sample_mentions
    WHERE perfume_slug = ?
    ORDER BY score DESC, timestamp DESC
    LIMIT 25
  `).all(slug) as any[]

  // Fetch threads
  const threadRows = db.prepare(`
    SELECT data_json
    FROM threads
    WHERE perfume_slug = ?
    LIMIT 10
  `).all(slug) as Array<{ data_json: string }>

  const threads = threadRows.map((t) => {
    try {
      return JSON.parse(t.data_json)
    } catch {
      return null
    }
  }).filter(Boolean)

  return {
    perfume: {
      rank: row.rank,
      name: row.name,
      brand: row.brand,
      region: row.region,
      countryCode: row.country_code,
      category: row.category,
      gender: row.gender,
      description: row.description,
      mentionCount: row.mention_count,
      threadCount: row.thread_count,
      directKeywordMentions: row.direct_keyword_mentions,
      uniqueAuthors: row.unique_authors,
      firstMentioned: row.first_mentioned,
      lastMentioned: row.last_mentioned,
      notes: JSON.parse(row.notes_json || '[]'),
      topNotes: JSON.parse(row.top_notes_json || '[]'),
      sources: JSON.parse(row.sources_json || '{}'),
      yearlyMentions: JSON.parse(row.yearly_mentions_json || '{}'),
      accordDistribution: JSON.parse(row.accord_dist_json || '{}'),
      coMentions: JSON.parse(row.co_mentions_json || '[]'),
      sampleMentions: mentions,
    },
    threads,
  }
})
