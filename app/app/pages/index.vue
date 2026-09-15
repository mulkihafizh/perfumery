<template>
  <div class="min-h-screen bg-[#0e0e11] text-[#d4d4d8]">
    <!-- Top Editorial Masthead / Header -->
    <header class="border-b border-[#232328] bg-[#121216]/60">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div class="max-w-3xl">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-2 h-2 rounded-none bg-neutral-400" />
            <span class="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 font-mono">
              Olfactory Intelligence Directory • Public Archive
            </span>
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-100 uppercase font-sans">
            Perfumery <span class="text-neutral-400 font-light">Leaderboard</span>
          </h1>

          <p class="mt-3 text-sm sm:text-base text-neutral-400 leading-relaxed font-sans">
            Minimalist community census tracking community consensus, formulation popularity, and discussion velocity across
            <strong class="text-neutral-200 font-semibold">Motion Ime Discord</strong> and <strong class="text-neutral-200 font-semibold">r/fragrance Reddit</strong>.
          </p>

          <div v-if="meta" class="mt-4 pt-3 border-t border-[#232328] flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-neutral-400">
            <template v-if="meta.sources && meta.sources.reddit.totalComments > 0">
              <span class="inline-flex items-center gap-1.5 text-neutral-300">
                <Icon name="lucide:message-square" class="w-3.5 h-3.5 text-indigo-400" />
                <span>{{ meta.sources.discord.totalMessages.toLocaleString() }} Discord msgs</span>
              </span>
              <span class="text-neutral-600">+</span>
              <span class="inline-flex items-center gap-1.5 text-neutral-300">
                <Icon name="lucide:message-circle" class="w-3.5 h-3.5 text-orange-400" />
                <span>{{ meta.sources.reddit.totalComments.toLocaleString() }} Reddit mentions</span>
              </span>
            </template>
            <template v-else-if="meta.sources">
              <span class="inline-flex items-center gap-1.5 text-neutral-300">
                <Icon name="lucide:message-square" class="w-3.5 h-3.5 text-indigo-400" />
                <span>{{ meta.sources.discord.totalMessages.toLocaleString() }} Discord msgs</span>
              </span>
            </template>
            <template v-else>
              <span>{{ meta.totalMessages.toLocaleString() }} messages scanned</span>
            </template>
            <span class="text-neutral-600">•</span>
            <span class="text-neutral-300 font-semibold">{{ meta.totalPerfumesFound }} distinct perfume lines catalogued</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div class="inline-block w-8 h-8 border-2 border-neutral-700 border-t-neutral-200 rounded-full animate-spin mb-4" />
      <p class="text-xs font-mono uppercase tracking-widest text-neutral-400">Loading catalog archive...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div class="p-6 border border-rose-900/50 bg-rose-950/20 inline-block text-rose-300 max-w-md">
        <Icon name="lucide:alert-circle" class="w-6 h-6 mx-auto mb-2 text-rose-400" />
        <p class="text-sm font-semibold">{{ error }}</p>
      </div>
    </div>

    <!-- Main Content Stream -->
    <main v-else-if="meta" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 4-Col Spec Sheet Metric Matrix -->
      <StatsOverview
        :total-messages="meta.totalMessages"
        :total-perfumes="meta.totalPerfumesFound"
        :total-threads="meta.totalThreads"
        :keyword="meta.keyword"
      />

      <!-- Source Toggle & Spec Header Controls -->
      <section v-if="meta?.sources" class="mb-6 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#232328]">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
            Source Partition:
          </span>
          <div class="inline-flex border border-[#232328] bg-[#121216] p-0.5">
            <button
              type="button"
              class="px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 font-medium"
              :class="activeSource === 'all'
                ? 'bg-neutral-200 text-neutral-900 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'"
              @click="handleSourceChange('all')"
            >
              <Icon name="lucide:layers" class="w-3.5 h-3.5" />
              <span>Unified Corpus</span>
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 font-medium"
              :class="activeSource === 'discord'
                ? 'bg-neutral-200 text-neutral-900 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'"
              @click="handleSourceChange('discord')"
            >
              <Icon name="lucide:message-square" class="w-3.5 h-3.5 text-indigo-400" />
              <span>Discord Only</span>
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 font-medium"
              :class="activeSource === 'reddit'
                ? 'bg-neutral-200 text-neutral-900 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'"
              @click="handleSourceChange('reddit')"
            >
              <Icon name="lucide:message-circle" class="w-3.5 h-3.5 text-orange-400" />
              <span>Reddit Only</span>
            </button>
          </div>
        </div>

        <div class="text-[11px] font-mono text-neutral-400">
          INDEXED: {{ meta.totalPerfumesFound }} PRODUCTS
        </div>
      </section>

      <!-- Regional Overview Spec Matrix -->
      <section class="mb-8">
        <div class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 mb-2">
          Provenance Distribution
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 border border-[#232328] bg-[#151519] divide-x divide-y sm:divide-y-0 divide-[#232328]">
          <!-- All Provenances Card -->
          <button
            type="button"
            class="p-3 text-left transition-colors flex flex-col justify-between"
            :class="activeRegion === 'ALL' && !localOnly ? 'bg-neutral-800 text-neutral-100' : 'hover:bg-[#1b1b22] text-neutral-400'"
            @click="setRegionFilter('ALL')"
          >
            <div class="text-base mb-1">🌐</div>
            <div>
              <div class="text-xs font-bold text-neutral-200 truncate">All Regions</div>
              <div class="font-mono text-[10px] text-neutral-400 tabular-nums mt-0.5">{{ meta.totalPerfumesFound }} lines</div>
            </div>
          </button>

          <!-- Each Region Card -->
          <button
            v-for="(summary, regionKey) in (regions || {})"
            :key="regionKey"
            type="button"
            class="p-3 text-left transition-colors flex flex-col justify-between"
            :class="(activeRegion === regionKey) || (regionKey === 'Indonesia' && localOnly)
              ? 'bg-neutral-800 text-neutral-100'
              : 'hover:bg-[#1b1b22] text-neutral-400'"
            @click="setRegionFilter(String(regionKey))"
          >
            <div class="text-base mb-1">{{ getRegionFlag(String(regionKey)) }}</div>
            <div>
              <div class="text-xs font-bold text-neutral-200 truncate">{{ regionKey }}</div>
              <div class="font-mono text-[10px] text-neutral-400 tabular-nums mt-0.5">
                {{ summary.count }} ({{ summary.totalMentions }}m)
              </div>
            </div>
          </button>
        </div>
      </section>

      <!-- Section: Leaderboard Table -->
      <section id="leaderboard" class="mb-12">
        <div class="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold tracking-tight text-neutral-100 uppercase">
                Product Rankings
              </h2>
              <span v-if="localOnly" class="text-[10px] font-mono px-2 py-0.5 border border-amber-800/80 bg-amber-950/40 text-amber-300">
                PROVENANCE: INDONESIA (LOCAL)
              </span>
              <span v-else-if="activeRegion !== 'ALL'" class="text-[10px] font-mono px-2 py-0.5 border border-[#232328] bg-[#121216] text-neutral-300">
                PROVENANCE: {{ activeRegion }}
              </span>
              <span v-if="activeNotes && activeNotes.length > 0" class="text-[10px] font-mono px-2 py-0.5 border border-rose-900/60 bg-rose-950/30 text-rose-300">
                ACCORDS: {{ activeNotes.join(' + ') }}
              </span>
            </div>
            <p class="text-xs text-neutral-400 mt-1">
              Displaying {{ pagination.total.toLocaleString() }} of {{ meta.totalPerfumesFound.toLocaleString() }} catalogued formulations
            </p>
          </div>

          <button
            v-if="hasActiveFilters"
            type="button"
            class="text-xs font-mono uppercase tracking-wider text-rose-400 hover:text-rose-300 border border-rose-900/60 bg-rose-950/30 px-3 py-1.5 transition-colors flex items-center gap-1.5"
            @click="handleResetFilters"
          >
            <span>Reset Active Filters</span>
            <Icon name="lucide:x" class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Search & Dynamic Filter Component -->
        <SearchBar
          ref="searchBarRef"
          placeholder="Search catalogue by line (Hawas, MYSLF, Sauvage), brand, or accord..."
          :initial-notes="activeNotes"
          :initial-region="activeRegion"
          :initial-local-only="localOnly"
          @search="onSearch"
          @filter-region="onFilterRegion"
          @filter-notes="onFilterNotes"
          @filter-local-only="onFilterLocalOnly"
        />

        <!-- Leaderboard Table Matrix with Pagination -->
        <LeaderboardTable
          :perfumes="perfumes"
          :pagination="pagination"
          :max-mentions="maxMentions"
          :active-notes="activeNotes"
          :table-loading="tableLoading"
          :sort-by="sortBy"
          :sort-asc="sortAsc"
          @change-page="setPage"
          @change-limit="setLimit"
          @sort="setSort"
        />
      </section>

      <!-- Section: Top Community Contributors -->
      <section id="contributors" class="mb-12 pt-8 border-t border-[#232328]">
        <div class="mb-4">
          <div class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 font-mono">
            Contributor Census
          </div>
          <h2 class="text-lg font-bold tracking-tight text-neutral-100 uppercase">
            Top Community Fragrance Evaluators
          </h2>
          <p class="text-xs text-neutral-400 mt-0.5">
            Most active olfactory commentators in the indexed corpus
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border border-[#232328] bg-[#151519] divide-y sm:divide-y-0 sm:divide-x divide-[#232328]">
          <div
            v-for="(contrib, index) in (topContributors || []).slice(0, 10)"
            :key="contrib.username"
            class="p-4 flex flex-col justify-between hover:bg-[#1b1b22] transition-colors"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-mono text-xs font-bold text-neutral-400">
                0{{ index + 1 }}
              </span>
              <span class="font-mono text-[10px] text-neutral-400">
                {{ contrib.messageCount }} msgs
              </span>
            </div>
            <div>
              <div class="text-sm font-bold text-neutral-200 truncate">{{ contrib.name }}</div>
              <div class="text-[11px] text-neutral-400 font-mono mt-0.5">
                {{ contrib.perfumesMentioned }} perfumes cited
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Scent Accord Directory -->
      <section id="categories" class="pt-8 border-t border-[#232328]">
        <div class="mb-4">
          <div class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 font-mono">
            Olfactory Taxonomy
          </div>
          <h2 class="text-lg font-bold tracking-tight text-neutral-100 uppercase">
            Scent Accord Families
          </h2>
          <p class="text-xs text-neutral-400 mt-0.5">
            Click any accord card to isolate matched formulations in the catalogue
          </p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-[#232328] bg-[#151519] divide-y sm:divide-y-0 divide-[#232328]">
          <div
            v-for="(cat, note) in (categories || {})"
            :key="note"
            class="p-4 cursor-pointer transition-colors flex flex-col justify-between"
            :class="activeNotes && activeNotes.includes(String(note))
              ? 'bg-neutral-800 text-neutral-100'
              : 'hover:bg-[#1b1b22]'"
            @click="toggleNoteCategory(String(note))"
          >
            <div class="flex items-center justify-between mb-2">
              <NotesBadge :note="String(note)" />
              <span v-if="activeNotes && activeNotes.includes(String(note))" class="text-[10px] font-mono text-rose-300">
                ACTIVE
              </span>
            </div>
            <div class="font-mono text-xs font-semibold tabular-nums text-neutral-300 mt-2">
              {{ cat.count }} formulations
            </div>
            <div class="text-[11px] text-neutral-400 truncate mt-1">
              {{ (cat.perfumes || []).slice(0, 2).join(', ') }}
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Archival Print Catalog Footer -->
    <footer class="mt-20 border-t border-[#232328] bg-[#0c0c0f] py-8 text-neutral-400 text-xs font-mono">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          Corpus: Motion Ime Discord
          <template v-if="meta?.sources"> + r/fragrance Reddit ({{ meta.sources.reddit.yearsRange }})</template>
        </div>
        <div v-if="meta">
          ARCHIVE GENERATED: {{ formatDate(meta.generatedAt) }}
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { SourceFilter } from '~/composables/usePerfumeData'
import { formatDate, getRegionFlag } from '~/composables/usePerfumeData'

const {
  loading,
  error,
  meta,
  regions,
  categories,
  topContributors,
  maxMentions,
  fetchData,
  // Paginated table state
  perfumes,
  pagination,
  tableLoading,
  fetchPerfumes,
  // Filter state & actions
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
} = usePerfumeData()

const searchBarRef = ref<any>(null)

const hasActiveFilters = computed(() => {
  return (
    searchQuery.value !== '' ||
    activeRegion.value !== 'ALL' ||
    localOnly.value ||
    (activeNotes.value && activeNotes.value.length > 0) ||
    activeSource.value !== 'all'
  )
})

function onSearch(query: string) {
  setSearch(query)
}

function onFilterRegion(region: string) {
  setRegion(region)
}

function onFilterLocalOnly(val: boolean) {
  if (val) {
    setRegion('Indonesia')
  } else {
    setRegion('ALL')
  }
}

function onFilterNotes(notes: string[]) {
  setNotes(notes)
}

function setRegionFilter(reg: string) {
  setRegion(reg)
  if (searchBarRef.value?.setRegion) {
    searchBarRef.value.setRegion(reg)
  }
}

function handleSourceChange(src: SourceFilter) {
  setSource(src)
}

function toggleNoteCategory(note: string) {
  const current = [...activeNotes.value]
  const idx = current.indexOf(note)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(note)
  }
  setNotes(current)
  if (searchBarRef.value?.setNotes) {
    searchBarRef.value.setNotes(current)
  }
}

function handleResetFilters() {
  resetFilters()
  if (searchBarRef.value?.reset) {
    searchBarRef.value.reset()
  }
}

onMounted(async () => {
  await Promise.all([fetchData(), fetchPerfumes()])
})

useHead({
  title: 'Perfumery Product Leaderboard — Community Fragrance Rankings',
})
</script>
