<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string }>()

const tone = computed(() => {
  if (['active', 'succeeded'].includes(props.status)) return 'bg-success/10 text-success'
  if (['error', 'dead', 'failed'].includes(props.status)) return 'bg-danger/10 text-danger'
  return 'bg-star/10 text-star'
})
</script>

<template>
  <span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" :class="tone">{{ status }}</span>
</template>
