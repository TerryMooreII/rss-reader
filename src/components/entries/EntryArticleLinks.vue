<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

defineProps<{ url: string }>()
const ui = useUIStore()
</script>

<template>
  <div @click.stop>
    <a
      :href="url"
      :target="ui.openLinksInNewTab ? '_blank' : undefined"
      rel="noopener noreferrer"
      class="text-sm font-medium text-accent hover:underline"
    >
      Read full article &rarr;
    </a>
    <template v-if="ui.showArchiveLinks">
      <span class="mx-2 text-border">|</span>
      <a
        :href="`https://archive.ph/${url}`"
        :target="ui.openLinksInNewTab ? '_blank' : undefined"
        rel="noopener noreferrer"
        class="text-sm font-medium text-accent hover:underline"
      >
        Read with Archive.ph &rarr;
      </a>
    </template>
  </div>
</template>
