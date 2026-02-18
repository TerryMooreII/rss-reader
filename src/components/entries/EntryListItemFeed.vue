<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { Entry } from '@/types/models'
import { useEntryStore } from '@/stores/entries'
import { sanitizeHtml } from '@/utils/sanitize'
import { RssIcon } from '@heroicons/vue/24/outline'
import {
  StarIcon as StarOutline,
  ArrowTopRightOnSquareIcon,
  LinkIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronUpIcon,
} from '@heroicons/vue/24/outline'
import { StarIcon as StarSolid } from '@heroicons/vue/24/solid'
import MediaEmbed from '@/components/reader/MediaEmbed.vue'
import { detectMedia } from '@/utils/mediaDetect'

const props = defineProps<{
  entry: Entry
  expanded: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const entryStore = useEntryStore()

let markReadTimer: ReturnType<typeof setTimeout> | null = null

const faviconError = ref(false)

const isRead = computed(() => !!props.entry.read_at)
const isStarred = computed(() => !!props.entry.starred_at)

const timeAgo = computed(() => {
  if (!props.entry.published_at) return ''
  const now = Date.now()
  const published = new Date(props.entry.published_at).getTime()
  const diff = now - published
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
})

const media = computed(() => {
  if (!props.expanded) return null
  return detectMedia(props.entry.url, props.entry.content_html)
})

const excerpt = computed(() => {
  let text = props.entry.summary || props.entry.content_text || ''
  if (!text && props.entry.content_html) {
    const doc = new DOMParser().parseFromString(props.entry.content_html, 'text/html')
    text = doc.body.textContent?.trim() || ''
  }
  return text.length > 500 ? text.slice(0, 500) + '...' : text
})

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

const sanitizedContent = computed(() => {
  if (!props.expanded) return ''
  let html = props.entry.content_html || props.entry.summary || ''
  if (html.includes('&lt;') || html.includes('&gt;')) {
    html = decodeXmlEntities(html)
  }
  // Strip YouTube iframes from content when we render our own player
  if (media.value?.type === 'youtube') {
    html = html.replace(/<iframe[^>]*youtube(?:-nocookie)?\.com\/embed\/[^>]*>[\s\S]*?<\/iframe>/gi, '')
  }
  return sanitizeHtml(html)
})

// Auto-mark-read on expand
watch(() => props.expanded, (val) => {
  if (val && !props.entry.read_at) {
    markReadTimer = setTimeout(() => {
      entryStore.markRead(props.entry.id)
    }, 1000)
  } else if (!val && markReadTimer) {
    clearTimeout(markReadTimer)
    markReadTimer = null
  }
})

onUnmounted(() => {
  if (markReadTimer) clearTimeout(markReadTimer)
})

function toggleStar(e: Event) {
  e.stopPropagation()
  entryStore.toggleStar(props.entry.id)
}

function toggleRead(e: Event) {
  e.stopPropagation()
  entryStore.toggleRead(props.entry.id)
}

function openExternal(e: Event) {
  e.stopPropagation()
  if (props.entry.url) window.open(props.entry.url, '_blank')
}

function copyLink(e: Event) {
  e.stopPropagation()
  if (props.entry.url) navigator.clipboard.writeText(props.entry.url)
}

function collapse(e: Event) {
  e.stopPropagation()
  emit('click')
}
</script>

<template>
  <article
    class="group/entry border-b border-border cursor-pointer transition-colors outline-none"
    :class="[
      expanded ? 'bg-bg-secondary/50' : 'hover:bg-bg-hover',
    ]"
    :aria-label="`${entry.title || 'Untitled'} from ${entry.feed_title || 'unknown feed'}${isRead ? '' : ' (unread)'}${isStarred ? ' (starred)' : ''}`"
    :aria-expanded="expanded"
    @click="$emit('click')"
  >
    <div class="px-4 py-4">
      <!-- Header: favicon + feed title + author + time -->
      <div class="flex items-center gap-2 mb-2">
        <img
          v-if="entry.feed_favicon_url && !faviconError"
          :src="entry.feed_favicon_url"
          :alt="entry.feed_title || ''"
          class="h-5 w-5 shrink-0 rounded"
          loading="lazy"
          @error="faviconError = true"
        />
        <RssIcon v-else class="h-5 w-5 shrink-0 text-text-muted" />
        <span class="text-sm font-medium text-text-primary truncate">{{ entry.feed_title }}</span>
        <span v-if="entry.author" class="text-xs text-text-muted truncate">&middot; {{ entry.author }}</span>
        <span class="ml-auto text-xs text-text-muted whitespace-nowrap">{{ timeAgo }}</span>
      </div>

      <!-- Collapsed: title + summary + thumbnail side by side -->
      <div v-if="!expanded" class="flex gap-3">
        <div class="flex-1 min-w-0">
          <h3
            class="text-base leading-snug mb-1"
            :class="isRead ? 'text-text-muted' : 'text-text-primary font-semibold'"
          >
            {{ entry.title || 'Untitled' }}
          </h3>
          <p v-if="excerpt" class="text-sm text-text-secondary leading-relaxed line-clamp-4">
            {{ excerpt }}
          </p>
        </div>
        <img
          v-if="entry.image_url"
          :src="entry.image_url"
          :alt="entry.title || ''"
          class="h-24 w-32 shrink-0 rounded-lg object-cover self-start mt-0.5"
          loading="lazy"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
      </div>

      <!-- Expanded: full content -->
      <div v-else>
        <h3 class="text-base leading-snug mb-2 text-text-primary font-semibold">
          {{ entry.title || 'Untitled' }}
        </h3>
        <!-- Featured image (hidden when YouTube video detected) -->
        <img
          v-if="entry.image_url && media?.type !== 'youtube'"
          :src="entry.image_url"
          :alt="entry.title || ''"
          class="w-full rounded-lg mb-4"
          loading="lazy"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />

        <!-- Media embed -->
        <MediaEmbed v-if="media" :media="media" />

        <!-- Sanitized HTML content -->
        <div
          class="prose prose-sm max-w-none
            prose-a:no-underline prose-a:hover:underline
            prose-code:bg-bg-secondary prose-code:rounded prose-code:px-1
            prose-img:rounded-lg"
          v-html="sanitizedContent"
        />

        <!-- Read full article link -->
        <div v-if="entry.url" class="mt-4">
          <a
            :href="entry.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm font-medium text-accent hover:underline"
            @click.stop
          >
            Read full article &rarr;
          </a>
        </div>
      </div>

      <!-- Action bar -->
      <div
        class="flex items-center gap-1 mt-3 -ml-1.5 transition-opacity"
        :class="expanded ? 'opacity-100' : 'opacity-0 group-hover/entry:opacity-100 focus-within:opacity-100'"
      >
        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors"
          :class="isStarred ? 'text-star' : 'text-text-muted hover:text-star hover:bg-bg-hover'"
          :aria-label="isStarred ? 'Unstar this entry' : 'Star this entry'"
          :aria-pressed="isStarred"
          @click="toggleStar"
        >
          <StarSolid v-if="isStarred" class="h-4 w-4" />
          <StarOutline v-else class="h-4 w-4" />
          <span>{{ isStarred ? 'Starred' : 'Star' }}</span>
        </button>

        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          :aria-label="isRead ? 'Mark as unread' : 'Mark as read'"
          @click="toggleRead"
        >
          <EyeSlashIcon v-if="isRead" class="h-4 w-4" />
          <EyeIcon v-else class="h-4 w-4" />
          <span>{{ isRead ? 'Mark Unread' : 'Mark Read' }}</span>
        </button>

        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          aria-label="Open original article"
          @click="openExternal"
        >
          <ArrowTopRightOnSquareIcon class="h-4 w-4" />
          <span>Open</span>
        </button>

        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          aria-label="Copy link to clipboard"
          @click="copyLink"
        >
          <LinkIcon class="h-4 w-4" />
          <span>Share</span>
        </button>

        <!-- Collapse button (when expanded) -->
        <button
          v-if="expanded"
          class="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          aria-label="Collapse entry"
          @click="collapse"
        >
          <ChevronUpIcon class="h-4 w-4" />
          <span>Collapse</span>
        </button>
      </div>
    </div>
  </article>
</template>
