<script setup lang="ts">
import type { Entry } from '@/types/models'
import { computed, ref } from 'vue'
import { RssIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  entry: Entry
  selected: boolean
}>()

defineEmits<{ click: [] }>()

const faviconError = ref(false)

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

const isRead = computed(() => !!props.entry.read_at)

const excerpt = computed(() => {
  const text = props.entry.summary || props.entry.content_text || ''
  return text.length > 150 ? text.slice(0, 150) + '...' : text
})
</script>

<template>
  <article
    class="border-b px-4 py-3 cursor-pointer transition-colors"
    :class="[
      selected ? 'bg-bg-active' : 'hover:bg-bg-hover',
      isRead ? 'opacity-70' : '',
    ]"
    @click="$emit('click')"
  >
    <div class="flex items-center gap-2 mb-1">
      <img
        v-if="entry.feed_favicon_url && !faviconError"
        :src="entry.feed_favicon_url"
        :alt="entry.feed_title || ''"
        class="h-4 w-4 shrink-0 rounded"
        loading="lazy"
        @error="faviconError = true"
      />
      <RssIcon v-else class="h-4 w-4 shrink-0 text-text-muted" />
      <span class="text-xs text-text-muted truncate">{{ entry.feed_title }}</span>
      <span v-if="entry.starred_at" class="text-star text-xs">&#9733;</span>
      <span class="ml-auto text-xs text-text-muted whitespace-nowrap">{{ timeAgo }}</span>
    </div>

    <h3
      class="text-sm leading-snug mb-1"
      :class="isRead ? 'text-text-secondary' : 'text-text-primary font-semibold'"
    >
      {{ entry.title || 'Untitled' }}
    </h3>

    <p v-if="excerpt" class="text-xs text-text-muted leading-relaxed line-clamp-2">
      {{ excerpt }}
    </p>
  </article>
</template>
