<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFeedStore } from '@/stores/feeds'
import { useGroupStore } from '@/stores/groups'
import { useUIStore } from '@/stores/ui'
import { useNotificationStore } from '@/stores/notifications'
import { FEED_CATEGORIES } from '@/config/constants'
import {
  RssIcon,
  InboxIcon,
  StarIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  PlusIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  CpuChipIcon,
  BeakerIcon,
  BriefcaseIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  GlobeAltIcon,
  FilmIcon,
  TrophyIcon,
  HeartIcon,
  CakeIcon,
  GlobeAmericasIcon,
  AcademicCapIcon,
  SwatchIcon,
  PuzzlePieceIcon,
  MusicalNoteIcon,
  CameraIcon,
  CodeBracketIcon,
  SparklesIcon,
  CommandLineIcon,
  FaceSmileIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  PencilSquareIcon,
  TagIcon,
} from '@heroicons/vue/24/outline'
import SidebarFeedItem from '@/components/sidebar/SidebarFeedItem.vue'
import SidebarGroupItem from '@/components/sidebar/SidebarGroupItem.vue'
import AddFeedDialog from '@/components/sidebar/AddFeedDialog.vue'
import type { Component } from 'vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const feedStore = useFeedStore()
const groupStore = useGroupStore()
const ui = useUIStore()
const notifications = useNotificationStore()

const showAddFeed = ref(false)
const showCreateGroup = ref(false)
const newGroupName = ref('')
const createGroupInput = ref<HTMLInputElement | null>(null)

// Section collapse state (persisted)
const groupsSectionOpen = ref(localStorage.getItem('acta_groups_section') !== 'collapsed')
const categoriesSectionOpen = ref(localStorage.getItem('acta_categories_section') !== 'collapsed')

function toggleGroupsSection() {
  groupsSectionOpen.value = !groupsSectionOpen.value
  localStorage.setItem('acta_groups_section', groupsSectionOpen.value ? 'open' : 'collapsed')
}

function toggleCategoriesSection() {
  categoriesSectionOpen.value = !categoriesSectionOpen.value
  localStorage.setItem('acta_categories_section', categoriesSectionOpen.value ? 'open' : 'collapsed')
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
    }
    notifications.success('Group created')
    newGroupName.value = ''
    showCreateGroup.value = false
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

const iconMap: Record<string, Component> = {
  CpuChipIcon,
  BeakerIcon,
  BriefcaseIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  GlobeAltIcon,
  FilmIcon,
  TrophyIcon,
  HeartIcon,
  CakeIcon,
  GlobeAmericasIcon,
  AcademicCapIcon,
  SwatchIcon,
  PuzzlePieceIcon,
  MusicalNoteIcon,
  CameraIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CommandLineIcon,
  FaceSmileIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  PencilSquareIcon,
  TagIcon,
}

const categoryMeta = computed(() => {
  const map = new Map<string, { label: string; icon: Component }>()
  for (const cat of FEED_CATEGORIES) {
    map.set(cat.value, {
      label: cat.label,
      icon: iconMap[cat.icon] || TagIcon,
    })
  }
  return map
})

function isActive(name: string) {
  return route.name === name
}

function isCategoryActive(category: string) {
  return route.name === 'category-entries' && route.params.category === category
}

function onCategoryClick(category: string) {
  router.push({ name: 'category-entries', params: { category } })
  feedStore.toggleCategory(category)
}

function categoryUnread(category: string): number {
  return feedStore.categoryUnreadCounts.get(category) ?? 0
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

      <RouterLink
        to="/app/starred"
        :class="isActive('starred-entries') ? 'sidebar-item-active' : 'sidebar-item'"
        :aria-current="isActive('starred-entries') ? 'page' : undefined"
      >
        <StarIcon class="h-5 w-5 shrink-0" />
        <span class="flex-1">Starred</span>
      </RouterLink>

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
      <div v-if="groupStore.sortedGroups.length > 0 || showCreateGroup" class="pt-4">
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
            Groups
          </button>
          <button
            class="rounded p-0.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
            :class="{ 'invisible': !groupsSectionOpen || showCreateGroup }"
            aria-label="Create group"
            @click="openCreateGroup"
          >
            <PlusIcon class="h-4 w-4" />
          </button>
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
        </template>
      </div>

      <!-- Categories -->
      <div v-if="feedStore.usedCategories.length > 0" class="pt-4">
        <div class="flex items-center px-3 pb-1">
          <button
            class="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-primary"
            :aria-expanded="categoriesSectionOpen"
            @click="toggleCategoriesSection"
          >
            <ChevronRightIcon
              class="h-3 w-3 transition-transform"
              :class="{ 'rotate-90': categoriesSectionOpen }"
              aria-hidden="true"
            />
            Categories
          </button>
        </div>

        <template v-if="categoriesSectionOpen">
          <div v-for="cat in feedStore.usedCategories" :key="cat" class="space-y-0.5">
            <button
              class="sidebar-item w-full"
              :class="{ 'sidebar-item-active': isCategoryActive(cat) }"
              :aria-expanded="feedStore.expandedCategories.has(cat)"
              :aria-current="isCategoryActive(cat) ? 'page' : undefined"
              @click="onCategoryClick(cat)"
            >
              <ChevronRightIcon
                class="h-4 w-4 shrink-0 transition-transform"
                :class="{ 'rotate-90': feedStore.expandedCategories.has(cat) }"
                aria-hidden="true"
              />
              <component
                :is="categoryMeta.get(cat)?.icon"
                class="h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <span class="flex-1 truncate text-left">{{ categoryMeta.get(cat)?.label }}</span>
              <span
                class="text-xs"
                :class="categoryUnread(cat) > 0 ? 'text-text-muted' : 'text-text-muted/40'"
              >
                {{ categoryUnread(cat) }}
              </span>
            </button>
            <!-- Category feeds (collapsible) -->
            <div v-show="feedStore.expandedCategories.has(cat)" role="group" :aria-label="categoryMeta.get(cat)?.label + ' feeds'" class="pl-4">
              <SidebarFeedItem
                v-for="feed in feedStore.feedsByCategory.get(cat) || []"
                :key="feed.id"
                :feed="feed"
              />
            </div>
          </div>
        </template>
      </div>
    </nav>

    <!-- Add Feed Dialog -->
    <AddFeedDialog :open="showAddFeed" @close="showAddFeed = false" />
  </aside>
</template>
