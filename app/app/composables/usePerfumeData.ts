import type { Ref } from 'vue'

// ─── Types ──────────────────────────────────────────────────────────

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
  }>
  coMentions: Array<{
    name: string
    count: number
  }>
  firstMentioned: string
  lastMentioned: string
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

export interface LeaderboardData {
  meta: {
    keyword: string
    totalMessages: number
    totalThreads: number
    totalPerfumesFound: number
    generatedAt: string
  }
  leaderboard: PerfumeEntry[]
  regions: Record<string, RegionSummary>
  categories: Record<string, { count: number; perfumes: string[] }>
  topContributors: Array<{
    name: string
    username: string
    messageCount: number
    perfumesMentioned: number
  }>
  threads: ConversationThread[]
}

// ─── Composable ─────────────────────────────────────────────────────

export function usePerfumeData() {
  const data: Ref<LeaderboardData | null> = useState<LeaderboardData | null>('perfumeData', () => null)
  const loading = useState('perfumeLoading', () => false)
  const error = useState<string | null>('perfumeError', () => null)

  async function fetchData() {
    if (data.value) return // Already loaded

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<LeaderboardData>('/data/leaderboard.json')
      data.value = response
    } catch (err) {
      error.value = 'Failed to load leaderboard data'
      console.error('Error loading perfume data:', err)
    } finally {
      loading.value = false
    }
  }

  // ─── Derived data ─────────────────────────────────────────────────

  const leaderboard = computed(() => data.value?.leaderboard ?? [])
  const meta = computed(() => data.value?.meta ?? null)
  const regions = computed(() => data.value?.regions ?? {})
  const categories = computed(() => data.value?.categories ?? {})
  const topContributors = computed(() => data.value?.topContributors ?? [])
  const threads = computed(() => data.value?.threads ?? [])

  const maxMentions = computed(() => {
    if (!leaderboard.value.length) return 1
    return Math.max(...leaderboard.value.map(p => p.mentionCount))
  })

  function getPerfumeBySlug(slug: string): PerfumeEntry | undefined {
    return leaderboard.value.find(
      p => slugify(p.name) === slug
    )
  }

  function getThreadsForPerfume(perfumeName: string): ConversationThread[] {
    if (!threads.value.length) return []

    const nameLower = perfumeName.toLowerCase()
    return threads.value.filter(thread => {
      const allText = [
        thread.keywordMessage.content,
        ...thread.parentChain.map(m => m.content),
        ...thread.replies.map(m => m.content),
        ...thread.contextBefore.map(m => m.content),
        ...thread.contextAfter.map(m => m.content),
      ].join(' ').toLowerCase()

      return allText.includes(nameLower)
    })
  }

  return {
    data,
    loading,
    error,
    fetchData,
    leaderboard,
    meta,
    regions,
    categories,
    topContributors,
    threads,
    maxMentions,
    getPerfumeBySlug,
    getThreadsForPerfume,
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
