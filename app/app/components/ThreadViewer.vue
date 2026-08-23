<template>
  <div class="thread-viewer">
    <div class="thread-viewer__header" @click="isExpanded = !isExpanded">
      <div class="thread-viewer__preview">
        <span class="thread-viewer__author">{{ thread.keywordMessage.author }}</span>
        <span class="thread-viewer__time">{{ formatDateTime(thread.keywordMessage.timestamp) }}</span>
      </div>
      <p class="thread-viewer__snippet">{{ thread.keywordMessage.content.substring(0, 120) }}{{ thread.keywordMessage.content.length > 120 ? '...' : '' }}</p>
      <div class="thread-viewer__meta">
        <span v-if="thread.parentChain.length" class="thread-viewer__badge">
          ↑ {{ thread.parentChain.length }} parent{{ thread.parentChain.length > 1 ? 's' : '' }}
        </span>
        <span v-if="thread.replies.length" class="thread-viewer__badge">
          ↓ {{ thread.replies.length }} repl{{ thread.replies.length > 1 ? 'ies' : 'y' }}
        </span>
        <span class="thread-viewer__badge thread-viewer__badge--context">
          {{ thread.contextBefore.length + thread.contextAfter.length }} context
        </span>
        <span class="thread-viewer__toggle">{{ isExpanded ? '▲' : '▼' }}</span>
      </div>
    </div>

    <Transition name="expand">
      <div v-if="isExpanded" class="thread-viewer__body">
        <!-- Context Before -->
        <div v-if="thread.contextBefore.length" class="thread-viewer__section">
          <div class="thread-viewer__section-label">Context Before</div>
          <div
            v-for="msg in thread.contextBefore"
            :key="msg.id"
            class="thread-message thread-message--context"
          >
            <div class="thread-author">
              {{ msg.author }}
              <span class="thread-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <div class="thread-content" v-html="highlightKeyword(msg.content)" />
          </div>
        </div>

        <!-- Parent Chain -->
        <div v-if="thread.parentChain.length" class="thread-viewer__section">
          <div class="thread-viewer__section-label">↑ Reply Chain</div>
          <div
            v-for="msg in thread.parentChain"
            :key="msg.id"
            class="thread-message thread-message--reply"
          >
            <div class="thread-author">
              {{ msg.author }}
              <span class="thread-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <div class="thread-content" v-html="highlightKeyword(msg.content)" />
          </div>
        </div>

        <!-- Keyword Message -->
        <div class="thread-viewer__section">
          <div class="thread-viewer__section-label">★ Keyword Hit</div>
          <div class="thread-message thread-message--keyword">
            <div class="thread-author">
              {{ thread.keywordMessage.author }}
              <span class="thread-time">{{ formatTime(thread.keywordMessage.timestamp) }}</span>
            </div>
            <div class="thread-content" v-html="highlightKeyword(thread.keywordMessage.content)" />
          </div>
        </div>

        <!-- Replies -->
        <div v-if="thread.replies.length" class="thread-viewer__section">
          <div class="thread-viewer__section-label">↓ Replies</div>
          <div
            v-for="msg in thread.replies"
            :key="msg.id"
            class="thread-message thread-message--reply"
          >
            <div class="thread-author">
              {{ msg.author }}
              <span class="thread-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <div class="thread-content" v-html="highlightKeyword(msg.content)" />
          </div>
        </div>

        <!-- Context After -->
        <div v-if="thread.contextAfter.length" class="thread-viewer__section">
          <div class="thread-viewer__section-label">Context After</div>
          <div
            v-for="msg in thread.contextAfter"
            :key="msg.id"
            class="thread-message thread-message--context"
          >
            <div class="thread-author">
              {{ msg.author }}
              <span class="thread-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <div class="thread-content" v-html="highlightKeyword(msg.content)" />
          </div>
        </div>
      </div>
    </Transition>
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

<style scoped>
.thread-viewer {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-card);
  transition: all var(--transition-base);
}

.thread-viewer:hover {
  border-color: var(--border-medium);
}

.thread-viewer__header {
  padding: var(--space-4);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.thread-viewer__header:hover {
  background: var(--bg-card-hover);
}

.thread-viewer__preview {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.thread-viewer__author {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--accent-lavender);
}

.thread-viewer__time {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.thread-viewer__snippet {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-2);
}

.thread-viewer__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.thread-viewer__badge {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  background: var(--bg-tertiary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
}

.thread-viewer__badge--context {
  color: var(--text-muted);
}

.thread-viewer__toggle {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.thread-viewer__body {
  border-top: 1px solid var(--border-subtle);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.thread-viewer__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.thread-viewer__section-label {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding-bottom: var(--space-1);
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 2000px;
}

/* Keyword highlighting */
:deep(.highlight) {
  background: var(--accent-gold-dim);
  color: var(--accent-gold);
  padding: 1px 3px;
  border-radius: 3px;
  font-weight: 600;
}
</style>
