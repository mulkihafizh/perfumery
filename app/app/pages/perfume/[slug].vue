<template>
  <div class="perfume-detail">
    <!-- Loading -->
    <div v-if="loading" class="container loading-state">
      <div class="loading-spinner" />
      <p>Loading perfume details...</p>
    </div>

    <!-- Not Found -->
    <div v-else-if="!perfume" class="container not-found">
      <h1>Perfume not found</h1>
      <p>The perfume line you're looking for doesn't exist in our current rankings.</p>
      <NuxtLink to="/" class="btn btn--ghost">← Back to Leaderboard</NuxtLink>
    </div>

    <!-- Detail Content -->
    <div v-else>
      <!-- Hero -->
      <header class="detail-hero">
        <div class="container">
          <NuxtLink to="/" class="back-link">← Back to Leaderboard</NuxtLink>

          <div class="detail-hero__content animate-fade-in-up" style="opacity: 0">
            <div class="detail-hero__rank">
              <span
                class="rank-medal rank-medal--lg"
                :class="perfume.rank <= 3 ? `rank-medal--${perfume.rank}` : 'rank-medal--default'"
              >
                {{ perfume.rank <= 3 ? ['🥇','🥈','🥉'][perfume.rank - 1] : `#${perfume.rank}` }}
              </span>
            </div>

            <div class="detail-hero__info">
              <!-- Meta Badges -->
              <div class="detail-hero__meta-badges">
                <span class="region-badge">
                  {{ getRegionFlag(perfume.region) }} {{ perfume.region }}
                </span>
                <span class="category-badge" :class="{ 'category-badge--local': perfume.region === 'Indonesia' }">
                  {{ perfume.category }}
                </span>
                <span v-if="perfume.gender" class="gender-badge">
                  👤 {{ perfume.gender }}
                </span>
              </div>

              <!-- Brand & Name -->
              <div class="detail-hero__brand">{{ perfume.brand }}</div>
              <h1 class="detail-hero__name">{{ perfume.name }}</h1>

              <!-- Description -->
              <p v-if="perfume.description" class="detail-hero__desc">
                {{ perfume.description }}
              </p>

              <!-- Notes -->
              <div class="detail-hero__notes">
                <NotesBadge
                  v-for="note in perfume.topNotes"
                  :key="note"
                  :note="note"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="container">
        <!-- Stats Grid -->
        <div class="detail-stats animate-fade-in-up" style="opacity: 0; animation-delay: 100ms">
          <div class="detail-stat-card">
            <div class="stat-number">{{ perfume.mentionCount }}</div>
            <div class="stat-label">Total Mentions</div>
          </div>
          <div class="detail-stat-card">
            <div class="stat-number">{{ perfume.threadCount }}</div>
            <div class="stat-label">Threads</div>
          </div>
          <div class="detail-stat-card">
            <div class="stat-number">{{ perfume.uniqueAuthors }}</div>
            <div class="stat-label">Unique Members</div>
          </div>
          <div class="detail-stat-card">
            <div class="stat-number">#{{ perfume.rank }}</div>
            <div class="stat-label">Product Rank</div>
          </div>
        </div>

        <!-- Activity Timeline -->
        <div class="detail-section animate-fade-in-up" style="opacity: 0; animation-delay: 200ms">
          <h2 class="section__title">📅 Discussion Period</h2>
          <div class="timeline-bar">
            <div class="timeline-date">{{ formatDate(perfume.firstMentioned) }}</div>
            <div class="timeline-line">
              <div class="timeline-dot" />
              <div class="timeline-connector" />
              <div class="timeline-dot" />
            </div>
            <div class="timeline-date">{{ formatDate(perfume.lastMentioned) }}</div>
          </div>
        </div>

        <!-- Co-Mentions (Frequently Discussed Together) -->
        <div v-if="perfume.coMentions.length" class="detail-section animate-fade-in-up" style="opacity: 0; animation-delay: 300ms">
          <h2 class="section__title">🔗 Frequently Compared / Discussed With</h2>
          <p class="section__subtitle">Other fragrances appearing in the same conversations</p>
          <div class="co-mentions-grid">
            <NuxtLink
              v-for="co in perfume.coMentions"
              :key="co.name"
              :to="`/perfume/${slugify(co.name)}`"
              class="co-mention-card glass-card"
            >
              <div class="co-mention-info">
                <div class="co-mention-name">{{ co.name }}</div>
              </div>
              <div class="co-mention-count">{{ co.count }}×</div>
            </NuxtLink>
          </div>
        </div>

        <!-- Sample Community Quotes -->
        <div v-if="perfume.sampleMentions.length" class="detail-section animate-fade-in-up" style="opacity: 0; animation-delay: 400ms">
          <h2 class="section__title">💬 Community Quotes & Reviews</h2>
          <p class="section__subtitle">Direct messages from members mentioning this fragrance</p>
          <div class="sample-mentions">
            <div
              v-for="(mention, i) in perfume.sampleMentions"
              :key="i"
              class="thread-message thread-message--keyword"
            >
              <div class="thread-author">
                {{ mention.author }}
                <span class="thread-time">{{ formatDateTime(mention.timestamp) }}</span>
              </div>
              <div class="thread-content">"{{ mention.content }}"</div>
            </div>
          </div>
        </div>

        <!-- Full Conversation Threads -->
        <div class="detail-section animate-fade-in-up" style="opacity: 0; animation-delay: 500ms">
          <h2 class="section__title">🧵 Full Conversation Threads</h2>
          <p class="section__subtitle">
            {{ relatedThreads.length }} discussion threads featuring "{{ perfume.name }}"
            <span v-if="relatedThreads.length > visibleThreadCount" class="threads-showing">
              — showing {{ visibleThreadCount }} of {{ relatedThreads.length }}
            </span>
          </p>
          <div class="threads-list">
            <ThreadViewer
              v-for="thread in relatedThreads.slice(0, visibleThreadCount)"
              :key="thread.keywordMessage.id"
              :thread="thread"
              :keyword="meta?.keyword"
            />
          </div>
          <button
            v-if="relatedThreads.length > visibleThreadCount"
            class="btn btn--ghost load-more-btn"
            @click="visibleThreadCount += 10"
          >
            Load more threads...
          </button>
        </div>
      </main>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <p class="footer__text">
          Data extracted from <strong>Motion Ime</strong> Discord Perfumery Channel
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { slugify, formatDate, formatDateTime, getRegionFlag } from '~/composables/usePerfumeData'

const route = useRoute()
const slug = route.params.slug as string

const {
  loading,
  meta,
  fetchData,
  getPerfumeBySlug,
  getThreadsForPerfume,
} = usePerfumeData()

const visibleThreadCount = ref(10)

await fetchData()

const perfume = computed(() => getPerfumeBySlug(slug))

const relatedThreads = computed(() => {
  if (!perfume.value) return []
  return getThreadsForPerfume(perfume.value.name)
})

useHead({
  title: computed(() =>
    perfume.value
      ? `${perfume.value.name} (${perfume.value.brand}) — Perfumery Leaderboard`
      : 'Perfume Not Found'
  ),
})
</script>

<style scoped>
.detail-hero {
  padding: var(--space-12) 0 var(--space-10);
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: var(--space-10);
}

.back-link {
  display: inline-block;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-6);
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--accent-gold);
}

.detail-hero__content {
  display: flex;
  align-items: flex-start;
  gap: var(--space-8);
}

.rank-medal--lg {
  width: 64px;
  height: 64px;
  font-size: var(--text-xl);
  margin-top: var(--space-2);
}

.detail-hero__meta-badges {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  flex-wrap: wrap;
}

.region-badge {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
}

.category-badge {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--accent-lavender);
  background: var(--accent-lavender-dim);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(167, 139, 250, 0.2);
}

.category-badge--local {
  color: var(--accent-gold);
  background: var(--accent-gold-dim);
  border-color: rgba(212, 168, 83, 0.3);
}

.gender-badge {
  font-size: var(--text-xs);
  color: var(--text-muted);
  background: var(--bg-secondary);
  padding: 3px 8px;
  border-radius: var(--radius-full);
}

.detail-hero__brand {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
  margin-bottom: var(--space-1);
}

.detail-hero__name {
  font-size: var(--text-4xl);
  font-weight: 800;
  margin-bottom: var(--space-3);
  line-height: 1.2;
}

.detail-hero__desc {
  font-size: var(--text-base);
  color: var(--text-secondary);
  max-width: 680px;
  line-height: 1.6;
  margin-bottom: var(--space-4);
}

.detail-hero__notes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* Stats */
.detail-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-10);
}

.detail-stat-card {
  background: var(--gradient-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  text-align: center;
}

/* Sections */
.detail-section {
  margin-bottom: var(--space-12);
}

.section__title {
  font-size: var(--text-xl);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.section__subtitle {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  margin-bottom: var(--space-6);
}

/* Timeline */
.timeline-bar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
}

.timeline-date {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  white-space: nowrap;
}

.timeline-line {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent-gold);
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(212, 168, 83, 0.4);
}

.timeline-connector {
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-gold), var(--accent-lavender));
  opacity: 0.4;
}

/* Co-Mentions */
.co-mentions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}

.co-mention-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  text-decoration: none;
  color: inherit;
}

.co-mention-name {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.co-mention-count {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--text-sm);
  color: var(--accent-gold);
}

/* Sample Mentions */
.sample-mentions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Threads */
.threads-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.threads-showing {
  color: var(--text-muted);
}

.load-more-btn {
  width: 100%;
  justify-content: center;
  margin-top: var(--space-4);
  padding: var(--space-3);
}

/* Not Found */
.not-found {
  text-align: center;
  padding: var(--space-24) 0;
}

.not-found h1 {
  font-size: var(--text-3xl);
  margin-bottom: var(--space-4);
}

.not-found p {
  color: var(--text-secondary);
  margin-bottom: var(--space-8);
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

/* Responsive */
@media (max-width: 768px) {
  .detail-hero__content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .detail-hero__name {
    font-size: var(--text-2xl);
  }

  .detail-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
