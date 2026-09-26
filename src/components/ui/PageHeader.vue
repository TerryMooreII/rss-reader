<script setup lang="ts">
import { Bars3Icon } from '@heroicons/vue/24/outline'
import { useUIStore } from '@/stores/ui'

defineProps<{ title: string }>()
const ui = useUIStore()
</script>

<template>
  <div class="mb-6 flex items-center gap-2">
    <button class="btn-icon md:hidden" aria-label="Toggle sidebar" @click="ui.toggleSidebar()">
      <Bars3Icon class="h-5 w-5" />
    </button>
    <h1 class="text-2xl font-bold text-text-primary">{{ title }}</h1>
    <slot />
  </div>
</template>
