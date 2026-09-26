<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useFeedStore } from '@/stores/feeds'
import { InboxIcon, StarIcon, MagnifyingGlassIcon, Cog6ToothIcon, Bars3Icon } from '@heroicons/vue/24/outline'
import UnreadBadge from '@/components/ui/UnreadBadge.vue'

const route = useRoute()
const ui = useUIStore()
const feedStore = useFeedStore()

const links = [
  { to: '/app/all', name: 'all-entries', label: 'All', icon: InboxIcon },
  { to: '/app/starred', name: 'starred-entries', label: 'Starred', icon: StarIcon },
  { to: '/app/discover', name: 'discover', label: 'Discover', icon: MagnifyingGlassIcon },
  { to: '/app/settings', name: 'settings', label: 'Settings', icon: Cog6ToothIcon },
]
</script>

<template>
  <nav aria-label="Bottom navigation" class="fixed bottom-0 left-0 right-0 z-20 border-t bg-bg-primary safe-bottom">
    <div class="flex items-center justify-around py-2">
      <button
        class="flex flex-col items-center gap-0.5 px-3 py-1"
        :class="ui.sidebarOpen ? 'text-accent' : 'text-text-muted'"
        aria-label="Toggle menu"
        @click="ui.toggleSidebar()"
      >
        <Bars3Icon class="h-5 w-5" />
        <span class="text-[10px]" aria-hidden="true">Menu</span>
      </button>

      <RouterLink
        v-for="link in links"
        :key="link.name"
        :to="link.to"
        class="relative flex flex-col items-center gap-0.5 px-3 py-1"
        :class="route.name === link.name ? 'text-accent' : 'text-text-muted'"
        :aria-current="route.name === link.name ? 'page' : undefined"
      >
        <component :is="link.icon" class="h-5 w-5" />
        <span class="text-[10px]">{{ link.label }}</span>
        <UnreadBadge
          v-if="link.name === 'all-entries'"
          :count="feedStore.totalUnread"
          :max="99"
          variant="dot"
          class="absolute -top-1 right-0"
        />
      </RouterLink>
    </div>
  </nav>
</template>
