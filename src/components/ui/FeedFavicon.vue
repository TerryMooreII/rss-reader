<script setup lang="ts">
import { ref, watch } from 'vue'
import { RssIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(
  defineProps<{ src?: string | null; alt?: string; size?: 'xs' | 'sm' | 'md' | 'lg' }>(),
  { src: null, alt: '', size: 'xs' },
)

const sizeClass = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-6 w-6 sm:h-8 sm:w-8',
  lg: 'h-8 w-8',
}

const failed = ref(false)
watch(() => props.src, () => (failed.value = false))
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="alt"
    class="shrink-0 rounded"
    :class="sizeClass[size]"
    loading="lazy"
    @error="failed = true"
  />
  <RssIcon v-else class="shrink-0 text-text-muted" :class="sizeClass[size]" aria-hidden="true" />
</template>
