<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { Bars3Icon } from '@heroicons/vue/24/outline'
import SearchBar from './SearchBar.vue'
import EntryListActions from './EntryListActions.vue'

defineProps<{ title: string }>()

const ui = useUIStore()
</script>

<template>
  <div class="shrink-0 border-b md:border-b-0 overflow-hidden">
    <SearchBar v-if="ui.searchOpen" />

    <template v-else>
      <!-- Title row; actions inline on desktop -->
      <div class="flex h-14 items-center justify-between px-4 md:border-b">
        <div class="flex min-w-0 items-center gap-2">
          <button class="btn-icon shrink-0 md:hidden" aria-label="Toggle sidebar" @click="ui.toggleSidebar()">
            <Bars3Icon class="h-5 w-5" />
          </button>
          <h1 class="truncate text-lg font-semibold text-text-primary">{{ title }}</h1>
        </div>
        <div class="hidden md:block">
          <EntryListActions />
        </div>
      </div>

      <!-- Actions on their own row on mobile -->
      <div class="flex px-4 pb-2 md:hidden">
        <EntryListActions compact />
      </div>
    </template>
  </div>
</template>
