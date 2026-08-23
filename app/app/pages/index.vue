<template>
  <div class="dashboard">
    <!-- Hero -->
    <header class="hero">
      <div class="container">
        <div class="hero__content animate-fade-in-up" style="opacity: 0">
          <div class="hero__badge">🏆 Fragrance Community Rankings</div>
          <h1 class="hero__title">
            Perfumery
            <span class="hero__accent">Leaderboard</span>
          </h1>
          <p class="hero__subtitle">
            Discover the most discussed, hyped, and recommended <strong>fragrance lines & products</strong> from the
            <strong>Motion Ime</strong> Discord community.
            <span v-if="meta" class="hero__stat-line">
              {{ meta.totalMessages.toLocaleString() }} messages scanned •
              {{ meta.totalPerfumesFound }} distinct perfume products ranked
            </span>
          </p>
        </div>
      </div>
      <div class="hero__glow" />
    </header>

    <!-- Loading -->
    <div v-if="loading" class="container loading-state">
      <div class="loading-spinner" />
      <p>Loading perfume data...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="container error-state">
      <p>❌ {{ error }}</p>
    </div>

    <!-- Content -->
    <main v-else-if="meta" class="container">
      <!-- Stats -->
      <StatsOverview
        :total-messages="meta.totalMessages"
        :total-perfumes="meta.totalPerfumesFound"
        :total-threads="meta.totalThreads"
        :keyword="meta.keyword"
      />

      <!-- Regional Quick Overview Cards -->
      <section class="section section--regions">
        <div class="regions-grid">
          <button
            class="region-card glass-card"
            :class="{ 'region-card--active': activeRegion === 'ALL' && !localOnly }"
            @click="setRegionFilter('ALL')"
          >
            <div class="region-card__icon">🌐</div>
            <div class="region-card__info">
              <div class="region-card__name">All Fragrances</div>
              <div class="region-card__count">{{ meta.totalPerfumesFound }} Products</div>
            </div>
          </button>

          <button
            v-for="(summary, regionKey) in (regions || {})"
            :key="regionKey"
            class="region-card glass-card"
            :class="{
              'region-card--active': (activeRegion === regionKey) || (regionKey === 'Indonesia' && localOnly),
              'region-card--local': regionKey === 'Indonesia',
            }"
            @click="setRegionFilter(String(regionKey))"
          >
            <div class="region-card__icon">{{ getRegionFlag(String(regionKey)) }}</div>
            <div class="region-card__info">
              <div class="region-card__name">{{ regionKey }}</div>
              <div class="region-card__count">{{ summary.count }} Products ({{ summary.totalMentions }} mentions)</div>
            </div>
          </button>
        </div>
      </section>

      <!-- Section: Leaderboard -->
      <section class="section" id="leaderboard">
        <div class="section__header section__header--flex">
          <div>
            <h2 class="section__title">
              🏆 Top Perfume Lines
              <span v-if="localOnly" class="section__badge-filter">🇮🇩 Local Indonesian Brands</span>
              <span v-else-if="activeRegion !== 'ALL'" class="section__badge-filter">{{ getRegionFlag(activeRegion) }} {{ activeRegion }}</span>
              <span v-if="activeNotes && activeNotes.length > 0" class="section__badge-filter section__badge-filter--notes">
                🌸 Notes: {{ activeNotes.join(' + ') }}
              </span>
            </h2>
            <p class="section__subtitle">
              Showing {{ filteredPerfumes.length }} of {{ meta.totalPerfumesFound }} perfume products
            </p>
          </div>
          <button
            v-if="hasActiveFilters"
            class="btn btn--ghost btn--reset"
            @click="resetFilters"
          >
            Reset Filters ✕
          </button>
        </div>

        <SearchBar
          ref="searchBarRef"
          placeholder="Search by perfume line (e.g. Hawas, MYSLF, Ostara, Sauvage), brand, or note..."
          :initial-notes="activeNotes"
          :initial-region="activeRegion"
          :initial-local-only="localOnly"
          @search="onSearch"
          @filter-region="onFilterRegion"
          @filter-notes="onFilterNotes"
          @filter-local-only="onFilterLocalOnly"
        />

        <LeaderboardTable
          :perfumes="filteredPerfumes"
          :max-mentions="maxMentions"
          :active-notes="activeNotes"
        />
      </section>

      <!-- Section: Top Contributors -->
      <section class="section" id="contributors">
        <div class="section__header">
          <h2 class="section__title">👥 Top Community Fragrance Contributors</h2>
          <p class="section__subtitle">Most active perfume enthusiasts in the discussion</p>
        </div>

        <div class="contributors-grid">
          <div
            v-for="(contrib, index) in (topContributors || []).slice(0, 10)"
            :key="contrib.username"
            class="contributor-card glass-card animate-fade-in-up"
            :style="{ opacity: 0, animationDelay: `${index * 40}ms` }"
          >
            <div class="contributor-rank">
              <span
                class="rank-medal"
                :class="index < 3 ? `rank-medal--${index + 1}` : 'rank-medal--default'"
              >
                {{ index < 3 ? ['🥇','🥈','🥉'][index] : index + 1 }}
              </span>
            </div>
            <div class="contributor-info">
              <div class="contributor-name">{{ contrib.name }}</div>
              <div class="contributor-stats">
                <span>{{ contrib.messageCount }} msgs</span>
                <span class="contributor-separator">•</span>
                <span>{{ contrib.perfumesMentioned }} perfumes discussed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Note Categories -->
      <section class="section" id="categories">
        <div class="section__header">
          <h2 class="section__title">🎨 Scent Note Families</h2>
          <p class="section__subtitle">Click any category card below to filter the leaderboard</p>
        </div>

        <div class="categories-grid">
          <div
            v-for="(cat, note) in (categories || {})"
            :key="note"
            class="category-card glass-card"
            :class="{ 'category-card--active': activeNotes && activeNotes.includes(String(note)) }"
            @click="toggleNoteCategory(String(note))"
          >
            <div class="category-header">
              <NotesBadge :note="String(note)" />
              <span v-if="activeNotes && activeNotes.includes(String(note))" class="category-active-tag">Active ✓</span>
            </div>
            <div class="category-count">{{ cat.count }} perfumes</div>
            <div class="category-examples">
              {{ (cat.perfumes || []).slice(0, 3).join(', ') }}
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <p class="footer__text">
          Data extracted from <strong>Motion Ime</strong> Discord Perfumery Channel •
          <span v-if="meta">Processed {{ formatDate(meta.generatedAt) }}</span>
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { PerfumeEntry } from '~/composables/usePerfumeData'
import { formatDate, getRegionFlag } from '~/composables/usePerfumeData'

const {
  loading,
  error,
  meta,
  leaderboard,
  regions,
  maxMentions,
  topContributors,
  categories,
  fetchData,
} = usePerfumeData()

// Filter state
const searchQuery = ref('')
const activeRegion = ref('ALL')
const localOnly = ref(false)
const activeNotes = ref<string[]>([])
const searchBarRef = ref<any>(null)

const hasActiveFilters = computed(() => {
  return searchQuery.value !== '' || activeRegion.value !== 'ALL' || localOnly.value || (activeNotes.value && activeNotes.value.length > 0)
})

function getPerfumeNotes(p: PerfumeEntry): string[] {
  if (!p) return []
  return p.notes || p.topNotes || p.catalogNotes || []
}

const filteredPerfumes = computed<PerfumeEntry[]>(() => {
  let items = leaderboard.value || []

  // Text search (name, brand, notes, description)
  if (searchQuery.value) {
    const q = searchQuery.value.trim().toLowerCase()
    items = items.filter(p => {
      const pNotes = getPerfumeNotes(p)
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        pNotes.some(n => n.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      )
    })
  }

  // Local only filter
  if (localOnly.value) {
    items = items.filter(p => p.region === 'Indonesia')
  } else if (activeRegion.value && activeRegion.value !== 'ALL') {
    // Region filter
    items = items.filter(p => p.region === activeRegion.value)
  }

  // Note filter: matches perfumes that contain any of the selected notes
  if (activeNotes.value && activeNotes.value.length > 0) {
    items = items.filter(p => {
      const pNotes = getPerfumeNotes(p)
      return activeNotes.value.some(selectedNote => pNotes.includes(selectedNote))
    })
  }

  return items
})

function onSearch(query: string) {
  searchQuery.value = query
}

function onFilterRegion(region: string) {
  activeRegion.value = region
}

function onFilterLocalOnly(val: boolean) {
  localOnly.value = val
  if (val) {
    activeRegion.value = 'Indonesia'
  }
}

function onFilterNotes(notes: string[]) {
  activeNotes.value = notes
}

function setRegionFilter(reg: string) {
  if (reg === 'Indonesia') {
    localOnly.value = true
    activeRegion.value = 'Indonesia'
  } else {
    localOnly.value = false
    activeRegion.value = reg
  }
  if (searchBarRef.value?.setRegion) {
    searchBarRef.value.setRegion(reg)
  }
}

function toggleNoteCategory(note: string) {
  if (!activeNotes.value) activeNotes.value = []
  const idx = activeNotes.value.indexOf(note)
  if (idx >= 0) {
    activeNotes.value.splice(idx, 1)
  } else {
    activeNotes.value.push(note)
  }
  if (searchBarRef.value?.setNotes) {
    searchBarRef.value.setNotes([...activeNotes.value])
  }
}

function resetFilters() {
  searchQuery.value = ''
  activeRegion.value = 'ALL'
  localOnly.value = false
  activeNotes.value = []
  if (searchBarRef.value?.reset) {
    searchBarRef.value.reset()
  }
}

onMounted(() => {
  fetchData()
})

useHead({
  title: 'Perfumery Product Leaderboard — Community Fragrance Rankings',
})
</script>

<style scoped>
/* Hero */
.hero {
  position: relative;
  padding: var(--space-20) 0 var(--space-12);
  overflow: hidden;
}

.hero__glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(212, 168, 83, 0.08) 0%, transparent 70%);
  pointer-events: none;
  animation: pulse-glow 4s ease-in-out infinite;
}

.hero__content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 760px;
  margin: 0 auto;
}

.hero__badge {
  display: inline-block;
  padding: var(--space-1) var(--space-4);
  background: var(--accent-gold-dim);
  color: var(--accent-gold);
  border: 1px solid rgba(212, 168, 83, 0.2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-6);
}

.hero__title {
  font-family: var(--font-display);
  font-size: var(--text-6xl);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: var(--space-6);
  letter-spacing: -0.02em;
}

.hero__accent {
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero__subtitle {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  line-height: 1.7;
  max-width: 620px;
  margin: 0 auto;
}

.hero__stat-line {
  display: block;
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}

/* Regional Quick Overview Grid */
.section--regions {
  margin-bottom: var(--space-8);
}

.regions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: var(--space-3);
}

.region-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-base);
  color: inherit;
}

.region-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-medium);
  transform: translateY(-2px);
}

.region-card--active {
  background: rgba(212, 168, 83, 0.12);
  border-color: var(--accent-gold);
  box-shadow: 0 0 16px rgba(212, 168, 83, 0.2);
}

.region-card--local.region-card--active {
  background: rgba(239, 68, 68, 0.12);
  border-color: #ef4444;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.2);
}

.region-card__icon {
  font-size: 1.5rem;
}

.region-card__name {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: 1.2;
}

.region-card__count {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* Sections */
.section {
  margin-bottom: var(--space-16);
}

.section__header {
  margin-bottom: var(--space-6);
}

.section__header--flex {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-4);
}

.section__title {
  font-size: var(--text-2xl);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.section__badge-filter {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--accent-gold);
  background: var(--accent-gold-dim);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(212, 168, 83, 0.25);
}

.section__badge-filter--notes {
  color: var(--accent-rose);
  background: var(--accent-rose-dim);
  border-color: rgba(244, 114, 182, 0.25);
}

.section__subtitle {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-top: var(--space-1);
}

.btn--reset {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
  color: var(--accent-coral);
  border-color: rgba(251, 113, 133, 0.3);
}

.btn--reset:hover {
  background: rgba(251, 113, 133, 0.1);
  border-color: var(--accent-coral);
}

/* Contributors */
.contributors-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.contributor-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
}

.contributor-info {
  flex: 1;
  min-width: 0;
}

.contributor-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-base);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contributor-stats {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}

.contributor-separator {
  margin: 0 var(--space-1);
}

/* Categories */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}

.category-card {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  cursor: pointer;
  transition: all var(--transition-base);
}

.category-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-medium);
}

.category-card--active {
  border-color: var(--accent-rose);
  background: rgba(244, 114, 182, 0.08);
  box-shadow: 0 0 16px rgba(244, 114, 182, 0.2);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-active-tag {
  font-size: var(--text-xs);
  color: var(--accent-rose);
  font-weight: 600;
}

.category-count {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-lg);
  color: var(--text-primary);
}

.category-examples {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  line-height: 1.4;
}

/* Footer */
.footer {
  padding: var(--space-12) 0;
  border-top: 1px solid var(--border-subtle);
  margin-top: var(--space-16);
}

.footer__text {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* Loading */
.loading-state {
  text-align: center;
  padding: var(--space-24) 0;
  color: var(--text-tertiary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-subtle);
  border-top-color: var(--accent-gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto var(--space-4);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  text-align: center;
  padding: var(--space-16) 0;
  color: var(--accent-coral);
}

/* Responsive */
@media (max-width: 768px) {
  .hero {
    padding: var(--space-16) 0 var(--space-10);
  }

  .hero__title {
    font-size: var(--text-4xl);
  }

  .hero__subtitle {
    font-size: var(--text-base);
  }

  .contributors-grid {
    grid-template-columns: 1fr;
  }

  .section__header--flex {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .hero__title {
    font-size: var(--text-3xl);
  }
}
</style>
