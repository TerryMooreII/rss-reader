<script setup lang="ts">
import type { Entry } from '@/types/models'
import { computed } from 'vue'
import { formatTimeAgo, now } from '@/utils/date'
import { truncate } from '@/utils/html'
import FeedFavicon from '@/components/ui/FeedFavicon.vue'

const props = defineProps<{ entry: Entry; selected: boolean }>()
defineEmits<{ click: [] }>()

const timeAgo = computed(() => formatTimeAgo(props.entry.published_at, now.value))
const isRead = computed(() => !!props.entry.read_at)
const excerpt = computed(() => truncate(props.entry.excerpt, 150))
</script>

<template>
  <article
    class="border-b px-4 py-3 cursor-pointer transition-colors outline-none overflow-hidden"
    :class="selected ? 'bg-bg-active' : 'hover:bg-bg-hover'"
    :aria-label="`${entry.title || 'Untitled'} from ${entry.feed_title || 'unknown feed'}${isRead ? '' : ' (unread)'}${entry.starred_at ? ' (starred)' : ''}`"
    @click="$emit('click')"
  >
    <div class="flex items-center gap-2 mb-1">
      <FeedFavicon :src="entry.feed_favicon_url" />
      <span class="text-xs text-text-muted truncate">{{ entry.feed_title }}</span>
      <span v-if="entry.starred_at" class="text-star text-xs" aria-hidden="true">&#9733;</span>
      <span class="ml-auto text-xs text-text-muted whitespace-nowrap">{{ timeAgo }}</span>
    </div>

    <h3 class="text-sm leading-snug mb-1 line-clamp-2" :class="isRead ? 'text-text-muted' : 'text-text-primary font-semibold'">
      {{ entry.title || 'Untitled' }}
    </h3>

    <p v-if="excerpt" class="text-xs text-text-secondary leading-relaxed line-clamp-2">
      {{ excerpt }}
    </p>
  </article>
</template>
