import type { Ref } from 'vue'

// ─── Types ──────────────────────────────────────────────────────────

export interface SourceBreakdown {
  discord: {
    mentionCount: number
    threadCount: number
    uniqueAuthors: number
  }
  reddit: {
    mentionCount: number
    yearlyBreakdown: Record<string, number>
  }
}

export interface PerfumeEntry {
  rank: number
  name: string
  brand: string
  region: string
  countryCode: string
  category: string
  gender: string
  description?: string
  mentionCount: number
  threadCount: number
  directKeywordMentions: number
  uniqueAuthors: number
  notes: string[]
  catalogNotes?: string[]
  topNotes: string[]
  sampleMentions: Array<{
    author: string
    content: string
    timestamp: string
    source?: 'discord' | 'reddit'
    url?: string
    score?: number
  }>
  coMentions: Array<{
    name: string
    count: number
  }>
  firstMentioned: string
  lastMentioned: string
  sources?: SourceBreakdown
  accordDistribution?: Record<string, number>
  yearlyMentions?: Record<string, number>
}

export interface ThreadMessage {
  id: string
  type: string
  author: string
  authorUsername: string
  timestamp: string
  content: string
  reference: string | null
  attachments: Array<{ fileName: string; url: string }>
  embeds: Array<{ title: string; description: string; url: string }>
}

export interface ConversationThread {
  source?: 'discord' | 'reddit'
  url?: string
  keywordMessage: ThreadMessage
  parentChain: ThreadMessage[]
  replies: ThreadMessage[]
  contextBefore: ThreadMessage[]
  contextAfter: ThreadMessage[]
}

export interface RegionSummary {
  name: string
  countryCode: string
  count: number
  totalMentions: number
  topPerfumes: string[]
}

export interface StatsData {
  meta: {
    keyword: string
    totalMessages: number
    totalThreads: number
    totalPerfumesFound: number
    generatedAt: string
    sources?: {
      discord: { totalMessages: number; generatedAt: string }
      reddit: { totalComments: number; generatedAt: string; yearsRange: string }
    }
  }
  regions: Record<string, RegionSummary>
  categories: Record<string, { count: number; perfumes: string[] }>
  topContributors: Array<{
    name: string
    username: string
    messageCount: number
    perfumesMentioned: number
  }>
  maxMentions: number
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedPerfumesResponse {
  items: PerfumeEntry[]
  pagination: PaginationInfo
}

export type SourceFilter = 'all' | 'discord' | 'reddit'

// ─── Composable ─────────────────────────────────────────────────────

export function usePerfumeData() {
  // Stats overview state
  const stats = useState<StatsData | null>('perfumeStats', () => null)
  const statsLoading = useState('statsLoading', () => false)
  const statsError = useState<string | null>('statsError', () => null)

  // Paginated table state
  const perfumes = useState<PerfumeEntry[]>('paginatedPerfumes', () => [])
  const pagination = useState<PaginationInfo>('perfumePagination', () => ({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  }))
  const tableLoading = useState('tableLoading', () => false)

  // Query filter state
  const searchQuery = useState('perfumeSearchQuery', () => '')
  const activeRegion = useState('perfumeActiveRegion', () => 'ALL')
  const localOnly = useState('perfumeLocalOnly', () => false)
  const activeNotes = useState<string[]>('perfumeActiveNotes', () => [])
  const activeSource = useState<SourceFilter>('perfumeActiveSource', () => 'all')
  const sortBy = useState('perfumeSortBy', () => 'mentionCount')
  const sortAsc = useState('perfumeSortAsc', () => false)

  // Fetch top-level metadata & aggregations (called once)
  async function fetchStats() {
    if (stats.value) return // already loaded

    statsLoading.value = true
    statsError.value = null

    try {
      const res = await $fetch<StatsData>('/api/stats')
      stats.value = res
    } catch (err: any) {
      statsError.value = 'Failed to load catalogue overview statistics'
      console.error('Error loading stats:', err)
    } finally {
      statsLoading.value = false
    }
  }

  // Fetch paginated items with active filters
  async function fetchPerfumes() {
    tableLoading.value = true

    try {
      const regionParam = localOnly.value
        ? 'Indonesia'
        : activeRegion.value !== 'ALL'
          ? activeRegion.value
          : ''

      const notesParam = activeNotes.value.length > 0
        ? activeNotes.value.join(',')
        : ''

      const res = await $fetch<PaginatedPerfumesResponse>('/api/perfumes', {
        params: {
          page: pagination.value.page,
          limit: pagination.value.limit,
          search: searchQuery.value.trim() || undefined,
          region: regionParam || undefined,
          notes: notesParam || undefined,
          source: activeSource.value,
          sortBy: sortBy.value,
          sortOrder: sortAsc.value ? 'asc' : 'desc',
        },
      })

      perfumes.value = res.items
      pagination.value = res.pagination
    } catch (err: any) {
      console.error('Error querying perfumes:', err)
    } finally {
      tableLoading.value = false
    }
  }

  // Helper actions
  function setPage(p: number) {
    if (p < 1 || p > pagination.value.totalPages) return
    pagination.value.page = p
    fetchPerfumes()
  }

  function setLimit(l: number) {
    pagination.value.limit = l
    pagination.value.page = 1
    fetchPerfumes()
  }

  function setSort(key: string) {
    if (sortBy.value === key) {
      sortAsc.value = !sortAsc.value
    } else {
      sortBy.value = key
      sortAsc.value = false
    }
    pagination.value.page = 1
    fetchPerfumes()
  }

  function setSearch(query: string) {
    searchQuery.value = query
    pagination.value.page = 1
    fetchPerfumes()
  }

  function setRegion(region: string) {
    if (region === 'Indonesia') {
      localOnly.value = true
      activeRegion.value = 'Indonesia'
    } else {
      localOnly.value = false
      activeRegion.value = region
    }
    pagination.value.page = 1
    fetchPerfumes()
  }

  function setNotes(notes: string[]) {
    activeNotes.value = notes
    pagination.value.page = 1
    fetchPerfumes()
  }

  function setSource(source: SourceFilter) {
    activeSource.value = source
    pagination.value.page = 1
    fetchPerfumes()
  }

  function resetFilters() {
    searchQuery.value = ''
    activeRegion.value = 'ALL'
    localOnly.value = false
    activeNotes.value = []
    activeSource.value = 'all'
    sortBy.value = 'mentionCount'
    sortAsc.value = false
    pagination.value.page = 1
    fetchPerfumes()
  }

  // Computed properties
  const meta = computed(() => stats.value?.meta ?? null)
  const regions = computed(() => stats.value?.regions ?? {})
  const categories = computed(() => stats.value?.categories ?? {})
  const topContributors = computed(() => stats.value?.topContributors ?? [])
  const maxMentions = computed(() => stats.value?.maxMentions ?? 1)

  return {
    // Stats & metadata
    stats,
    meta,
    regions,
    categories,
    topContributors,
    maxMentions,
    loading: statsLoading,
    error: statsError,
    fetchData: fetchStats,

    // Paginated list
    perfumes,
    pagination,
    tableLoading,
    fetchPerfumes,

    // Filter state & setters
    searchQuery,
    activeRegion,
    localOnly,
    activeNotes,
    activeSource,
    sortBy,
    sortAsc,
    setPage,
    setLimit,
    setSort,
    setSearch,
    setRegion,
    setNotes,
    setSource,
    resetFilters,
  }
}

// ─── Utilities ──────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getRegionFlag(region: string): string {
  switch (region) {
    case 'Indonesia': return '🇮🇩'
    case 'Middle East': return '🇦🇪'
    case 'France': return '🇫🇷'
    case 'Italy': return '🇮🇹'
    case 'United States': return '🇺🇸'
    case 'Niche Houses': return '👑'
    case 'Europe': return '🇪🇺'
    default: return '🌎'
  }
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
