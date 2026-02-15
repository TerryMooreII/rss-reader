<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { RssIcon } from '@heroicons/vue/24/solid'
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-bg-secondary px-4">
    <div class="w-full max-w-md">
      <RouterLink to="/" class="mb-8 flex items-center justify-center gap-2">
        <RssIcon class="h-8 w-8 text-accent" />
        <span class="text-2xl font-bold text-text-primary">Acta</span>
      </RouterLink>
      <div class="rounded-xl border bg-bg-primary p-8 shadow-sm">
        <RouterView />
      </div>
    </div>
  </div>
</template>
