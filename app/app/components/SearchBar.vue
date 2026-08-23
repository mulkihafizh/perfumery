<template>
  <div class="search-wrapper">
    <!-- Top Search & Quick Controls -->
    <div class="search-top-bar">
      <div class="search-container">
        <svg
          class="search-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id="perfume-search"
          v-model="query"
          type="text"
          class="search-input"
          :placeholder="placeholder || 'Search by perfume line (e.g. Hawas, MYSLF, Ostara, Sauvage), brand, or note...'"
          @input="emitChanges"
        />
        <button
          v-if="query"
          class="search-clear"
          aria-label="Clear search"
          @click="clearSearch"
        >
          ✕
        </button>
      </div>

      <!-- Quick Local Brand Toggle -->
      <button
        class="local-toggle-btn"
        :class="{ 'local-toggle-btn--active': localOnly }"
        @click="toggleLocalOnly"
      >
        <span class="local-toggle-icon">🇮🇩</span>
        <span class="local-toggle-text">Local Brands Only</span>
        <span class="local-toggle-indicator" />
      </button>
    </div>

    <!-- Region / Origin Filter Pills -->
    <div class="filter-section">
      <div class="filter-section-title">🌍 Origin / Region:</div>
      <div class="filter-pills filter-pills--regions">
        <button
          class="btn"
          :class="selectedRegion === 'ALL' && !localOnly ? 'btn--active' : 'btn--ghost'"
          @click="setRegion('ALL')"
        >
          🌐 All Regions
        </button>
        <button
          v-for="reg in availableRegions"
          :key="reg.id"
          class="btn"
          :class="selectedRegion === reg.id ? 'btn--active' : 'btn--ghost'"
          @click="setRegion(reg.id)"
        >
          {{ reg.flag }} {{ reg.label }}
        </button>
      </div>
    </div>

    <!-- Note Filter Pills -->
    <div class="filter-section">
      <div class="filter-section-header">
        <div class="filter-section-title">🌸 Scent Notes:</div>
        <button
          v-if="selectedNotes.length > 0"
          class="clear-notes-btn"
          @click="clearNotes"
        >
          Clear notes ({{ selectedNotes.length }}) ✕
        </button>
      </div>
      <div class="filter-pills filter-pills--notes">
        <button
          class="btn btn--sm"
          :class="selectedNotes.length === 0 ? 'btn--active' : 'btn--ghost'"
          @click="clearNotes"
        >
          ✨ All Notes
        </button>
        <button
          v-for="note in availableNotes"
          :key="note"
          class="btn btn--sm"
          :class="selectedNotes.includes(note) ? 'btn--active btn--active-rose' : 'btn--ghost'"
          @click="toggleNote(note)"
        >
          {{ noteIcons[note] || '🏷️' }} {{ note }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  search: [query: string]
  filterRegion: [region: string]
  filterNotes: [notes: string[]]
  filterLocalOnly: [localOnly: boolean]
}>()

const props = defineProps<{
  placeholder?: string
  initialQuery?: string
  initialRegion?: string
  initialLocalOnly?: boolean
  initialNotes?: string[]
}>()

const query = ref(props.initialQuery || '')
const selectedRegion = ref(props.initialRegion || 'ALL')
const localOnly = ref(props.initialLocalOnly || false)
const selectedNotes = ref<string[]>(props.initialNotes || [])

const availableRegions = [
  { id: 'Indonesia', label: 'Indonesia (Local)', flag: '🇮🇩' },
  { id: 'Middle East', label: 'Middle East / Arabian', flag: '🇦🇪' },
  { id: 'France', label: 'France Designer', flag: '🇫🇷' },
  { id: 'Italy', label: 'Italy Designer', flag: '🇮🇹' },
  { id: 'Niche Houses', label: 'Niche Houses', flag: '👑' },
  { id: 'United States', label: 'United States', flag: '🇺🇸' },
  { id: 'Europe', label: 'Europe (Other)', flag: '🇪🇺' },
]

const availableNotes = [
  'floral',
  'fresh',
  'woody',
  'sweet',
  'fruity',
  'powdery',
  'aromatic',
  'spicy',
  'oriental',
  'leather',
  'aquatic',
]

const noteIcons: Record<string, string> = {
  floral: '🌸',
  fresh: '💧',
  woody: '🪵',
  sweet: '🍬',
  spicy: '🌶️',
  powdery: '✨',
  fruity: '🍊',
  aromatic: '🌿',
  oriental: '🏺',
  leather: '🧥',
  aquatic: '🌊',
}

function emitChanges() {
  emit('search', query.value)
}

function clearSearch() {
  query.value = ''
  emit('search', '')
}

function setRegion(regionId: string) {
  if (regionId === 'Indonesia') {
    localOnly.value = true
  } else {
    localOnly.value = false
  }
  selectedRegion.value = regionId
  emit('filterRegion', regionId)
  emit('filterLocalOnly', localOnly.value)
}

function toggleLocalOnly() {
  localOnly.value = !localOnly.value
  if (localOnly.value) {
    selectedRegion.value = 'Indonesia'
  } else if (selectedRegion.value === 'Indonesia') {
    selectedRegion.value = 'ALL'
  }
  emit('filterLocalOnly', localOnly.value)
  emit('filterRegion', selectedRegion.value)
}

function toggleNote(note: string) {
  const idx = selectedNotes.value.indexOf(note)
  if (idx >= 0) {
    selectedNotes.value.splice(idx, 1)
  } else {
    selectedNotes.value.push(note)
  }
  emit('filterNotes', [...selectedNotes.value])
}

function clearNotes() {
  selectedNotes.value = []
  emit('filterNotes', [])
}

// Expose reset method for parent
defineExpose({
  reset() {
    query.value = ''
    selectedRegion.value = 'ALL'
    localOnly.value = false
    selectedNotes.value = []
  },
  setNotes(notes: string[]) {
    selectedNotes.value = [...notes]
  },
  setRegion(region: string) {
    selectedRegion.value = region
    localOnly.value = region === 'Indonesia'
  },
})
</script>

<style scoped>
.search-wrapper {
  margin-bottom: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background: var(--bg-card);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  backdrop-filter: blur(12px);
}

.search-top-bar {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.search-container {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: var(--text-sm);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.search-clear:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

/* Local Brand Quick Toggle */
.local-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
  user-select: none;
}

.local-toggle-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-medium);
  color: var(--text-primary);
}

.local-toggle-btn--active {
  background: rgba(212, 168, 83, 0.15);
  border-color: var(--accent-gold);
  color: var(--accent-gold);
  box-shadow: 0 0 12px rgba(212, 168, 83, 0.2);
}

.local-toggle-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: all var(--transition-fast);
}

.local-toggle-btn--active .local-toggle-indicator {
  background: var(--accent-gold);
  box-shadow: 0 0 6px var(--accent-gold);
}

/* Filter Sections */
.filter-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.filter-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.clear-notes-btn {
  background: none;
  border: none;
  font-size: var(--text-xs);
  color: var(--accent-rose);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.clear-notes-btn:hover {
  background: rgba(244, 114, 182, 0.1);
}

.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.btn--sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
}

.btn--active-rose {
  background: rgba(244, 114, 182, 0.15) !important;
  color: var(--accent-rose) !important;
  border-color: var(--accent-rose) !important;
  box-shadow: 0 0 10px rgba(244, 114, 182, 0.25);
}

@media (max-width: 768px) {
  .search-top-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-pills {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: var(--space-2);
    -webkit-overflow-scrolling: touch;
  }
}
</style>
