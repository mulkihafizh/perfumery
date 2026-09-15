<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 border border-[#232328] bg-[#151519] divide-y lg:divide-y-0 lg:divide-x divide-[#232328] mb-8">
    <div
      v-for="(stat, idx) in stats"
      :key="stat.label"
      class="p-4 sm:p-5 flex flex-col justify-between hover:bg-[#1b1b22] transition-colors"
    >
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          {{ stat.label }}
        </span>
        <span class="font-mono text-[10px] text-neutral-600">0{{ idx + 1 }}</span>
      </div>
      <div class="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-neutral-100 tracking-tight mt-2">
        {{ stat.value }}
      </div>
      <div class="text-[11px] text-neutral-400 mt-1">
        {{ stat.subtext }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  totalMessages: number
  totalPerfumes: number
  totalThreads: number
  keyword: string
}>()

const stats = computed(() => [
  {
    value: props.totalMessages.toLocaleString(),
    label: 'Messages Scanned',
    subtext: 'Community corpus archive',
  },
  {
    value: props.totalPerfumes.toLocaleString(),
    label: 'Perfumes Ranked',
    subtext: 'Catalogued products',
  },
  {
    value: props.totalThreads.toLocaleString(),
    label: 'Threads Analyzed',
    subtext: 'Contextual discussions',
  },
  {
    value: `"${props.keyword}"`,
    label: 'Keyword Anchor',
    subtext: 'Primary query filter',
  },
])
</script>
