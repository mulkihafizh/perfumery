<template>
  <span :class="['note-badge', badgeClass]">
    <span class="note-badge__icon">{{ icon }}</span>
    {{ note }}
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  note: string
}>()

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
  local: '🇮🇩',
  budget: '💰',
  niche: '💎',
  designer: '👔',
  clone: '🔄',
  arabian: '🕌',
}

const icon = computed(() => noteIcons[props.note] || '🏷️')

const validClasses = ['floral', 'fresh', 'woody', 'sweet', 'spicy', 'powdery', 'fruity', 'aromatic', 'oriental', 'leather']

const badgeClass = computed(() => {
  return validClasses.includes(props.note) ? `note-badge--${props.note}` : 'note-badge--default'
})
</script>

<style scoped>
.note-badge__icon {
  font-size: 0.7em;
}
</style>
