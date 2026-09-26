<script setup lang="ts">
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'sm' })
</script>

<template>
  <span
    class="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
    :class="size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'"
    role="status"
    aria-label="Loading"
  />
</template>
