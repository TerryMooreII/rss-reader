<script setup lang="ts">
import type { Entry } from '@/types/models'
import { computed } from 'vue'
import { formatTimeAgo, now } from '@/utils/date'
import FeedFavicon from '@/components/ui/FeedFavicon.vue'

const props = defineProps<{ entry: Entry; selected: boolean }>()
defineEmits<{ click: [] }>()

const timeAgo = computed(() => formatTimeAgo(props.entry.published_at, now.value))
const isRead = computed(() => !!props.entry.read_at)
</script>

<template>
  <article
    class="flex items-center gap-3 border-b px-4 py-2.5 cursor-pointer transition-colors outline-none overflow-hidden"
    :class="selected ? 'bg-bg-active' : 'hover:bg-bg-hover'"
    :aria-label="`${entry.title || 'Untitled'}${isRead ? '' : ' (unread)'}${entry.starred_at ? ' (starred)' : ''}`"
    @click="$emit('click')"
  >
    <FeedFavicon :src="entry.feed_favicon_url" />

    <span class="flex-1 truncate text-sm" :class="isRead ? 'text-text-muted' : 'text-text-primary font-semibold'">
      {{ entry.title || 'Untitled' }}
    </span>

    <span v-if="entry.starred_at" class="text-star text-xs shrink-0" aria-hidden="true">&#9733;</span>

    <span class="shrink-0 text-xs text-text-muted whitespace-nowrap">{{ timeAgo }}</span>
  </article>
</template>
