<script setup lang="ts">
import { ShareIcon, LinkIcon } from '@heroicons/vue/24/outline'

/** Toggle button for the inline SharePanel. */
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <button
    v-if="compact"
    class="btn-ghost text-xs gap-1"
    aria-label="Share article"
    :aria-expanded="open"
    @click.stop="open = !open"
  >
    <ShareIcon class="h-4 w-4" />
    <span class="hidden md:inline">Share</span>
  </button>
  <button
    v-else
    class="btn-toolbar"
    :class="open ? 'text-accent bg-bg-hover' : ''"
    aria-label="Share article"
    :aria-expanded="open"
    @click.stop="open = !open"
  >
    <LinkIcon class="h-4 w-4" />
    <span class="hidden md:inline">Share</span>
  </button>
</template>
