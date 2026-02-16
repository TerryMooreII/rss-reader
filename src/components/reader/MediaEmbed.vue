<script setup lang="ts">
import type { Media } from '@/utils/mediaDetect'

defineProps<{
  media: Media
}>()
</script>

<template>
  <!-- YouTube embed -->
  <div v-if="media.type === 'youtube'" class="mb-6">
    <div class="relative w-full overflow-hidden rounded-lg" style="padding-bottom: 56.25%">
      <iframe
        :src="`https://www.youtube.com/embed/${media.videoId}?rel=0`"
        class="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
      />
    </div>
  </div>

  <!-- Audio player -->
  <div
    v-else-if="media.type === 'podcast'"
    class="mb-6 flex items-center gap-3 rounded-lg border border-border bg-bg-secondary p-4"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="h-6 w-6 shrink-0 text-accent"
    >
      <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
      <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
    </svg>
    <audio
      controls
      preload="none"
      :src="media.audioUrl"
      class="h-10 w-full min-w-0"
    />
  </div>
</template>
