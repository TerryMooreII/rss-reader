<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feeds'
import { useGroupStore } from '@/stores/groups'
import { useStarTagStore } from '@/stores/starTags'
import { useNotificationStore } from '@/stores/notifications'
import {
  RssIcon,
  InboxIcon,
  StarIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  PlusIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
} from '@heroicons/vue/24/outline'
import SidebarFeedItem from '@/components/sidebar/SidebarFeedItem.vue'
import SidebarGroupItem from '@/components/sidebar/SidebarGroupItem.vue'
import AddFeedDialog from '@/components/sidebar/AddFeedDialog.vue'

const route = useRoute()
const authStore = useAuthStore()
const feedStore = useFeedStore()
const groupStore = useGroupStore()
const starTagStore = useStarTagStore()
const notifications = useNotificationStore()

const showAddFeed = ref(false)
const showCreateGroup = ref(false)
const newGroupName = ref('')
const createGroupInput = ref<HTMLInputElement | null>(null)

// Section collapse state (persisted)
const groupsSectionOpen = ref(localStorage.getItem('acta_groups_section') !== 'collapsed')

function toggleGroupsSection() {
  groupsSectionOpen.value = !groupsSectionOpen.value
  localStorage.setItem('acta_groups_section', groupsSectionOpen.value ? 'open' : 'collapsed')
}

async function openCreateGroup() {
  showCreateGroup.value = true
  await nextTick()
  createGroupInput.value?.focus()
}

async function createGroup() {
  if (!newGroupName.value.trim()) return

  try {
    const group = await groupStore.createGroup(newGroupName.value.trim())
    if (group) {
      groupStore.expandedGroups.add(group.id)
      notifications.success('Group created')
      newGroupName.value = ''
      showCreateGroup.value = false
    }
  } catch {
    notifications.error('Failed to create group')
  }
}

function cancelCreateGroup() {
  showCreateGroup.value = false
  newGroupName.value = ''
}

// Auto-expand group when navigating to it
watch(
  () => route.params.groupId,
  (groupId) => {
    if (groupId && typeof groupId === 'string') {
      groupStore.expandedGroups.add(groupId)
    }
  },
  { immediate: true },
)

const totalUnread = computed(() => feedStore.totalUnread)

/** Feeds not belonging to any group, sorted alphabetically. */
const ungroupedFeeds = computed(() => {
  const grouped = groupStore.allGroupedFeedIds
  return feedStore.feeds
    .filter((f) => !grouped.has(f.id))
    .sort((a, b) => {
      const aTitle = (a.custom_title || a.title || '').toLowerCase()
      const bTitle = (b.custom_title || b.title || '').toLowerCase()
      return aTitle.localeCompare(bTitle)
    })
})

function isActive(name: string) {
  return route.name === name
}

function isStarTagActive(tagId: string) {
  return route.name === 'star-tag-entries' && route.params.starTagId === tagId
}
</script>

<template>
  <aside aria-label="Sidebar" class="flex h-full w-64 flex-col border-r bg-bg-sidebar overflow-hidden">
    <!-- Header -->
    <div class="flex h-14 items-center justify-between px-4 border-b">
      <RouterLink to="/app/all" class="flex items-center gap-2">
        <RssIcon class="h-6 w-6 text-accent" />
        <span class="text-lg font-bold text-text-primary">Acta</span>
      </RouterLink>
      <button
        class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        aria-label="Add feed"
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
    <nav aria-label="Main navigation" class="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
      <!-- Main nav -->
      <RouterLink
        to="/app/all"
        :class="isActive('all-entries') ? 'sidebar-item-active' : 'sidebar-item'"
        :aria-current="isActive('all-entries') ? 'page' : undefined"
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

      <div class="group/starred-row relative flex items-center">
        <RouterLink
          to="/app/starred"
          class="flex-1 group/starred"
          :class="isActive('starred-entries') ? 'sidebar-item-active' : 'sidebar-item'"
          :aria-current="isActive('starred-entries') ? 'page' : undefined"
        >
          <span v-if="starTagStore.sortedTags.length > 0" class="relative h-5 w-5 shrink-0">
            <StarIcon class="h-5 w-5 absolute inset-0 transition-opacity group-hover/starred:opacity-0" />
            <ChevronRightIcon
              class="h-5 w-5 absolute inset-0 opacity-0 transition-all group-hover/starred:opacity-100"
              :class="{ 'rotate-90': starTagStore.expandedStarred }"
              @click.prevent.stop="starTagStore.toggleStarred()"
            />
          </span>
          <StarIcon v-else class="h-5 w-5 shrink-0" />
          <span class="flex-1">Starred</span>
        </RouterLink>
        <RouterLink
          to="/app/settings?tab=filters"
          class="absolute right-1 rounded p-1 text-text-muted opacity-0 hover:bg-bg-hover hover:text-text-primary group-hover/starred-row:opacity-100 transition-opacity"
          aria-label="Manage filters"
          @click.stop
        >
          <EllipsisVerticalIcon class="h-4 w-4" />
        </RouterLink>
      </div>

      <!-- Star tag sub-items -->
      <div
        v-if="starTagStore.expandedStarred && starTagStore.sortedTags.length > 0"
        class="pl-4 space-y-0.5"
      >
        <RouterLink
          v-for="tag in starTagStore.sortedTags"
          :key="tag.id"
          :to="`/app/starred/tag/${tag.id}`"
          :class="isStarTagActive(tag.id) ? 'sidebar-item-active' : 'sidebar-item'"
          :aria-current="isStarTagActive(tag.id) ? 'page' : undefined"
        >
          <StarIcon class="h-4 w-4 shrink-0 text-star" />
          <span class="flex-1 truncate">{{ tag.name }}</span>
          <span
            v-if="(tag.unread_count ?? 0) > 0"
            class="ml-auto rounded-full bg-badge/10 px-2 py-0.5 text-xs font-medium text-badge"
          >
            {{ (tag.unread_count ?? 0) > 999 ? '999+' : tag.unread_count }}
          </span>
        </RouterLink>
      </div>

      <RouterLink
        to="/app/discover"
        :class="isActive('discover') ? 'sidebar-item-active' : 'sidebar-item'"
        :aria-current="isActive('discover') ? 'page' : undefined"
      >
        <MagnifyingGlassIcon class="h-5 w-5 shrink-0" />
        <span class="flex-1">Discover</span>
      </RouterLink>

      <RouterLink
        to="/app/settings"
        :class="isActive('settings') ? 'sidebar-item-active' : 'sidebar-item'"
        :aria-current="isActive('settings') ? 'page' : undefined"
      >
        <Cog6ToothIcon class="h-5 w-5 shrink-0" />
        <span class="flex-1">Settings</span>
      </RouterLink>

      <RouterLink
        v-if="authStore.isAdmin"
        to="/app/admin"
        :class="isActive('admin') ? 'sidebar-item-active' : 'sidebar-item'"
        :aria-current="isActive('admin') ? 'page' : undefined"
      >
        <ShieldCheckIcon class="h-5 w-5 shrink-0" />
        <span class="flex-1">Admin</span>
      </RouterLink>

      <!-- Groups -->
      <div class="pt-4">
        <div class="flex items-center justify-between px-3 pb-1">
          <button
            class="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-primary"
            :aria-expanded="groupsSectionOpen"
            @click="toggleGroupsSection"
          >
            <ChevronRightIcon
              class="h-3 w-3 transition-transform"
              :class="{ 'rotate-90': groupsSectionOpen }"
              aria-hidden="true"
            />
            Feeds
          </button>
          <div class="relative group/tip" :class="{ 'invisible': !groupsSectionOpen || showCreateGroup }">
            <button
              class="rounded p-0.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
              aria-label="Add new group"
              @click="openCreateGroup"
            >
              <PlusIcon class="h-4 w-4" />
            </button>
            <span class="pointer-events-none absolute right-full top-1/2 z-50 mr-1.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-bg-primary px-2.5 py-1 text-xs font-medium text-text-primary shadow-lg ring-1 ring-border hidden group-hover/tip:block">
              Add New Group
            </span>
          </div>
        </div>

        <template v-if="groupsSectionOpen">
          <!-- Quick create input -->
          <div v-if="showCreateGroup" class="px-3 pb-2">
            <input
              ref="createGroupInput"
              v-model="newGroupName"
              type="text"
              placeholder="Group name"
              class="w-full rounded border border-border bg-bg-secondary px-2 py-1 text-sm text-text-primary"
              @keydown.enter="createGroup"
              @keydown.escape="cancelCreateGroup"
            />
          </div>

          <!-- Empty state hint -->
          <p
            v-if="groupStore.sortedGroups.length === 0 && !showCreateGroup"
            class="px-3 py-2 text-xs text-text-muted leading-relaxed"
          >
            Groups let you organize feeds your way. Hit <button class="inline text-text-secondary hover:text-text-primary" @click="openCreateGroup">+</button> to create one, then drag feeds into it.
          </p>

          <div v-for="group in groupStore.sortedGroups" :key="group.id" class="space-y-0.5">
            <SidebarGroupItem
              :group="group"
              :is-expanded="groupStore.expandedGroups.has(group.id)"
            />

            <!-- Group feeds (collapsible) -->
            <div
              v-show="groupStore.expandedGroups.has(group.id)"
              role="group"
              :aria-label="group.name + ' feeds'"
              class="pl-4"
            >
              <SidebarFeedItem
                v-for="feedId in groupStore.feedsByGroup(group.id)"
                :key="feedId"
                :feed="feedStore.feedById(feedId)"
              />
            </div>
          </div>
          <!-- Ungrouped feeds -->
          <SidebarFeedItem
            v-for="feed in ungroupedFeeds"
            :key="feed.id"
            :feed="feed"
          />
        </template>
      </div>
    </nav>

    <!-- Add Feed Dialog -->
    <AddFeedDialog :open="showAddFeed" @close="showAddFeed = false" />
  </aside>
</template>
