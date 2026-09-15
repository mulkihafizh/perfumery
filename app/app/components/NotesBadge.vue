<template>
  <span
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[10px] font-medium uppercase tracking-[0.12em] transition-colors"
    :class="noteStyle.class"
  >
    <Icon :name="noteStyle.icon" class="w-3 h-3 shrink-0 opacity-80" />
    <span>{{ note }}</span>
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  note: string
}>()

interface NoteStyleDef {
  icon: string
  class: string
}

const noteStyles: Record<string, NoteStyleDef> = {
  woody: {
    icon: 'lucide:tree-pine',
    class: 'bg-stone-900/90 text-stone-300 border-stone-800',
  },
  earthy: {
    icon: 'lucide:mountain',
    class: 'bg-stone-900/90 text-stone-300 border-stone-800',
  },
  floral: {
    icon: 'lucide:flower-2',
    class: 'bg-rose-950/40 text-rose-300 border-rose-900/40',
  },
  fresh: {
    icon: 'lucide:leaf',
    class: 'bg-emerald-950/30 text-emerald-300 border-emerald-900/40',
  },
  citrus: {
    icon: 'lucide:sun-medium',
    class: 'bg-emerald-950/30 text-emerald-300 border-emerald-900/40',
  },
  sweet: {
    icon: 'lucide:cookie',
    class: 'bg-amber-950/30 text-amber-300 border-amber-900/40',
  },
  vanilla: {
    icon: 'lucide:sparkles',
    class: 'bg-amber-950/30 text-amber-300 border-amber-900/40',
  },
  gourmand: {
    icon: 'lucide:cookie',
    class: 'bg-amber-950/30 text-amber-300 border-amber-900/40',
  },
  aquatic: {
    icon: 'lucide:droplets',
    class: 'bg-slate-900/90 text-slate-300 border-slate-800',
  },
  marine: {
    icon: 'lucide:waves',
    class: 'bg-slate-900/90 text-slate-300 border-slate-800',
  },
  spicy: {
    icon: 'lucide:flame',
    class: 'bg-orange-950/40 text-orange-300 border-orange-900/40',
  },
  aromatic: {
    icon: 'lucide:sparkle',
    class: 'bg-teal-950/40 text-teal-300 border-teal-900/40',
  },
  powdery: {
    icon: 'lucide:wind',
    class: 'bg-zinc-900 text-zinc-300 border-zinc-800',
  },
  fruity: {
    icon: 'lucide:apple',
    class: 'bg-red-950/30 text-red-300 border-red-900/40',
  },
  leather: {
    icon: 'lucide:shield',
    class: 'bg-amber-950/50 text-amber-200 border-amber-900/50',
  },
  oriental: {
    icon: 'lucide:compass',
    class: 'bg-stone-900/90 text-stone-300 border-stone-800',
  },
}

const noteStyle = computed<NoteStyleDef>(() => {
  const key = props.note?.toLowerCase() || ''
  return noteStyles[key] || {
    icon: 'lucide:tag',
    class: 'bg-neutral-900/80 text-neutral-300 border-neutral-800',
  }
})
</script>
