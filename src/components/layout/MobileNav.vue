<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useFeedStore } from '@/stores/feeds'
import {
  InboxIcon,
  StarIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  Bars3Icon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const ui = useUIStore()
const feedStore = useFeedStore()

function isActive(name: string) {
  return route.name === name
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-20 border-t bg-bg-primary safe-bottom">
    <div class="flex items-center justify-around py-2">
      <button
        class="flex flex-col items-center gap-0.5 px-3 py-1"
        :class="ui.sidebarOpen ? 'text-accent' : 'text-text-muted'"
        @click="ui.toggleSidebar()"
      >
        <Bars3Icon class="h-5 w-5" />
        <span class="text-[10px]">Menu</span>
      </button>

      <RouterLink
        to="/app/all"
        class="flex flex-col items-center gap-0.5 px-3 py-1 relative"
        :class="isActive('all-entries') ? 'text-accent' : 'text-text-muted'"
      >
        <InboxIcon class="h-5 w-5" />
        <span class="text-[10px]">All</span>
        <span
          v-if="feedStore.totalUnread > 0"
          class="absolute -top-1 right-0 h-4 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold text-white"
        >
          {{ feedStore.totalUnread > 99 ? '99+' : feedStore.totalUnread }}
        </span>
      </RouterLink>

      <RouterLink
        to="/app/starred"
        class="flex flex-col items-center gap-0.5 px-3 py-1"
        :class="isActive('starred-entries') ? 'text-accent' : 'text-text-muted'"
      >
        <StarIcon class="h-5 w-5" />
        <span class="text-[10px]">Starred</span>
      </RouterLink>

      <RouterLink
        to="/app/discover"
        class="flex flex-col items-center gap-0.5 px-3 py-1"
        :class="isActive('discover') ? 'text-accent' : 'text-text-muted'"
      >
        <MagnifyingGlassIcon class="h-5 w-5" />
        <span class="text-[10px]">Discover</span>
      </RouterLink>

      <RouterLink
        to="/app/settings"
        class="flex flex-col items-center gap-0.5 px-3 py-1"
        :class="isActive('settings') ? 'text-accent' : 'text-text-muted'"
      >
        <Cog6ToothIcon class="h-5 w-5" />
        <span class="text-[10px]">Settings</span>
      </RouterLink>
    </div>
  </nav>
</template>
