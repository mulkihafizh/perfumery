<template>
  <div class="stats-overview">
    <div
      v-for="(stat, index) in stats"
      :key="stat.label"
      class="stat-card animate-fade-in-up"
      :class="`delay-${index + 1}`"
      :style="{ opacity: 0 }"
    >
      <div class="stat-number">{{ stat.value }}</div>
      <div class="stat-label">{{ stat.label }}</div>
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
  { value: props.totalMessages.toLocaleString(), label: 'Messages Scanned' },
  { value: props.totalPerfumes.toLocaleString(), label: 'Perfumes Ranked' },
  { value: props.totalThreads.toLocaleString(), label: 'Threads Analyzed' },
  { value: `"${props.keyword}"`, label: 'Keyword Filter' },
])
</script>

<style scoped>
.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-10);
}

@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
}

@media (max-width: 480px) {
  .stats-overview {
    grid-template-columns: 1fr;
  }
}
</style>
