<template>
  <div class="border border-[#232328] bg-[#151519] transition-colors">
    <!-- Header Summary Row -->
    <div
      class="p-4 cursor-pointer hover:bg-[#1b1b22] transition-colors select-none"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold text-neutral-200">
            {{ thread.keywordMessage.author }}
          </span>
          <span class="font-mono text-[11px] text-neutral-400">
            {{ formatDateTime(thread.keywordMessage.timestamp) }}
          </span>

          <span
            v-if="thread.source === 'reddit'"
            class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 border border-orange-900/60 bg-orange-950/30 text-orange-300"
          >
            <Icon name="lucide:message-circle" class="w-3 h-3 text-orange-400" />
            <span>r/fragrance</span>
          </span>

          <a
            v-if="thread.url"
            :href="thread.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 border border-orange-800/80 bg-orange-950/50 text-orange-200 hover:bg-orange-900/70 transition-colors"
            title="Open original thread on Reddit"
            @click.stop
          >
            <span>Open on Reddit</span>
            <Icon name="lucide:external-link" class="w-3 h-3" />
          </a>
        </div>

        <div class="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
          <span v-if="thread.parentChain.length" class="px-1.5 py-0.5 border border-[#232328] bg-[#0e0e11]">
            ↑ {{ thread.parentChain.length }} parent{{ thread.parentChain.length > 1 ? 's' : '' }}
          </span>
          <span v-if="thread.replies.length" class="px-1.5 py-0.5 border border-[#232328] bg-[#0e0e11]">
            ↓ {{ thread.replies.length }} repl{{ thread.replies.length > 1 ? 'ies' : 'y' }}
          </span>
          <span class="px-1.5 py-0.5 border border-[#232328] bg-[#0e0e11]">
            {{ thread.contextBefore.length + thread.contextAfter.length }} context
          </span>
          <Icon
            :name="isExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            class="w-4 h-4 text-neutral-400"
          />
        </div>
      </div>

      <!-- Preview Snippet -->
      <p class="text-xs text-neutral-400 line-clamp-2 leading-relaxed font-sans">
        {{ thread.keywordMessage.content }}
      </p>
    </div>

    <!-- Expanded Body: Archival Ledger -->
    <div v-if="isExpanded" class="border-t border-[#232328] p-4 bg-[#121216] flex flex-col gap-4">
      <!-- Context Before -->
      <div v-if="thread.contextBefore.length" class="flex flex-col gap-2">
        <div class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          Preceding Context
        </div>
        <div
          v-for="msg in thread.contextBefore"
          :key="msg.id"
          class="p-3 border border-[#232328] bg-[#151519] text-xs text-neutral-400"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium text-neutral-300">{{ msg.author }}</span>
            <span class="font-mono text-[10px] text-neutral-400">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="leading-relaxed" v-html="highlightKeyword(msg.content)" />
        </div>
      </div>

      <!-- Parent Chain -->
      <div v-if="thread.parentChain.length" class="flex flex-col gap-2">
        <div class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          ↑ Parent Reply Chain
        </div>
        <div
          v-for="msg in thread.parentChain"
          :key="msg.id"
          class="p-3 border-l-2 border-l-neutral-600 border-y border-r border-[#232328] bg-[#151519] text-xs text-neutral-300"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium text-neutral-200">{{ msg.author }}</span>
            <span class="font-mono text-[10px] text-neutral-400">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="leading-relaxed" v-html="highlightKeyword(msg.content)" />
        </div>
      </div>

      <!-- Keyword Anchor Message -->
      <div class="flex flex-col gap-2">
        <div class="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-400 flex items-center gap-1">
          <Icon name="lucide:crosshair" class="w-3 h-3" />
          <span>Keyword Hit Message</span>
        </div>
        <div class="p-3.5 border border-amber-900/50 bg-amber-950/20 text-xs text-neutral-100">
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-bold text-amber-200">{{ thread.keywordMessage.author }}</span>
            <span class="font-mono text-[10px] text-amber-300/70">{{ formatTime(thread.keywordMessage.timestamp) }}</span>
          </div>
          <div class="leading-relaxed" v-html="highlightKeyword(thread.keywordMessage.content)" />
        </div>
      </div>

      <!-- Replies -->
      <div v-if="thread.replies.length" class="flex flex-col gap-2">
        <div class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          ↓ Direct Responses
        </div>
        <div
          v-for="msg in thread.replies"
          :key="msg.id"
          class="p-3 border-l-2 border-l-neutral-600 border-y border-r border-[#232328] bg-[#151519] text-xs text-neutral-300"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium text-neutral-200">{{ msg.author }}</span>
            <span class="font-mono text-[10px] text-neutral-400">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="leading-relaxed" v-html="highlightKeyword(msg.content)" />
        </div>
      </div>

      <!-- Context After -->
      <div v-if="thread.contextAfter.length" class="flex flex-col gap-2">
        <div class="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          Subsequent Context
        </div>
        <div
          v-for="msg in thread.contextAfter"
          :key="msg.id"
          class="p-3 border border-[#232328] bg-[#151519] text-xs text-neutral-400"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium text-neutral-300">{{ msg.author }}</span>
            <span class="font-mono text-[10px] text-neutral-400">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="leading-relaxed" v-html="highlightKeyword(msg.content)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConversationThread } from '~/composables/usePerfumeData'
import { formatDateTime, formatTime } from '~/composables/usePerfumeData'

const props = defineProps<{
  thread: ConversationThread
  keyword?: string
}>()

const isExpanded = ref(false)

function highlightKeyword(text: string): string {
  if (!props.keyword) return escapeHtml(text)

  const escaped = escapeHtml(text)
  const kw = props.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${kw})`, 'gi')
  return escaped.replace(regex, '<mark class="highlight">$1</mark>')
}

function escapeHtml(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null
  if (div) {
    div.textContent = text
    return div.innerHTML
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
</script>
