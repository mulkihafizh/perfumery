<template>
  <div class="leaderboard">
    <!-- Table Header -->
    <div class="leaderboard__header">
      <div class="leaderboard__col leaderboard__col--rank">#</div>
      <div class="leaderboard__col leaderboard__col--name">Perfume Product</div>
      <div class="leaderboard__col leaderboard__col--region hide-mobile">Origin</div>
      <div class="leaderboard__col leaderboard__col--bar">Popularity</div>
      <div
        class="leaderboard__col leaderboard__col--stat leaderboard__col--sortable"
        :class="{ 'leaderboard__col--sorted': sortBy === 'mentionCount' }"
        @click="setSort('mentionCount')"
      >
        Mentions {{ sortBy === 'mentionCount' ? (sortAsc ? '↑' : '↓') : '' }}
      </div>
      <div
        class="leaderboard__col leaderboard__col--stat leaderboard__col--sortable"
        :class="{ 'leaderboard__col--sorted': sortBy === 'threadCount' }"
        @click="setSort('threadCount')"
      >
        Threads {{ sortBy === 'threadCount' ? (sortAsc ? '↑' : '↓') : '' }}
      </div>
      <div
        class="leaderboard__col leaderboard__col--stat leaderboard__col--sortable hide-mobile"
        :class="{ 'leaderboard__col--sorted': sortBy === 'uniqueAuthors' }"
        @click="setSort('uniqueAuthors')"
      >
        Authors {{ sortBy === 'uniqueAuthors' ? (sortAsc ? '↑' : '↓') : '' }}
      </div>
      <div class="leaderboard__col leaderboard__col--notes hide-tablet">Scent Notes</div>
    </div>

    <!-- Table Rows -->
    <NuxtLink
      v-for="(perfume, index) in sortedPerfumes"
      :key="perfume.name"
      :to="`/perfume/${slugify(perfume.name)}`"
      class="leaderboard__row animate-fade-in-up"
      :class="{
        'leaderboard__row--podium': index < 3,
        [`leaderboard__row--rank-${index + 1}`]: index < 3,
        'leaderboard__row--local': perfume.region === 'Indonesia',
      }"
      :style="{ opacity: 0, animationDelay: `${Math.min(index * 20, 350)}ms` }"
    >
      <!-- Rank -->
      <div class="leaderboard__col leaderboard__col--rank">
        <span
          class="rank-medal"
          :class="index < 3 ? `rank-medal--${index + 1}` : 'rank-medal--default'"
        >
          {{ index < 3 ? medals[index] : index + 1 }}
        </span>
      </div>

      <!-- Product Name & Brand -->
      <div class="leaderboard__col leaderboard__col--name">
        <div class="perfume-name-row">
          <span class="region-flag" :title="perfume.region">{{ getRegionFlag(perfume.region) }}</span>
          <span class="perfume-name">{{ perfume.name }}</span>
        </div>
        <div class="perfume-brand-row">
          <span class="perfume-brand">{{ perfume.brand }}</span>
          <span class="dot-separator">•</span>
          <span class="perfume-category-tag" :class="{ 'perfume-category-tag--local': perfume.region === 'Indonesia' }">
            {{ perfume.category }}
          </span>
          <span v-if="perfume.gender" class="perfume-gender-tag hide-mobile">
            {{ perfume.gender }}
          </span>
        </div>
      </div>

      <!-- Region Badge -->
      <div class="leaderboard__col leaderboard__col--region hide-mobile">
        <span class="region-chip" :class="`region-chip--${slugify(perfume.region)}`">
          {{ getRegionFlag(perfume.region) }} {{ perfume.region }}
        </span>
      </div>

      <!-- Popularity Bar -->
      <div class="leaderboard__col leaderboard__col--bar">
        <div class="mention-bar-container">
          <div
            class="mention-bar"
            :class="{ 'mention-bar--local': perfume.region === 'Indonesia' }"
            :style="{ width: `${Math.max(6, (perfume.mentionCount / maxMentions) * 100)}%` }"
          />
        </div>
      </div>

      <!-- Mentions -->
      <div class="leaderboard__col leaderboard__col--stat">
        <span class="stat-value">{{ perfume.mentionCount }}</span>
      </div>

      <!-- Threads -->
      <div class="leaderboard__col leaderboard__col--stat">
        <span class="stat-value">{{ perfume.threadCount }}</span>
      </div>

      <!-- Authors -->
      <div class="leaderboard__col leaderboard__col--stat hide-mobile">
        <span class="stat-value">{{ perfume.uniqueAuthors }}</span>
      </div>

      <!-- Notes -->
      <div class="leaderboard__col leaderboard__col--notes hide-tablet">
        <div class="notes-list">
          <NotesBadge
            v-for="note in perfume.topNotes"
            :key="note"
            :note="note"
            :class="{ 'note-badge--highlighted': activeNotes?.includes(note) }"
          />
        </div>
      </div>
    </NuxtLink>

    <!-- Empty state -->
    <div v-if="sortedPerfumes.length === 0" class="leaderboard__empty">
      <span class="leaderboard__empty-icon">🔍</span>
      <p class="leaderboard__empty-title">No perfume products found</p>
      <p class="leaderboard__empty-desc">No perfumes match the selected filters. Try clearing some options.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PerfumeEntry } from '~/composables/usePerfumeData'
import { slugify, getRegionFlag } from '~/composables/usePerfumeData'

const props = defineProps<{
  perfumes: PerfumeEntry[]
  maxMentions: number
  activeNotes?: string[]
}>()

const medals = ['🥇', '🥈', '🥉']

type SortKey = 'mentionCount' | 'threadCount' | 'uniqueAuthors'
const sortBy = ref<SortKey>('mentionCount')
const sortAsc = ref(false)

function setSort(key: SortKey) {
  if (sortBy.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortBy.value = key
    sortAsc.value = false
  }
}

const sortedPerfumes = computed(() => {
  const items = [...props.perfumes]
  items.sort((a, b) => {
    const diff = (b[sortBy.value] as number) - (a[sortBy.value] as number)
    return sortAsc.value ? -diff : diff
  })
  return items
})
</script>

<style scoped>
.leaderboard {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-card);
  backdrop-filter: blur(12px);
}

.leaderboard__header {
  display: grid;
  grid-template-columns: 56px 1.8fr 140px 1.1fr 85px 85px 85px 220px;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}

.leaderboard__col--sortable {
  cursor: pointer;
  user-select: none;
  transition: color var(--transition-fast);
}

.leaderboard__col--sortable:hover {
  color: var(--text-secondary);
}

.leaderboard__col--sorted {
  color: var(--accent-gold);
}

.leaderboard__row {
  display: grid;
  grid-template-columns: 56px 1.8fr 140px 1.1fr 85px 85px 85px 220px;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  transition: all var(--transition-fast);
  text-decoration: none;
  color: inherit;
}

.leaderboard__row:last-child {
  border-bottom: none;
}

.leaderboard__row:hover {
  background: var(--bg-card-hover);
}

.leaderboard__row--podium {
  background: rgba(212, 168, 83, 0.03);
}

.leaderboard__row--rank-1 {
  background: rgba(255, 215, 0, 0.05);
}

.leaderboard__row--rank-1:hover {
  background: rgba(255, 215, 0, 0.09);
}

.perfume-name-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.region-flag {
  font-size: 1.1rem;
}

.perfume-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-base);
  color: var(--text-primary);
  line-height: 1.3;
}

.perfume-brand-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 2px;
}

.perfume-brand {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-weight: 500;
}

.dot-separator {
  color: var(--text-muted);
  font-size: 0.7rem;
}

.perfume-category-tag {
  font-size: 0.7rem;
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.perfume-category-tag--local {
  color: var(--accent-gold);
  background: rgba(212, 168, 83, 0.1);
  border: 1px solid rgba(212, 168, 83, 0.2);
}

.perfume-gender-tag {
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* Region Chips */
.region-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  white-space: nowrap;
}

.region-chip--indonesia {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.2);
}

.region-chip--middle-east {
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.2);
}

.region-chip--france {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.2);
}

.region-chip--italy {
  background: rgba(16, 185, 129, 0.1);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.2);
}

.region-chip--niche-houses {
  background: rgba(168, 85, 247, 0.1);
  color: #c084fc;
  border-color: rgba(168, 85, 247, 0.2);
}

.region-chip--united-states {
  background: rgba(236, 72, 153, 0.1);
  color: #f472b6;
  border-color: rgba(236, 72, 153, 0.2);
}

.leaderboard__col--stat {
  text-align: center;
}

.stat-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-base);
  color: var(--text-primary);
}

.notes-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.note-badge--highlighted {
  box-shadow: 0 0 8px rgba(212, 168, 83, 0.4);
  border-color: var(--accent-gold) !important;
  transform: scale(1.05);
}

.leaderboard__empty {
  padding: var(--space-16) var(--space-8);
  text-align: center;
  color: var(--text-tertiary);
}

.leaderboard__empty-icon {
  display: block;
  font-size: 2.5rem;
  margin-bottom: var(--space-3);
}

.leaderboard__empty-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.leaderboard__empty-desc {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

/* Responsive Breakpoints */
@media (max-width: 1100px) {
  .leaderboard__header,
  .leaderboard__row {
    grid-template-columns: 50px 1.6fr 120px 1fr 75px 75px 75px;
  }
  .hide-tablet {
    display: none;
  }
}

@media (max-width: 860px) {
  .leaderboard__header,
  .leaderboard__row {
    grid-template-columns: 44px 1.8fr 1fr 70px 70px;
    padding: var(--space-2) var(--space-3);
  }
  .hide-mobile {
    display: none;
  }
}

@media (max-width: 540px) {
  .leaderboard__header,
  .leaderboard__row {
    grid-template-columns: 36px 1fr 55px 55px;
  }
  .leaderboard__col--bar {
    display: none;
  }
  .perfume-name {
    font-size: var(--text-sm);
  }
  .stat-value {
    font-size: var(--text-sm);
  }
}
</style>
