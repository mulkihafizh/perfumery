<template>
  <div class="min-h-screen bg-[#0e0e11] text-[#d4d4d8]">
    <!-- Loading State -->
    <div v-if="loading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div class="inline-block w-8 h-8 border-2 border-neutral-700 border-t-neutral-200 rounded-full animate-spin mb-4" />
      <p class="text-xs font-mono uppercase tracking-widest text-neutral-400">Loading catalogue record...</p>
    </div>

    <!-- Not Found State -->
    <div v-else-if="!perfume" class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <Icon name="lucide:file-question" class="w-12 h-12 mx-auto text-neutral-600 mb-4" />
      <h1 class="text-xl font-bold uppercase tracking-tight text-neutral-100 mb-2">
        Catalogue Record Not Found
      </h1>
      <p class="text-sm text-neutral-400 mb-6">
        The requested perfume line does not appear in the current indexed community ranking.
      </p>
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 px-4 py-2 border border-[#232328] bg-[#151519] text-xs font-mono uppercase tracking-wider text-neutral-200 hover:bg-[#1b1b22] hover:border-neutral-500 transition-colors"
      >
        <Icon name="lucide:arrow-left" class="w-4 h-4" />
        <span>Return to Master Leaderboard</span>
      </NuxtLink>
    </div>

    <!-- Detail Spec Sheet Content -->
    <div v-else>
      <!-- Editorial Masthead / Header -->
      <header class="border-b border-[#232328] bg-[#121216]/60">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <NuxtLink
            to="/"
            class="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-neutral-100 transition-colors mb-6 group"
          >
            <Icon name="lucide:arrow-left" class="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Catalogue Archive</span>
          </NuxtLink>

          <div class="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div class="max-w-3xl">
              <!-- Meta Tags Spec Row -->
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 border border-[#232328] bg-[#151519] text-neutral-300 font-medium">
                  <span>{{ getRegionFlag(perfume.region) }}</span>
                  <span>{{ perfume.region }}</span>
                </span>
                <span class="text-[10px] font-mono uppercase px-2 py-0.5 border border-[#232328] bg-[#151519] text-neutral-400">
                  {{ perfume.category }}
                </span>
                <span v-if="perfume.gender" class="text-[10px] font-mono uppercase px-2 py-0.5 border border-[#232328] bg-[#151519] text-neutral-400">
                  {{ perfume.gender }}
                </span>
                <span v-if="perfume.region === 'Indonesia'" class="text-[10px] font-mono uppercase px-2 py-0.5 border border-amber-800/80 bg-amber-950/40 text-amber-300 font-semibold">
                  🇮🇩 Local Atelier
                </span>
              </div>

              <!-- Brand & Name -->
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400 font-mono mb-1">
                {{ perfume.brand }}
              </div>
              <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-100 uppercase">
                {{ perfume.name }}
              </h1>

              <!-- Description -->
              <p v-if="perfume.description" class="mt-3 text-sm sm:text-base text-neutral-400 leading-relaxed max-w-2xl font-sans">
                {{ perfume.description }}
              </p>

              <!-- Top Notes / Accords -->
              <div class="flex flex-wrap gap-1.5 mt-4">
                <NotesBadge
                  v-for="note in perfume.topNotes"
                  :key="note"
                  :note="note"
                />
              </div>
            </div>

            <!-- Architectural Rank Box -->
            <div class="border border-[#232328] bg-[#151519] p-4 sm:p-5 flex md:flex-col items-center justify-between md:justify-center shrink-0 min-w-[140px] text-center">
              <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                Archive Index
              </span>
              <div class="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-neutral-100 my-1">
                #{{ perfume.rank }}
              </div>
              <span class="font-mono text-[10px] text-neutral-400">
                Rank in Corpus
              </span>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <!-- 4-Stat Spec Sheet Grid -->
        <section>
          <div class="grid grid-cols-2 md:grid-cols-4 border border-[#232328] bg-[#151519] divide-y md:divide-y-0 md:divide-x divide-[#232328]">
            <div class="p-4 sm:p-5">
              <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 block mb-1">
                Total Mentions
              </span>
              <div class="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-neutral-100">
                {{ perfume.mentionCount }}
              </div>
              <div class="text-[11px] text-neutral-400 mt-1 font-mono">Aggregated volume</div>
            </div>

            <div class="p-4 sm:p-5">
              <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 block mb-1">
                Discussion Threads
              </span>
              <div class="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-neutral-100">
                {{ perfume.threadCount }}
              </div>
              <div class="text-[11px] text-neutral-400 mt-1 font-mono">Conversational sessions</div>
            </div>

            <div class="p-4 sm:p-5">
              <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 block mb-1">
                Unique Members
              </span>
              <div class="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-neutral-100">
                {{ perfume.uniqueAuthors }}
              </div>
              <div class="text-[11px] text-neutral-400 mt-1 font-mono">Distinct community voices</div>
            </div>

            <div class="p-4 sm:p-5">
              <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 block mb-1">
                Direct Keyword Hits
              </span>
              <div class="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-neutral-100">
                {{ perfume.directKeywordMentions || perfume.mentionCount }}
              </div>
              <div class="text-[11px] text-neutral-400 mt-1 font-mono">Exact line mentions</div>
            </div>
          </div>
        </section>

        <!-- Activity Timeline & Provenance -->
        <section class="border border-[#232328] bg-[#151519] p-5">
          <div class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 mb-3">
            Discussion Temporal Interval
          </div>
          <div class="flex items-center justify-between text-xs font-mono text-neutral-300">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 bg-neutral-400" />
              <span>Earliest: {{ formatDate(perfume.firstMentioned) }}</span>
            </div>
            <div class="flex-1 mx-4 border-t border-dashed border-neutral-700" />
            <div class="flex items-center gap-2">
              <span>Latest: {{ formatDate(perfume.lastMentioned) }}</span>
              <span class="w-2 h-2 bg-neutral-400" />
            </div>
          </div>
        </section>

        <!-- Platform Source Partition Breakdown -->
        <section
          v-if="perfume.sources && (perfume.sources.discord.mentionCount || perfume.sources.reddit.mentionCount)"
          class="border border-[#232328] bg-[#151519] p-5"
        >
          <div class="flex items-center justify-between mb-3">
            <div>
              <h2 class="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
                Platform Distribution Partition
              </h2>
              <p class="text-xs text-neutral-400 mt-0.5">
                Proportion of mentions sourced from each indexed community
              </p>
            </div>
            <div class="flex items-center gap-4 text-xs font-mono">
              <span class="inline-flex items-center gap-1.5 text-indigo-300">
                <Icon name="lucide:message-square" class="w-3.5 h-3.5 text-indigo-400" />
                <span>Discord: {{ perfume.sources.discord.mentionCount }} ({{ discordPct }}%)</span>
              </span>
              <span class="inline-flex items-center gap-1.5 text-orange-300">
                <Icon name="lucide:message-circle" class="w-3.5 h-3.5 text-orange-400" />
                <span>Reddit: {{ perfume.sources.reddit.mentionCount }} ({{ redditPct }}%)</span>
              </span>
            </div>
          </div>

          <!-- Minimalist Solid Bar Partition -->
          <div class="w-full h-3 bg-[#0e0e11] border border-[#232328] flex overflow-hidden">
            <div
              v-if="perfume.sources.discord.mentionCount"
              class="h-full bg-indigo-500/80 transition-all"
              :style="{ width: `${discordPct}%` }"
              :title="`Discord: ${perfume.sources.discord.mentionCount} mentions`"
            />
            <div
              v-if="perfume.sources.reddit.mentionCount"
              class="h-full bg-orange-500/80 transition-all"
              :style="{ width: `${redditPct}%` }"
              :title="`Reddit: ${perfume.sources.reddit.mentionCount} mentions`"
            />
          </div>
        </section>

        <!-- Yearly Heatmap Matrix -->
        <section
          v-if="perfume.yearlyMentions && sortedYears.length"
          class="border border-[#232328] bg-[#151519] p-5"
        >
          <div class="mb-3">
            <h2 class="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
              Longitudinal Velocity Matrix (Yearly Volume)
            </h2>
            <p class="text-xs text-neutral-400 mt-0.5">
              Historical mention distribution across archive years
            </p>
          </div>

          <div class="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 border border-[#232328] divide-x divide-y sm:divide-y-0 divide-[#232328] bg-[#0e0e11]">
            <div
              v-for="year in sortedYears"
              :key="year"
              class="p-3 text-center"
            >
              <div class="text-[10px] font-mono text-neutral-400">{{ year }}</div>
              <div class="font-mono text-base font-bold tabular-nums text-neutral-100 mt-1">
                {{ perfume.yearlyMentions[year] || 0 }}
              </div>
            </div>
          </div>
        </section>

        <!-- Reddit Olfactory Accord Distribution -->
        <section
          v-if="perfume.accordDistribution && sortedAccords.length"
          class="border border-[#232328] bg-[#151519] p-5"
        >
          <div class="mb-4">
            <h2 class="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
              Olfactory Accord Concordance (Reddit r/fragrance)
            </h2>
            <p class="text-xs text-neutral-400 mt-0.5">
              Accords and scent descriptors co-referenced with this fragrance
            </p>
          </div>

          <div class="space-y-2 max-w-2xl">
            <div
              v-for="[accord, count] in sortedAccords"
              :key="accord"
              class="flex items-center gap-3 text-xs"
            >
              <span class="w-24 font-mono capitalize text-neutral-300 truncate">{{ accord }}</span>
              <div class="flex-1 h-2 bg-[#0e0e11] border border-[#232328] overflow-hidden">
                <div
                  class="h-full bg-stone-400"
                  :style="{ width: `${(count / maxAccordCount) * 100}%` }"
                />
              </div>
              <span class="w-10 font-mono text-right tabular-nums text-neutral-400">{{ count }}</span>
            </div>
          </div>
        </section>

        <!-- Frequently Compared / Co-Mentions -->
        <section v-if="perfume.coMentions.length" class="border border-[#232328] bg-[#151519] p-5">
          <div class="mb-3">
            <h2 class="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
              Frequently Associated Formulations
            </h2>
            <p class="text-xs text-neutral-400 mt-0.5">
              Fragrances co-cited within the same dialogue threads
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <NuxtLink
              v-for="co in perfume.coMentions"
              :key="co.name"
              :to="`/perfume/${slugify(co.name)}`"
              class="p-3 border border-[#232328] bg-[#0e0e11] hover:bg-[#1b1b22] hover:border-neutral-500 transition-colors flex items-center justify-between no-underline text-inherit"
            >
              <span class="text-xs font-semibold text-neutral-200 truncate pr-2">{{ co.name }}</span>
              <span class="font-mono text-[10px] text-neutral-400 tabular-nums shrink-0">{{ co.count }}×</span>
            </NuxtLink>
          </div>
        </section>

        <!-- Authentic Community Quotes & Reviews -->
        <section v-if="perfume.sampleMentions.length" class="border border-[#232328] bg-[#151519] p-5">
          <div class="mb-4">
            <h2 class="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
              Selected Community Evaluations & Quotes
            </h2>
            <p class="text-xs text-neutral-400 mt-0.5">
              Direct verbatim commentary extracted from primary community archives
            </p>
          </div>

          <div class="divide-y divide-[#232328] border border-[#232328] bg-[#0e0e11]">
            <div
              v-for="(mention, i) in perfume.sampleMentions"
              :key="i"
              class="p-4 flex flex-col gap-2"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-neutral-200">{{ mention.author }}</span>
                  <span class="font-mono text-[11px] text-neutral-400">
                    {{ formatDateTime(mention.timestamp) }}
                  </span>
                  <span
                    class="text-[10px] font-mono uppercase px-2 py-0.5 border"
                    :class="mention.source === 'reddit'
                      ? 'border-orange-900/60 bg-orange-950/30 text-orange-300'
                      : 'border-indigo-900/60 bg-indigo-950/30 text-indigo-300'"
                  >
                    {{ mention.source === 'reddit' ? 'r/fragrance' : 'Discord' }}
                  </span>
                </div>

                <a
                  v-if="mention.url"
                  :href="mention.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-[11px] font-mono text-orange-300 hover:text-orange-200 border border-orange-900/60 bg-orange-950/30 px-2 py-0.5 transition-colors"
                  title="Open source comment on Reddit"
                >
                  <span>View on Reddit</span>
                  <Icon name="lucide:external-link" class="w-3 h-3" />
                </a>
              </div>

              <blockquote class="text-xs sm:text-sm text-neutral-300 leading-relaxed italic pl-3 border-l border-neutral-700">
                "{{ mention.content }}"
              </blockquote>
            </div>
          </div>
        </section>

        <!-- Full Contextual Conversation Threads -->
        <section class="border border-[#232328] bg-[#151519] p-5">
          <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 class="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
                Archival Discussion Threads
              </h2>
              <p class="text-xs text-neutral-400 mt-0.5">
                {{ relatedThreads.length }} indexed discussion contexts citing "{{ perfume.name }}"
                <span v-if="relatedThreads.length > visibleThreadCount" class="font-mono text-neutral-400">
                  (displaying {{ visibleThreadCount }} of {{ relatedThreads.length }})
                </span>
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <ThreadViewer
              v-for="thread in relatedThreads.slice(0, visibleThreadCount)"
              :key="thread.keywordMessage.id"
              :thread="thread"
              :keyword="meta?.keyword"
            />
          </div>

          <div v-if="relatedThreads.length > visibleThreadCount" class="mt-4 text-center">
            <button
              type="button"
              class="px-5 py-2.5 border border-[#232328] bg-[#0e0e11] hover:bg-[#1b1b22] hover:border-neutral-500 text-xs font-mono uppercase tracking-wider text-neutral-200 transition-colors"
              @click="visibleThreadCount += 10"
            >
              Load Additional Threads (+10)
            </button>
          </div>
        </section>
      </main>

      <!-- Archival Print Catalog Footer -->
      <footer class="mt-20 border-t border-[#232328] bg-[#0c0c0f] py-8 text-neutral-400 text-xs font-mono">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Data: Motion Ime Discord + r/fragrance Reddit
          </div>
          <div>
            RECORD SLUG: {{ slug }}
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PerfumeEntry, ConversationThread } from '~/composables/usePerfumeData'
import { slugify, formatDate, formatDateTime, getRegionFlag } from '~/composables/usePerfumeData'

const route = useRoute()
const slug = route.params.slug as string

interface PerfumeDetailResponse {
  perfume: PerfumeEntry | null
  threads: ConversationThread[]
}

const { data: detailData, pending: loading, error } = await useFetch<PerfumeDetailResponse>(`/api/perfumes/${slug}`)

const visibleThreadCount = ref(10)

const perfume = computed(() => detailData.value?.perfume || null)
const relatedThreads = computed(() => detailData.value?.threads || [])

// Source breakdown percentages
const discordPct = computed(() => {
  if (!perfume.value?.sources) return 0
  const total = perfume.value.sources.discord.mentionCount + perfume.value.sources.reddit.mentionCount
  return total > 0 ? Math.round((perfume.value.sources.discord.mentionCount / total) * 100) : 0
})

const redditPct = computed(() => {
  if (!perfume.value?.sources) return 0
  return 100 - discordPct.value
})

// Yearly heatmap
const sortedYears = computed(() => {
  if (!perfume.value?.yearlyMentions) return []
  return Object.keys(perfume.value.yearlyMentions).sort()
})

// Accord distribution
const sortedAccords = computed<[string, number][]>(() => {
  if (!perfume.value?.accordDistribution) return []
  return Object.entries(perfume.value.accordDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
})

const maxAccordCount = computed(() => {
  if (!sortedAccords.value.length) return 1
  return sortedAccords.value[0][1]
})

useHead({
  title: computed(() =>
    perfume.value
      ? `${perfume.value.name} (${perfume.value.brand}) — Community Spec Sheet`
      : 'Perfume Not Found — Perfumery Leaderboard'
  ),
})
</script>
