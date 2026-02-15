<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { Entry } from '@/types/models'
import { useEntryStore } from '@/stores/entries'
import DOMPurify from 'dompurify'
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

const excerpt = computed(() => {
  const text = props.entry.summary || props.entry.content_text || ''
  return text.length > 300 ? text.slice(0, 300) + '...' : text
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
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'srcset', 'sizes', 'loading'],
  })
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
    class="border-b border-border cursor-pointer transition-colors"
    :class="[
      expanded ? 'bg-bg-secondary/50' : 'hover:bg-bg-hover',
      isRead && !expanded ? 'opacity-60' : '',
    ]"
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

      <!-- Title -->
      <h3
        class="text-base leading-snug mb-2"
        :class="isRead && !expanded ? 'text-text-secondary' : 'text-text-primary font-semibold'"
      >
        {{ entry.title || 'Untitled' }}
      </h3>

      <!-- Collapsed: summary + thumbnail -->
      <div v-if="!expanded" class="flex gap-3">
        <p v-if="excerpt" class="flex-1 text-sm text-text-secondary leading-relaxed line-clamp-4">
          {{ excerpt }}
        </p>
        <img
          v-if="entry.image_url"
          :src="entry.image_url"
          :alt="entry.title || ''"
          class="h-20 w-28 shrink-0 rounded-lg object-cover ml-auto"
          loading="lazy"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
      </div>

      <!-- Expanded: full content -->
      <div v-else>
        <!-- Featured image -->
        <img
          v-if="entry.image_url"
          :src="entry.image_url"
          :alt="entry.title || ''"
          class="w-full rounded-lg mb-4"
          loading="lazy"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />

        <!-- Sanitized HTML content -->
        <div
          class="prose prose-sm max-w-none
            prose-headings:text-text-primary
            prose-p:text-text-primary
            prose-a:text-accent prose-a:no-underline hover:prose-a:underline
            prose-strong:text-text-primary
            prose-code:text-accent prose-code:bg-bg-secondary prose-code:rounded prose-code:px-1
            prose-blockquote:border-accent prose-blockquote:text-text-secondary
            prose-img:rounded-lg"
          v-html="sanitizedContent"
        />

        <!-- Read full article link -->
        <div v-if="entry.url" class="mt-4 pt-3 border-t border-border">
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
      <div class="flex items-center gap-1 mt-3 -ml-1.5">
        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors"
          :class="isStarred ? 'text-star' : 'text-text-muted hover:text-star hover:bg-bg-hover'"
          title="Star"
          @click="toggleStar"
        >
          <StarSolid v-if="isStarred" class="h-4 w-4" />
          <StarOutline v-else class="h-4 w-4" />
          <span>Star</span>
        </button>

        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          :title="isRead ? 'Mark unread' : 'Mark read'"
          @click="toggleRead"
        >
          <EyeSlashIcon v-if="isRead" class="h-4 w-4" />
          <EyeIcon v-else class="h-4 w-4" />
          <span>{{ isRead ? 'Unread' : 'Read' }}</span>
        </button>

        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          title="Open original"
          @click="openExternal"
        >
          <ArrowTopRightOnSquareIcon class="h-4 w-4" />
          <span>Open</span>
        </button>

        <button
          class="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          title="Copy link"
          @click="copyLink"
        >
          <LinkIcon class="h-4 w-4" />
          <span>Share</span>
        </button>

        <!-- Collapse button (when expanded) -->
        <button
          v-if="expanded"
          class="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
          title="Collapse"
          @click="collapse"
        >
          <ChevronUpIcon class="h-4 w-4" />
          <span>Collapse</span>
        </button>
      </div>
    </div>
  </article>
</template>
