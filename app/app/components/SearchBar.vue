<template>
  <div class="mb-6 p-4 sm:p-5 bg-[#151519] border border-[#232328] flex flex-col gap-4">
    <!-- Top Search & Quick Controls -->
    <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <!-- Search Input Container -->
      <div class="relative flex-1">
        <Icon
          name="lucide:search"
          class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none"
        />
        <input
          id="perfume-search"
          v-model="query"
          type="text"
          class="w-full bg-[#0e0e11] border border-[#232328] hover:border-neutral-700 focus:border-neutral-400 focus:outline-none text-neutral-100 placeholder-neutral-500 text-sm pl-10 pr-9 py-2.5 transition-colors font-sans"
          :placeholder="placeholder || 'Search catalogue by line (Hawas, MYSLF), brand, or accord...'"
          @input="emitChanges"
        />
        <button
          v-if="query"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-100 transition-colors"
          aria-label="Clear search"
          @click="clearSearch"
        >
          <Icon name="lucide:x" class="w-4 h-4" />
        </button>
      </div>

      <!-- Quick Local Brand Toggle -->
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 border text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap"
        :class="localOnly
          ? 'bg-stone-800 text-stone-100 border-stone-600'
          : 'bg-[#0e0e11] text-neutral-400 border-[#232328] hover:border-neutral-600 hover:text-neutral-200'"
        @click="toggleLocalOnly"
      >
        <span class="text-sm">🇮🇩</span>
        <span>Local Ateliers</span>
        <span
          class="w-1.5 h-1.5 rounded-full"
          :class="localOnly ? 'bg-amber-400' : 'bg-neutral-600'"
        />
      </button>
    </div>

    <!-- Region / Origin Filter Pills -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          Geographic Provenance
        </span>
        <span v-if="selectedRegion !== 'ALL'" class="font-mono text-[10px] text-neutral-400">
          FILTER: {{ selectedRegion }}
        </span>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          class="px-2.5 py-1 text-xs border transition-colors flex items-center gap-1.5"
          :class="selectedRegion === 'ALL' && !localOnly
            ? 'bg-neutral-100 text-neutral-900 border-neutral-100 font-semibold'
            : 'bg-[#0e0e11] text-neutral-400 border-[#232328] hover:border-neutral-600 hover:text-neutral-200'"
          @click="setRegion('ALL')"
        >
          <Icon name="lucide:globe" class="w-3.5 h-3.5" />
          <span>All Provenances</span>
        </button>

        <button
          v-for="reg in availableRegions"
          :key="reg.id"
          type="button"
          class="px-2.5 py-1 text-xs border transition-colors flex items-center gap-1.5"
          :class="selectedRegion === reg.id
            ? 'bg-neutral-100 text-neutral-900 border-neutral-100 font-semibold'
            : 'bg-[#0e0e11] text-neutral-400 border-[#232328] hover:border-neutral-600 hover:text-neutral-200'"
          @click="setRegion(reg.id)"
        >
          <span>{{ reg.flag }}</span>
          <span>{{ reg.label }}</span>
        </button>
      </div>
    </div>

    <!-- Scent Note Accord Filters -->
    <div class="flex flex-col gap-1.5 pt-2 border-t border-[#232328]">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          Olfactory Profile / Accords
        </span>
        <button
          v-if="selectedNotes.length > 0"
          type="button"
          class="text-[10px] font-semibold uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
          @click="clearNotes"
        >
          <span>Clear accords ({{ selectedNotes.length }})</span>
          <Icon name="lucide:x" class="w-3 h-3" />
        </button>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          class="px-2.5 py-1 text-xs border transition-colors"
          :class="selectedNotes.length === 0
            ? 'bg-neutral-100 text-neutral-900 border-neutral-100 font-semibold'
            : 'bg-[#0e0e11] text-neutral-400 border-[#232328] hover:border-neutral-600 hover:text-neutral-200'"
          @click="clearNotes"
        >
          All Accords
        </button>

        <button
          v-for="note in availableNotes"
          :key="note"
          type="button"
          class="px-2.5 py-1 text-xs border transition-colors capitalize flex items-center gap-1.5"
          :class="selectedNotes.includes(note)
            ? 'bg-stone-800 text-stone-100 border-stone-600 font-semibold'
            : 'bg-[#0e0e11] text-neutral-400 border-[#232328] hover:border-neutral-600 hover:text-neutral-200'"
          @click="toggleNote(note)"
        >
          <Icon :name="getNoteIcon(note)" class="w-3 h-3 opacity-80" />
          <span>{{ note }}</span>
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
  { id: 'Indonesia', label: 'Indonesia', flag: '🇮🇩' },
  { id: 'Middle East', label: 'Middle East', flag: '🇦🇪' },
  { id: 'France', label: 'France', flag: '🇫🇷' },
  { id: 'Italy', label: 'Italy', flag: '🇮🇹' },
  { id: 'Niche Houses', label: 'Niche Houses', flag: '👑' },
  { id: 'United States', label: 'United States', flag: '🇺🇸' },
  { id: 'Europe', label: 'Europe', flag: '🇪🇺' },
]

const availableNotes = [
  'woody',
  'floral',
  'fresh',
  'citrus',
  'sweet',
  'vanilla',
  'spicy',
  'aromatic',
  'aquatic',
  'powdery',
  'fruity',
  'leather',
  'oriental',
]

const noteIconMap: Record<string, string> = {
  woody: 'lucide:tree-pine',
  floral: 'lucide:flower-2',
  fresh: 'lucide:leaf',
  citrus: 'lucide:sun-medium',
  sweet: 'lucide:cookie',
  vanilla: 'lucide:sparkles',
  spicy: 'lucide:flame',
  aromatic: 'lucide:sparkle',
  aquatic: 'lucide:droplets',
  powdery: 'lucide:wind',
  fruity: 'lucide:apple',
  leather: 'lucide:shield',
  oriental: 'lucide:compass',
}

function getNoteIcon(note: string): string {
  return noteIconMap[note.toLowerCase()] || 'lucide:tag'
}

let searchDebounceTimer: any = null

function emitChanges() {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    emit('search', query.value)
  }, 250)
}

function clearSearch() {
  clearTimeout(searchDebounceTimer)
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
