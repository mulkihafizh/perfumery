<template>
  <div class="border border-[#232328] bg-[#151519] overflow-hidden relative">
    <!-- Subtle Loading Bar -->
    <div
      v-if="tableLoading"
      class="h-0.5 bg-neutral-800 w-full overflow-hidden absolute top-0 left-0 right-0 z-10"
    >
      <div class="h-full bg-neutral-200 w-1/3 animate-[pulse_1s_ease-in-out_infinite]" />
    </div>

    <!-- Table Header (Spec Sheet Matrix Header) -->
    <div class="grid grid-cols-[44px_1fr_70px_70px] md:grid-cols-[52px_1.8fr_120px_1fr_80px_80px_80px] lg:grid-cols-[52px_1.8fr_130px_1fr_80px_80px_80px_220px] items-center px-4 py-2.5 bg-[#121216] border-b border-[#232328] text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 select-none">
      <div class="font-mono text-neutral-400">Idx</div>
      <div>Perfume Formulation</div>
      <div class="hidden md:block">Provenance</div>
      <div class="hidden md:block">Volume Index</div>
      <div
        class="text-right cursor-pointer hover:text-neutral-200 transition-colors flex items-center justify-end gap-1"
        :class="{ 'text-neutral-100 font-bold': isSortedBy('mentionCount') || isSortedBy('mentions') }"
        @click="$emit('sort', 'mentionCount')"
      >
        <span>Mentions</span>
        <Icon
          v-if="isSortedBy('mentionCount') || isSortedBy('mentions')"
          :name="sortAsc ? 'lucide:arrow-up' : 'lucide:arrow-down'"
          class="w-3 h-3 text-neutral-300"
        />
      </div>
      <div
        class="text-right cursor-pointer hover:text-neutral-200 transition-colors flex items-center justify-end gap-1"
        :class="{ 'text-neutral-100 font-bold': isSortedBy('threadCount') || isSortedBy('threads') }"
        @click="$emit('sort', 'threadCount')"
      >
        <span>Threads</span>
        <Icon
          v-if="isSortedBy('threadCount') || isSortedBy('threads')"
          :name="sortAsc ? 'lucide:arrow-up' : 'lucide:arrow-down'"
          class="w-3 h-3 text-neutral-300"
        />
      </div>
      <div
        class="hidden md:flex text-right cursor-pointer hover:text-neutral-200 transition-colors items-center justify-end gap-1"
        :class="{ 'text-neutral-100 font-bold': isSortedBy('uniqueAuthors') || isSortedBy('authors') }"
        @click="$emit('sort', 'uniqueAuthors')"
      >
        <span>Authors</span>
        <Icon
          v-if="isSortedBy('uniqueAuthors') || isSortedBy('authors')"
          :name="sortAsc ? 'lucide:arrow-up' : 'lucide:arrow-down'"
          class="w-3 h-3 text-neutral-300"
        />
      </div>
      <div class="hidden lg:block pl-2">Olfactory Notes</div>
    </div>

    <!-- Table Rows -->
    <div class="divide-y divide-[#232328]" :class="{ 'opacity-60 transition-opacity': tableLoading }">
      <NuxtLink
        v-for="(perfume, index) in perfumes"
        :key="perfume.name"
        :to="`/perfume/${slugify(perfume.name)}`"
        class="group grid grid-cols-[44px_1fr_70px_70px] md:grid-cols-[52px_1.8fr_120px_1fr_80px_80px_80px] lg:grid-cols-[52px_1.8fr_130px_1fr_80px_80px_80px_220px] items-center px-4 py-3 hover:bg-[#1b1b22] transition-colors text-inherit no-underline"
        :class="pagination.page === 1 && index < 3 ? 'bg-[#18181f]/40' : ''"
      >
        <!-- Architectural Index Number -->
        <div
          class="font-mono text-xs tabular-nums font-semibold"
          :class="pagination.page === 1 && index < 3 ? 'text-neutral-200' : 'text-neutral-400'"
        >
          {{ String(((pagination?.page || 1) - 1) * (pagination?.limit || 25) + index + 1).padStart(2, '0') }}
        </div>

        <!-- Product Formulation & Brand -->
        <div class="pr-3 min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-sm shrink-0" :title="perfume.region">{{ getRegionFlag(perfume.region) }}</span>
            <span class="text-sm font-bold tracking-tight text-neutral-100 group-hover:text-white truncate">
              {{ perfume.name }}
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-neutral-400">
            <span class="font-medium text-neutral-400">{{ perfume.brand }}</span>
            <span class="text-neutral-600">•</span>
            <span class="font-mono text-[10px] uppercase px-1.5 py-0.2 bg-[#0e0e11] border border-[#232328] text-neutral-400">
              {{ perfume.category }}
            </span>
            <span v-if="perfume.gender" class="hidden sm:inline text-neutral-400 text-[10px]">
              {{ perfume.gender }}
            </span>
            <!-- Platform Source Counts -->
            <span v-if="perfume.sources" class="hidden sm:inline-flex items-center gap-1.5 ml-1 text-[10px] text-neutral-400">
              <span v-if="perfume.sources.discord && perfume.sources.discord.mentionCount" class="inline-flex items-center gap-0.5" title="Discord mentions">
                <Icon name="lucide:message-square" class="w-3 h-3 text-indigo-400/80" />
                <span class="font-mono">{{ perfume.sources.discord.mentionCount }}</span>
              </span>
              <span v-if="perfume.sources.reddit && perfume.sources.reddit.mentionCount" class="inline-flex items-center gap-0.5" title="Reddit mentions">
                <Icon name="lucide:message-circle" class="w-3 h-3 text-orange-400/80" />
                <span class="font-mono">{{ perfume.sources.reddit.mentionCount }}</span>
              </span>
            </span>
          </div>
        </div>

        <!-- Provenance Region Tag -->
        <div class="hidden md:block">
          <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 border border-[#232328] bg-[#0e0e11] text-neutral-300 font-medium">
            <span>{{ getRegionFlag(perfume.region) }}</span>
            <span class="truncate">{{ perfume.region }}</span>
          </span>
        </div>

        <!-- Volume Index Bar -->
        <div class="hidden md:block pr-4">
          <div class="w-full bg-[#0e0e11] border border-[#232328] h-1.5 overflow-hidden">
            <div
              class="h-full bg-neutral-400 transition-all duration-300"
              :class="perfume.region === 'Indonesia' ? 'bg-amber-400/90' : 'bg-neutral-400'"
              :style="{ width: `${Math.max(4, (perfume.mentionCount / Math.max(1, maxMentions)) * 100)}%` }"
            />
          </div>
        </div>

        <!-- Mentions -->
        <div class="text-right font-mono text-sm tabular-nums font-semibold text-neutral-200">
          {{ perfume.mentionCount }}
        </div>

        <!-- Threads -->
        <div class="text-right font-mono text-sm tabular-nums text-neutral-400">
          {{ perfume.threadCount }}
        </div>

        <!-- Authors -->
        <div class="hidden md:block text-right font-mono text-sm tabular-nums text-neutral-400">
          {{ perfume.uniqueAuthors }}
        </div>

        <!-- Scent Accords -->
        <div class="hidden lg:flex flex-wrap gap-1 pl-2">
          <NotesBadge
            v-for="note in perfume.topNotes"
            :key="note"
            :note="note"
          />
        </div>
      </NuxtLink>
    </div>

    <!-- Empty state -->
    <div v-if="perfumes.length === 0 && !tableLoading" class="py-16 px-4 text-center">
      <Icon name="lucide:search-x" class="w-8 h-8 mx-auto text-neutral-500 mb-3" />
      <p class="text-sm font-semibold text-neutral-200">No catalogue entries match your criteria</p>
      <p class="text-xs text-neutral-400 mt-1">Adjust or reset your active filters to view community rankings.</p>
    </div>

    <!-- Pagination & Page Size Control Bar -->
    <div class="border-t border-[#232328] bg-[#121216] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
      <!-- Items per page selector -->
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 font-mono">
          Items per page:
        </span>
        <div class="inline-flex border border-[#232328] bg-[#0e0e11] p-0.5">
          <button
            v-for="option in [10, 25, 50, 100]"
            :key="option"
            type="button"
            class="px-2.5 py-1 text-xs font-mono transition-colors"
            :class="pagination.limit === option
              ? 'bg-neutral-200 text-neutral-900 font-bold'
              : 'text-neutral-400 hover:text-neutral-200'"
            @click="$emit('change-limit', option)"
          >
            {{ option }}
          </button>
        </div>
      </div>

      <!-- Pagination range summary -->
      <div class="text-[11px] font-mono text-neutral-400">
        SHOWING
        <span class="text-neutral-200 font-semibold">{{ rangeStart }}–{{ rangeEnd }}</span>
        OF
        <span class="text-neutral-200 font-semibold">{{ pagination.total.toLocaleString() }}</span>
        CATALOGUED LINES
      </div>

      <!-- Page navigation buttons -->
      <div class="flex items-center gap-1.5 font-mono text-xs">
        <button
          type="button"
          :disabled="pagination.page <= 1"
          class="px-3 py-1.5 border border-[#232328] bg-[#0e0e11] text-neutral-300 hover:bg-[#1b1b22] hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
          @click="$emit('change-page', pagination.page - 1)"
        >
          <Icon name="lucide:chevron-left" class="w-3.5 h-3.5" />
          <span>PREV</span>
        </button>

        <span class="px-2 text-neutral-400 text-xs">
          PAGE <strong class="text-neutral-200">{{ pagination.page }}</strong> / {{ Math.max(1, pagination.totalPages) }}
        </span>

        <button
          type="button"
          :disabled="pagination.page >= pagination.totalPages"
          class="px-3 py-1.5 border border-[#232328] bg-[#0e0e11] text-neutral-300 hover:bg-[#1b1b22] hover:text-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
          @click="$emit('change-page', pagination.page + 1)"
        >
          <span>NEXT</span>
          <Icon name="lucide:chevron-right" class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PerfumeEntry, PaginationInfo } from '~/composables/usePerfumeData'
import { slugify, getRegionFlag } from '~/composables/usePerfumeData'

const props = withDefaults(
  defineProps<{
    perfumes: PerfumeEntry[]
    pagination: PaginationInfo
    maxMentions: number
    activeNotes?: string[]
    tableLoading?: boolean
    sortBy?: string
    sortAsc?: boolean
  }>(),
  {
    tableLoading: false,
    sortBy: 'mentionCount',
    sortAsc: false,
  }
)

defineEmits<{
  (e: 'change-page', page: number): void
  (e: 'change-limit', limit: number): void
  (e: 'sort', key: string): void
}>()

function isSortedBy(key: string): boolean {
  return props.sortBy?.toLowerCase() === key.toLowerCase()
}

const rangeStart = computed(() => {
  if (!props.pagination.total) return 0
  return (props.pagination.page - 1) * props.pagination.limit + 1
})

const rangeEnd = computed(() => {
  if (!props.pagination.total) return 0
  return Math.min(props.pagination.page * props.pagination.limit, props.pagination.total)
})
</script>
