import path from 'node:path'
import fs from 'node:fs'
import statsFallback from '../data/stats.json'

function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

let _db: any = null
let _triedLoadingSqlite = false
let DatabaseSyncClass: any = null

function getSqliteClass(): any {
  if (_triedLoadingSqlite) return DatabaseSyncClass
  _triedLoadingSqlite = true
  try {
    const req = typeof require !== 'undefined' ? require : null
    if (req) {
      DatabaseSyncClass = req('node:sqlite').DatabaseSync
    }
  } catch {
    DatabaseSyncClass = null
  }
  return DatabaseSyncClass
}

export function getDatabase(): any {
  if (_db) return _db

  const SqliteClass = getSqliteClass()
  if (!SqliteClass) {
    return null
  }

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

  let dbPath = possiblePaths.find((p) => fs.existsSync(p))

  if (!dbPath) {
    try {
      const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(new URL(import.meta.url).pathname)
      const relPaths = [
        path.resolve(dirname, '../data/perfumery.db'),
        path.resolve(dirname, '../../data/perfumery.db'),
        path.resolve(dirname, 'data/perfumery.db'),
        path.resolve(dirname, '../../../data/perfumery.db'),
      ]
      dbPath = relPaths.find((p) => fs.existsSync(p))
    } catch {}
  }

  if (!dbPath) {
    return null
  }

  try {
    _db = new SqliteClass(dbPath, { open: true, readOnly: true })
    return _db
  } catch (e) {
    console.warn('[db] Failed to open SQLite file:', e)
    return null
  }
}

let _catalogue: any = null

function getCatalogueData(): any {
  if (_catalogue) return _catalogue

  const cwd = process.cwd()
  const possiblePaths = [
    path.resolve(cwd, 'server/data/catalogue.json'),
    path.resolve(cwd, 'app/server/data/catalogue.json'),
    path.resolve(cwd, 'data/catalogue.json'),
    path.resolve(cwd, 'public/data/leaderboard.json'),
    path.resolve(cwd, 'app/public/data/leaderboard.json'),
    '/var/task/data/catalogue.json',
    '/var/task/server/data/catalogue.json',
  ]

  const filePath = possiblePaths.find((p) => fs.existsSync(p))
  if (filePath) {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      if (raw.perfumes && Array.isArray(raw.perfumes)) {
        _catalogue = raw
      } else if (raw.leaderboard && Array.isArray(raw.leaderboard)) {
        _catalogue = {
          meta: raw.meta || {},
          regions: raw.regions || {},
          categories: raw.categories || {},
          topContributors: raw.topContributors || [],
          totalPerfumes: raw.leaderboard.length,
          perfumes: raw.leaderboard.map((p: any) => ({ ...p, slug: p.slug || slugify(p.name) })),
        }
      }
    } catch (e) {
      console.warn('[db] Failed to parse catalogue JSON:', e)
    }
  }

  if (!_catalogue) {
    _catalogue = {
      meta: statsFallback.meta || {},
      regions: statsFallback.regions || {},
      categories: statsFallback.categories || {},
      topContributors: statsFallback.topContributors || [],
      totalPerfumes: statsFallback.totalPerfumes || 0,
      perfumes: [],
    }
  }

  return _catalogue
}

export function getCatalogueStats() {
  try {
    const db = getDatabase()
    if (db) {
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
        meta: metaMap.get('meta') || statsFallback.meta || {},
        regions: metaMap.get('regions') || statsFallback.regions || {},
        categories: metaMap.get('categories') || statsFallback.categories || {},
        topContributors: metaMap.get('topContributors') || statsFallback.topContributors || [],
        totalPerfumes: countRow?.total || statsFallback.totalPerfumes || 0,
      }
    }
  } catch (err) {
    console.warn('[db] SQLite stats query failed, using static fallback:', err)
  }

  const cat = getCatalogueData()
  return {
    meta: cat.meta || statsFallback.meta || {},
    regions: cat.regions || statsFallback.regions || {},
    categories: cat.categories || statsFallback.categories || {},
    topContributors: cat.topContributors || statsFallback.topContributors || [],
    totalPerfumes: cat.totalPerfumes || statsFallback.totalPerfumes || 0,
  }
}

export interface PerfumesQueryOptions {
  page?: number
  limit?: number
  search?: string
  category?: string
  region?: string
  notes?: string
  source?: string
  sortBy?: string
  sortOrder?: string
}

export function getPerfumesList(query: PerfumesQueryOptions) {
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(5, query.limit || 25))
  const offset = (page - 1) * limit
  const search = (query.search || '').trim().toLowerCase()
  const category = (query.category || '').trim()
  const region = (query.region || '').trim()
  const notes = (query.notes || '').trim()
  const source = (query.source || 'all').trim().toLowerCase()
  const sortByRaw = (query.sortBy || 'mentionCount').trim().toLowerCase()
  const sortOrder = (query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  try {
    const db = getDatabase()
    if (db) {
      const conditions: string[] = []
      const params: any[] = []

      if (search) {
        conditions.push('(name LIKE ? OR brand LIKE ? OR notes_json LIKE ? OR description LIKE ?)')
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      }

      if (category && category !== 'all') {
        conditions.push('category = ?')
        params.push(category)
      }

      if (region && region !== 'all' && region !== 'ALL') {
        conditions.push('region = ?')
        params.push(region)
      }

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

      if (source === 'discord') {
        conditions.push("json_extract(sources_json, '$.discord.mentionCount') > 0")
      } else if (source === 'reddit') {
        conditions.push("json_extract(sources_json, '$.reddit.mentionCount') > 0")
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

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
        if (source === 'discord') {
          orderColumn = "json_extract(sources_json, '$.discord.mentionCount')"
        } else if (source === 'reddit') {
          orderColumn = "json_extract(sources_json, '$.reddit.mentionCount')"
        } else {
          orderColumn = 'mention_count'
        }
      }

      const countSql = `SELECT COUNT(*) as total FROM perfumes ${whereClause}`
      const countResult = db.prepare(countSql).get(...params) as { total: number }
      const total = countResult?.total || 0
      const totalPages = Math.ceil(total / limit)

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
        pagination: { page, limit, total, totalPages },
      }
    }
  } catch (err) {
    console.warn('[db] SQLite perfumes query failed, using in-memory catalogue:', err)
  }

  const cat = getCatalogueData()
  let list: any[] = [...(cat.perfumes || [])]

  if (search) {
    list = list.filter(
      (p: any) =>
        (p.name && p.name.toLowerCase().includes(search)) ||
        (p.brand && p.brand.toLowerCase().includes(search)) ||
        (p.description && p.description.toLowerCase().includes(search)) ||
        (Array.isArray(p.notes) && p.notes.some((n: string) => n.toLowerCase().includes(search)))
    )
  }

  if (category && category !== 'all') {
    list = list.filter((p: any) => p.category?.toLowerCase() === category.toLowerCase())
  }

  if (region && region !== 'all' && region !== 'ALL') {
    list = list.filter((p: any) => p.region?.toLowerCase() === region.toLowerCase())
  }

  if (notes) {
    const noteList = notes.split(',').map((n) => n.trim().toLowerCase()).filter(Boolean)
    if (noteList.length > 0) {
      list = list.filter((p: any) => {
        const allNotes = [...(p.notes || []), ...(p.topNotes || [])].map((n: string) => n.toLowerCase())
        return noteList.some((nl) => allNotes.some((an) => an.includes(nl)))
      })
    }
  }

  if (source === 'discord') {
    list = list.filter((p: any) => (p.sources?.discord?.mentionCount || 0) > 0)
  } else if (source === 'reddit') {
    list = list.filter((p: any) => (p.sources?.reddit?.mentionCount || 0) > 0)
  }

  const total = list.length
  const totalPages = Math.ceil(total / limit)

  list.sort((a: any, b: any) => {
    let valA = a.mentionCount || 0
    let valB = b.mentionCount || 0

    if (sortByRaw === 'rank') {
      valA = a.rank ?? 999999
      valB = b.rank ?? 999999
    } else if (sortByRaw === 'name') {
      return sortOrder === 'ASC'
        ? (a.name || '').localeCompare(b.name || '')
        : (b.name || '').localeCompare(a.name || '')
    } else if (sortByRaw === 'threads' || sortByRaw === 'threadcount') {
      valA = a.threadCount || 0
      valB = b.threadCount || 0
    } else if (sortByRaw === 'authors' || sortByRaw === 'uniqueauthors') {
      valA = a.uniqueAuthors || 0
      valB = b.uniqueAuthors || 0
    } else {
      if (source === 'discord') {
        valA = a.sources?.discord?.mentionCount || 0
        valB = b.sources?.discord?.mentionCount || 0
      } else if (source === 'reddit') {
        valA = a.sources?.reddit?.mentionCount || 0
        valB = b.sources?.reddit?.mentionCount || 0
      }
    }

    return sortOrder === 'ASC' ? valA - valB : valB - valA
  })

  const paged = list.slice(offset, offset + limit).map((p: any) => {
    let mentionCount = p.mentionCount || 0
    if (source === 'discord' && p.sources?.discord) {
      mentionCount = p.sources.discord.mentionCount || 0
    } else if (source === 'reddit' && p.sources?.reddit) {
      mentionCount = p.sources.reddit.mentionCount || 0
    }

    return {
      rank: p.rank,
      name: p.name,
      brand: p.brand,
      region: p.region,
      countryCode: p.countryCode,
      category: p.category,
      gender: p.gender,
      description: p.description,
      mentionCount,
      threadCount: p.threadCount || 0,
      directKeywordMentions: p.directKeywordMentions || 0,
      uniqueAuthors: p.uniqueAuthors || 0,
      firstMentioned: p.firstMentioned || '',
      lastMentioned: p.lastMentioned || '',
      notes: p.notes || [],
      topNotes: p.topNotes || [],
      sources: p.sources || {},
      yearlyMentions: p.yearlyMentions || {},
      accordDistribution: p.accordDistribution || {},
      coMentions: p.coMentions || [],
    }
  })

  return {
    items: paged,
    pagination: { page, limit, total, totalPages },
  }
}

export function getPerfumeDetails(slug: string) {
  try {
    const db = getDatabase()
    if (db) {
      const row = db.prepare(`
        SELECT
          slug, rank, name, brand, region, country_code, category, gender, description,
          mention_count, thread_count, direct_keyword_mentions, unique_authors,
          first_mentioned, last_mentioned,
          notes_json, top_notes_json, sources_json, yearly_mentions_json, accord_dist_json, co_mentions_json
        FROM perfumes
        WHERE slug = ?
      `).get(slug) as any

      if (row) {
        const mentions = db.prepare(`
          SELECT author, content, timestamp, source, url, score
          FROM sample_mentions
          WHERE perfume_slug = ?
          ORDER BY score DESC, timestamp DESC
          LIMIT 25
        `).all(slug) as any[]

        const threadRows = db.prepare(`
          SELECT data_json
          FROM threads
          WHERE perfume_slug = ?
          LIMIT 10
        `).all(slug) as Array<{ data_json: string }>

        const threads = threadRows
          .map((t) => {
            try {
              return JSON.parse(t.data_json)
            } catch {
              return null
            }
          })
          .filter(Boolean)

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
      }
    }
  } catch (err) {
    console.warn('[db] SQLite perfume detail query failed, using in-memory catalogue:', err)
  }

  const cat = getCatalogueData()
  const item = (cat.perfumes || []).find((p: any) => p.slug === slug || slugify(p.name) === slug)
  if (!item) {
    return null
  }

  return {
    perfume: {
      rank: item.rank,
      name: item.name,
      brand: item.brand,
      region: item.region,
      countryCode: item.countryCode,
      category: item.category,
      gender: item.gender,
      description: item.description,
      mentionCount: item.mentionCount || 0,
      threadCount: item.threadCount || 0,
      directKeywordMentions: item.directKeywordMentions || 0,
      uniqueAuthors: item.uniqueAuthors || 0,
      firstMentioned: item.firstMentioned || '',
      lastMentioned: item.lastMentioned || '',
      notes: item.notes || [],
      topNotes: item.topNotes || [],
      sources: item.sources || {},
      yearlyMentions: item.yearlyMentions || {},
      accordDistribution: item.accordDistribution || {},
      coMentions: item.coMentions || [],
      sampleMentions: (item.sampleMentions || []).slice(0, 25),
    },
    threads: [],
  }
}
