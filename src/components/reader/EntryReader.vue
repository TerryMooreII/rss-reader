<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useEntryStore } from '@/stores/entries'
import { useUIStore } from '@/stores/ui'
import { useEntryActions } from '@/composables/useEntryActions'
import { cleanAuthor } from '@/utils/html'
import { formatDateTime } from '@/utils/date'
import { renderEntryHtml, PROSE_CLASS } from '@/utils/entryContent'
import { detectMedia } from '@/utils/mediaDetect'
import { ArrowTopRightOnSquareIcon, StarIcon as StarOutline, XMarkIcon } from '@heroicons/vue/24/outline'
import { StarIcon as StarSolid } from '@heroicons/vue/24/solid'
import MediaEmbed from './MediaEmbed.vue'
import ShareMenu from '@/components/common/ShareMenu.vue'
import SharePanel from '@/components/common/SharePanel.vue'
import StarTagPicker from '@/components/common/StarTagPicker.vue'
import FeedFavicon from '@/components/ui/FeedFavicon.vue'
import EntryArticleLinks from '@/components/entries/EntryArticleLinks.vue'

const entryStore = useEntryStore()
const ui = useUIStore()

const entry = computed(() => entryStore.selectedEntry)
const readerEl = ref<HTMLElement | null>(null)
const { shareOpen, starPickerOpen, isStarred, handleStarClick, onStarTagSelect, openExternal } = useEntryActions(entry)

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

const media = computed(() => (entry.value ? detectMedia(entry.value.url, entry.value.content_html) : null))
const sanitizedContent = computed(() =>
  entry.value ? renderEntryHtml(entry.value, media.value, ui.openLinksInNewTab) : '',
)
const publishedLabel = computed(() => formatDateTime(entry.value?.published_at))
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
          <span class="hidden md:inline">Open</span>
        </button>
        <div class="relative">
          <button
            class="btn-ghost text-xs gap-1"
            :aria-label="isStarred ? 'Unstar this entry' : 'Star this entry'"
            :aria-pressed="isStarred"
            @click="handleStarClick"
          >
            <StarSolid v-if="isStarred" class="h-4 w-4 text-star" />
            <StarOutline v-else class="h-4 w-4" />
            <span class="hidden md:inline">{{ isStarred ? 'Starred' : 'Star' }}</span>
          </button>
          <StarTagPicker v-if="starPickerOpen" @select="onStarTagSelect" @cancel="starPickerOpen = false" />
        </div>
        <ShareMenu v-if="entry.url" v-model:open="shareOpen" compact />
      </div>
      <button class="btn-ghost text-xs gap-1" aria-label="Close reader" @click="entryStore.selectEntry(null)">
        <XMarkIcon class="h-4 w-4" />
        <span class="hidden md:inline">Close</span>
      </button>
    </div>

    <SharePanel v-if="shareOpen && entry.url" class="mx-4 my-2 shrink-0" :url="entry.url" :title="entry.title || 'Untitled'" />

    <!-- Article content -->
    <div class="flex-1 overflow-y-auto px-4 py-6 pb-10 md:px-10 md:py-8 md:pb-8">
      <article class="mx-auto max-w-2xl">
        <div class="mb-4 flex items-center gap-2 text-xs text-text-muted">
          <FeedFavicon :src="entry.feed_favicon_url" />
          <span class="font-medium text-accent">{{ entry.feed_title }}</span>
          <span v-if="entry.author">&middot; {{ cleanAuthor(entry.author) }}</span>
        </div>

        <h1 class="text-2xl font-bold leading-tight text-text-primary mb-2">{{ entry.title || 'Untitled' }}</h1>
        <p class="text-sm text-text-muted mb-6">{{ publishedLabel }}</p>

        <img
          v-if="entry.image_url && ui.showImages && media?.type !== 'youtube'"
          :src="entry.image_url"
          :alt="entry.title || ''"
          class="w-full rounded-lg mb-6"
          loading="lazy"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />

        <MediaEmbed v-if="media" :media="media" />

        <div :class="PROSE_CLASS" v-html="sanitizedContent" />

        <EntryArticleLinks v-if="entry.url" :url="entry.url" class="mt-8 border-t pt-4" />
      </article>
    </div>
  </div>

  <!-- Empty state -->
  <div v-else class="flex h-full items-center justify-center text-text-muted">
    <p class="text-sm">Select an entry to read</p>
  </div>
</template>
