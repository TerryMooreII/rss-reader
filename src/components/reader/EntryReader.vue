<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useEntryStore } from '@/stores/entries'
import { useUIStore } from '@/stores/ui'
import { sanitizeHtml } from '@/utils/sanitize'
import {
  ArrowTopRightOnSquareIcon,
  StarIcon as StarOutline,
  ShareIcon,
  XMarkIcon,
  RssIcon,
} from '@heroicons/vue/24/outline'
import { StarIcon as StarSolid } from '@heroicons/vue/24/solid'
import MediaEmbed from './MediaEmbed.vue'
import { detectMedia } from '@/utils/mediaDetect'

const entryStore = useEntryStore()
const ui = useUIStore()

const entry = computed(() => entryStore.selectedEntry)
const readerEl = ref<HTMLElement | null>(null)

const faviconError = ref(false)
watch(() => entry.value?.id, () => { faviconError.value = false })

// Focus the reader panel when a new entry is selected
watch(
  () => entry.value?.id,
  async (newId) => {
    if (newId && readerEl.value) {
      await nextTick()
      readerEl.value.focus({ preventScroll: true })
    }
  },
)

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

const media = computed(() => {
  if (!entry.value) return null
  return detectMedia(entry.value.url, entry.value.content_html)
})

const sanitizedContent = computed(() => {
  if (!entry.value) return ''
  let html = entry.value.content_html || entry.value.summary || ''
  // Decode XML entities for feeds that entity-encode their HTML content
  if (html.includes('&lt;') || html.includes('&gt;')) {
    html = decodeXmlEntities(html)
  }
  // Strip YouTube iframes from content when we render our own player
  if (media.value?.type === 'youtube') {
    html = html.replace(/<iframe[^>]*youtube(?:-nocookie)?\.com\/embed\/[^>]*>[\s\S]*?<\/iframe>/gi, '')
  }
  return sanitizeHtml(html)
})

const timeAgo = computed(() => {
  if (!entry.value?.published_at) return ''
  const date = new Date(entry.value.published_at)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})

const isStarred = computed(() => !!entry.value?.starred_at)

function toggleStar() {
  if (entry.value) entryStore.toggleStar(entry.value.id)
}

function openExternal() {
  if (entry.value?.url) window.open(entry.value.url, '_blank')
}

function shareLink() {
  if (entry.value?.url) {
    navigator.clipboard.writeText(entry.value.url)
  }
}
</script>

<template>
  <div
    v-if="entry"
    ref="readerEl"
    class="flex h-full flex-col overflow-hidden bg-bg-primary"
    role="region"
    aria-label="Article reader"
    tabindex="-1"
  >
    <!-- Toolbar -->
    <div class="flex items-center justify-between border-b px-4 py-2 shrink-0">
      <div class="flex items-center gap-2">
        <button class="btn-ghost text-xs gap-1" aria-label="Open original article" @click="openExternal">
          <ArrowTopRightOnSquareIcon class="h-4 w-4" />
          Open
        </button>
        <button
          class="btn-ghost text-xs gap-1"
          :aria-label="isStarred ? 'Unstar this entry' : 'Star this entry'"
          :aria-pressed="isStarred"
          @click="toggleStar"
        >
          <StarSolid v-if="isStarred" class="h-4 w-4 text-star" />
          <StarOutline v-else class="h-4 w-4" />
          {{ isStarred ? 'Starred' : 'Star' }}
        </button>
        <button class="btn-ghost text-xs gap-1" aria-label="Copy link to clipboard" @click="shareLink">
          <ShareIcon class="h-4 w-4" />
          Share
        </button>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-ghost text-xs gap-1" aria-label="Close reader" @click="entryStore.selectEntry(null)">
          <XMarkIcon class="h-4 w-4" />
          Close
        </button>
      </div>
    </div>

    <!-- Article content -->
    <div class="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8">
      <article class="mx-auto max-w-2xl">
        <!-- Feed info -->
        <div class="mb-4 flex items-center gap-2 text-xs text-text-muted">
          <img
            v-if="entry.feed_favicon_url && !faviconError"
            :src="entry.feed_favicon_url"
            alt=""
            class="h-4 w-4 rounded"
            @error="faviconError = true"
          />
          <RssIcon v-else class="h-4 w-4 shrink-0 text-text-muted" />
          <span class="font-medium text-accent">{{ entry.feed_title }}</span>
          <span v-if="entry.author">&middot; {{ entry.author }}</span>
        </div>

        <!-- Title -->
        <h1 class="text-2xl font-bold leading-tight text-text-primary mb-2">
          {{ entry.title || 'Untitled' }}
        </h1>

        <!-- Date -->
        <p class="text-sm text-text-muted mb-6">{{ timeAgo }}</p>

        <!-- Featured image (hidden when YouTube video detected) -->
        <img
          v-if="entry.image_url && media?.type !== 'youtube'"
          :src="entry.image_url"
          :alt="entry.title || ''"
          class="w-full rounded-lg mb-6"
          loading="lazy"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />

        <!-- Media embed -->
        <MediaEmbed v-if="media" :media="media" />

        <!-- Content -->
        <div
          class="prose prose-sm max-w-none
            prose-a:no-underline hover:prose-a:underline
            prose-code:bg-bg-secondary prose-code:rounded prose-code:px-1
            prose-img:rounded-lg"
          v-html="sanitizedContent"
        />

        <!-- Show more link -->
        <div v-if="entry.url" class="mt-8 border-t pt-4">
          <a
            :href="entry.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm font-medium text-accent hover:underline"
          >
            Read full article &rarr;
          </a>
        </div>
      </article>
    </div>
  </div>

  <!-- Empty state -->
  <div v-else class="flex h-full items-center justify-center text-text-muted">
    <p class="text-sm">Select an entry to read</p>
  </div>
</template>
