<script setup lang="ts">
import { computed, watch, onUnmounted, toRef } from 'vue'
import type { Entry } from '@/types/models'
import { useEntryStore } from '@/stores/entries'
import { useUIStore } from '@/stores/ui'
import { useEntryActions } from '@/composables/useEntryActions'
import { cleanAuthor } from '@/utils/html'
import { formatTimeAgo, now } from '@/utils/date'
import { renderEntryHtml, PROSE_CLASS } from '@/utils/entryContent'
import { detectMedia } from '@/utils/mediaDetect'
import {
  StarIcon as StarOutline,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronUpIcon,
} from '@heroicons/vue/24/outline'
import { StarIcon as StarSolid } from '@heroicons/vue/24/solid'
import MediaEmbed from '@/components/reader/MediaEmbed.vue'
import ShareMenu from '@/components/common/ShareMenu.vue'
import SharePanel from '@/components/common/SharePanel.vue'
import StarTagPicker from '@/components/common/StarTagPicker.vue'
import FeedFavicon from '@/components/ui/FeedFavicon.vue'
import EntryArticleLinks from './EntryArticleLinks.vue'

const props = defineProps<{ entry: Entry; expanded: boolean }>()
const emit = defineEmits<{ click: [] }>()

const entryStore = useEntryStore()
const ui = useUIStore()
const { shareOpen, starPickerOpen, isRead, isStarred, handleStarClick, onStarTagSelect, toggleRead, openExternal } =
  useEntryActions(toRef(props, 'entry'))

const timeAgo = computed(() => formatTimeAgo(props.entry.published_at, now.value))

const media = computed(() => (props.expanded ? detectMedia(props.entry.url, props.entry.content_html) : null))
const sanitizedContent = computed(() =>
  props.expanded ? renderEntryHtml(props.entry, media.value, ui.openLinksInNewTab) : '',
)

// Auto-mark-read a second after expanding
let markReadTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => props.expanded,
  (val) => {
    if (markReadTimer) {
      clearTimeout(markReadTimer)
      markReadTimer = null
    }
    if (val && !props.entry.read_at) {
      markReadTimer = setTimeout(() => entryStore.markRead(props.entry.id), 1000)
    }
    if (!val) shareOpen.value = false
  },
)
onUnmounted(() => {
  if (markReadTimer) clearTimeout(markReadTimer)
})
</script>

<template>
  <article
    class="group/entry border-b border-border cursor-pointer transition-colors outline-none"
    :class="expanded ? 'bg-bg-secondary/50' : 'hover:bg-bg-hover'"
    :aria-label="`${entry.title || 'Untitled'} from ${entry.feed_title || 'unknown feed'}${isRead ? '' : ' (unread)'}${isStarred ? ' (starred)' : ''}`"
    :aria-expanded="expanded"
    @click="emit('click')"
  >
    <div class="px-4 py-4">
      <!-- Header: favicon + feed title + author + time -->
      <div class="flex items-center gap-2 mb-2">
        <FeedFavicon :src="entry.feed_favicon_url" :alt="entry.feed_title || ''" size="sm" />
        <span class="text-sm font-medium text-text-primary truncate">{{ entry.feed_title }}</span>
        <span v-if="entry.author" class="text-xs text-text-muted truncate">&middot; {{ cleanAuthor(entry.author) }}</span>
        <span class="ml-auto text-xs text-text-muted whitespace-nowrap">{{ timeAgo }}</span>
      </div>

      <!-- Collapsed: title + excerpt with thumbnail wrap -->
      <div v-if="!expanded" class="overflow-hidden max-h-40">
        <img
          v-if="entry.image_url && ui.showImages"
          :src="entry.image_url"
          :alt="entry.title || ''"
          class="h-24 w-32 rounded-lg object-cover float-right ml-3 mb-1"
          loading="lazy"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <h3 class="text-base leading-snug mb-1" :class="isRead ? 'text-text-muted' : 'text-text-primary font-semibold'">
          {{ entry.title || 'Untitled' }}
        </h3>
        <p v-if="entry.excerpt" class="text-sm text-text-secondary leading-relaxed">{{ entry.excerpt }}</p>
      </div>

      <!-- Expanded: full content -->
      <div v-else>
        <h3 class="text-base leading-snug mb-2 text-text-primary font-semibold">{{ entry.title || 'Untitled' }}</h3>
        <img
          v-if="entry.image_url && ui.showImages && media?.type !== 'youtube'"
          :src="entry.image_url"
          :alt="entry.title || ''"
          class="w-full rounded-lg mb-4"
          loading="lazy"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <MediaEmbed v-if="media" :media="media" />
        <div :class="PROSE_CLASS" v-html="sanitizedContent" />
        <EntryArticleLinks v-if="entry.url" :url="entry.url" class="mt-4" />
      </div>

      <!-- Action bar -->
      <div
        class="flex items-center gap-1 mt-3 -ml-1.5 transition-opacity flex-wrap"
        :class="expanded ? 'opacity-100' : 'opacity-0 group-hover/entry:opacity-100 focus-within:opacity-100'"
      >
        <div class="relative">
          <button
            class="btn-toolbar"
            :class="isStarred ? 'text-star' : 'hover:text-star'"
            :aria-label="isStarred ? 'Unstar this entry' : 'Star this entry'"
            :aria-pressed="isStarred"
            @click.stop="handleStarClick"
          >
            <StarSolid v-if="isStarred" class="h-4 w-4" />
            <StarOutline v-else class="h-4 w-4" />
            <span class="hidden md:inline">{{ isStarred ? 'Starred' : 'Star' }}</span>
          </button>
          <StarTagPicker v-if="starPickerOpen" @select="onStarTagSelect" @cancel="starPickerOpen = false" />
        </div>

        <button class="btn-toolbar" :aria-label="isRead ? 'Mark as unread' : 'Mark as read'" @click.stop="toggleRead">
          <EyeSlashIcon v-if="isRead" class="h-4 w-4" />
          <EyeIcon v-else class="h-4 w-4" />
          <span class="hidden md:inline">{{ isRead ? 'Mark Unread' : 'Mark Read' }}</span>
        </button>

        <button class="btn-toolbar" aria-label="Open original article" @click.stop="openExternal">
          <ArrowTopRightOnSquareIcon class="h-4 w-4" />
          <span class="hidden md:inline">Open</span>
        </button>

        <ShareMenu v-if="entry.url" v-model:open="shareOpen" />

        <button v-if="expanded" class="btn-toolbar ml-auto" aria-label="Collapse entry" @click.stop="emit('click')">
          <ChevronUpIcon class="h-4 w-4" />
          <span class="hidden md:inline">Collapse</span>
        </button>
      </div>

      <SharePanel v-if="shareOpen && entry.url" :url="entry.url" :title="entry.title || 'Untitled'" />
    </div>
  </article>
</template>
