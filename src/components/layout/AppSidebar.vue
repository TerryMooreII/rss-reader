<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feeds'
import { useGroupStore } from '@/stores/groups'
import { useUIStore } from '@/stores/ui'
import {
  RssIcon,
  InboxIcon,
  StarIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  PlusIcon,
  ShieldCheckIcon,
  FolderIcon,
  ChevronRightIcon,
} from '@heroicons/vue/24/outline'
import SidebarFeedItem from '@/components/sidebar/SidebarFeedItem.vue'
import AddFeedDialog from '@/components/sidebar/AddFeedDialog.vue'
import { ref } from 'vue'

const route = useRoute()
const authStore = useAuthStore()
const feedStore = useFeedStore()
const groupStore = useGroupStore()
const ui = useUIStore()

const showAddFeed = ref(false)

const totalUnread = computed(() => feedStore.totalUnread)

const ungroupedFeeds = computed(() => feedStore.ungroupedFeeds)

function isActive(name: string) {
  return route.name === name
}
</script>

<template>
  <aside class="flex h-full w-64 flex-col border-r bg-bg-sidebar overflow-hidden">
    <!-- Header -->
    <div class="flex h-14 items-center justify-between px-4 border-b">
      <RouterLink to="/app/all" class="flex items-center gap-2">
        <RssIcon class="h-6 w-6 text-accent" />
        <span class="text-lg font-bold text-text-primary">Acta</span>
      </RouterLink>
      <button
        class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        title="Add feed"
        @click="showAddFeed = true"
      >
        <PlusIcon class="h-5 w-5" />
      </button>
    </div>

    <!-- User info -->
    <div class="px-4 py-3 border-b">
      <p class="text-sm font-medium text-text-primary truncate">
        {{ authStore.profile?.first_name || authStore.profile?.handle }}
      </p>
      <p class="text-xs text-text-muted truncate">@{{ authStore.profile?.handle }}</p>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
      <!-- Main nav -->
      <RouterLink
        to="/app/all"
        :class="isActive('all-entries') ? 'sidebar-item-active' : 'sidebar-item'"
      >
        <InboxIcon class="h-5 w-5 shrink-0" />
        <span class="flex-1">All</span>
        <span
          v-if="totalUnread > 0"
          class="ml-auto rounded-full bg-badge/10 px-2 py-0.5 text-xs font-medium text-badge"
        >
          {{ totalUnread > 999 ? '999+' : totalUnread }}
        </span>
      </RouterLink>

      <RouterLink
        to="/app/starred"
        :class="isActive('starred-entries') ? 'sidebar-item-active' : 'sidebar-item'"
      >
        <StarIcon class="h-5 w-5 shrink-0" />
        <span class="flex-1">Starred</span>
      </RouterLink>

      <RouterLink
        to="/app/discover"
        :class="isActive('discover') ? 'sidebar-item-active' : 'sidebar-item'"
      >
        <MagnifyingGlassIcon class="h-5 w-5 shrink-0" />
        <span class="flex-1">Discover</span>
      </RouterLink>

      <RouterLink
        to="/app/settings"
        :class="isActive('settings') ? 'sidebar-item-active' : 'sidebar-item'"
      >
        <Cog6ToothIcon class="h-5 w-5 shrink-0" />
        <span class="flex-1">Settings</span>
      </RouterLink>

      <RouterLink
        v-if="authStore.isAdmin"
        to="/app/admin"
        :class="isActive('admin') ? 'sidebar-item-active' : 'sidebar-item'"
      >
        <ShieldCheckIcon class="h-5 w-5 shrink-0" />
        <span class="flex-1">Admin</span>
      </RouterLink>

      <!-- Groups -->
      <div v-if="groupStore.sortedGroups.length > 0" class="pt-4">
        <p class="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Groups
        </p>
        <div v-for="group in groupStore.sortedGroups" :key="group.id" class="space-y-0.5">
          <button
            class="sidebar-item w-full"
            :class="{ 'sidebar-item-active': route.params.groupId === group.id }"
            @click="groupStore.toggleGroup(group.id)"
          >
            <ChevronRightIcon
              class="h-4 w-4 shrink-0 transition-transform"
              :class="{ 'rotate-90': groupStore.expandedGroups.has(group.id) }"
            />
            <FolderIcon class="h-5 w-5 shrink-0" />
            <span class="flex-1 truncate text-left">{{ group.name }}</span>
            <span
              v-if="group.unread_count && group.unread_count > 0"
              class="text-xs text-text-muted"
            >
              {{ group.unread_count }}
            </span>
          </button>
          <!-- Group feeds (collapsible) -->
          <div v-show="groupStore.expandedGroups.has(group.id)" class="pl-4">
            <SidebarFeedItem
              v-for="feedId in groupStore.groupFeeds.get(group.id) || []"
              :key="feedId"
              :feed="feedStore.feedById(feedId)"
            />
          </div>
        </div>
      </div>

      <!-- Feeds -->
      <div class="pt-4">
        <p class="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Feeds
        </p>
        <SidebarFeedItem
          v-for="feed in ungroupedFeeds"
          :key="feed.id"
          :feed="feed"
        />
      </div>
    </nav>

    <!-- Add Feed Dialog -->
    <AddFeedDialog :open="showAddFeed" @close="showAddFeed = false" />
  </aside>
</template>
