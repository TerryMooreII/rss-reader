<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { SubscribedFeed } from '@/types/models'
import {
  EllipsisVerticalIcon,
  TrashIcon,
  FolderPlusIcon,
  ChevronRightIcon,
  CheckIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { useFeedStore } from '@/stores/feeds'
import { useGroupStore } from '@/stores/groups'
import { useEntryStore } from '@/stores/entries'
import { useAsyncAction } from '@/composables/useAsyncAction'
import FeedFavicon from '@/components/ui/FeedFavicon.vue'
import UnreadBadge from '@/components/ui/UnreadBadge.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import InlineConfirm from '@/components/ui/InlineConfirm.vue'

const props = defineProps<{ feed: SubscribedFeed | undefined }>()

const route = useRoute()
const router = useRouter()
const feedStore = useFeedStore()
const groupStore = useGroupStore()
const entryStore = useEntryStore()
const { run } = useAsyncAction()

const isActive = computed(() => route.name === 'feed-entries' && route.params.feedId === props.feed?.id)

const menuOpen = ref(false)
const confirmingUnsubscribe = ref(false)
const showGroupSubmenu = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  confirmingUnsubscribe.value = false
  showGroupSubmenu.value = false
}

function closeMenu() {
  menuOpen.value = false
  confirmingUnsubscribe.value = false
  showGroupSubmenu.value = false
}

async function confirmUnsubscribe() {
  if (!props.feed) return
  const feedTitle = props.feed.custom_title || props.feed.title || 'Feed'
  const feedId = props.feed.id
  if (isActive.value) router.push({ name: 'all-entries' })
  await run(() => feedStore.unsubscribeFeed(feedId), {
    success: `Unsubscribed from ${feedTitle}`,
    error: 'Failed to unsubscribe',
  })
  closeMenu()
}

async function markAsRead() {
  if (!props.feed) return
  await run(() => entryStore.markFeedAsRead(props.feed!.id), {
    success: 'Marked as read',
    error: 'Failed to mark as read',
  })
  closeMenu()
}

async function toggleFeedInGroup(groupId: string) {
  if (!props.feed) return
  const feedId = props.feed.id
  if (groupStore.isFeedInGroup(groupId, feedId)) {
    await run(() => groupStore.removeFeedFromGroup(groupId, feedId), { success: 'Removed from group', error: 'Failed to update group' })
  } else {
    await run(() => groupStore.addFeedToGroup(groupId, feedId), { success: 'Added to group', error: 'Failed to update group' })
  }
}

// Drag-and-drop (drag source)
function onDragStart(e: DragEvent) {
  if (!props.feed) return
  e.dataTransfer!.effectAllowed = 'copy'
  e.dataTransfer!.setData('application/x-feed-id', props.feed.id)
  e.dataTransfer!.setData('text/plain', props.feed.custom_title || props.feed.title || 'Feed')
}
</script>

<template>
  <div v-if="feed" class="relative group" draggable="true" @dragstart="onDragStart">
    <RouterLink
      :to="{ name: 'feed-entries', params: { feedId: feed.id } }"
      :class="isActive ? 'sidebar-item-active' : 'sidebar-item'"
    >
      <FeedFavicon :src="feed.favicon_url" :alt="feed.title || 'Feed'" />
      <span class="flex-1 truncate text-left">
        {{ feed.custom_title || feed.title || feed.url }}
      </span>
      <!-- Unread count / menu button swap -->
      <span class="relative ml-auto shrink-0 flex items-center justify-end">
        <UnreadBadge
          :count="feed.unread_count"
          variant="muted"
          class="transition-opacity duration-150"
          :class="menuOpen ? 'opacity-0' : 'group-hover:opacity-0'"
        />
        <button
          class="absolute right-0 flex items-center justify-center rounded p-0.5 text-text-muted hover:text-text-primary transition-opacity duration-150"
          :class="menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
          aria-label="Feed options"
          :aria-expanded="menuOpen"
          @click.prevent.stop="toggleMenu"
        >
          <EllipsisVerticalIcon class="h-4 w-4" />
        </button>
      </span>
    </RouterLink>

    <DropdownMenu :open="menuOpen" @close="closeMenu">
      <template v-if="!confirmingUnsubscribe && !showGroupSubmenu">
        <button v-if="groupStore.sortedGroups.length > 0" class="menu-item" @click.prevent.stop="showGroupSubmenu = true">
          <FolderPlusIcon class="h-4 w-4" />
          <span class="flex-1">Add to Group</span>
          <ChevronRightIcon class="h-3 w-3" />
        </button>
        <button class="menu-item" @click.prevent.stop="markAsRead">
          <CheckCircleIcon class="h-4 w-4" />
          Mark as Read
        </button>
        <button class="menu-item-danger" @click.prevent.stop="confirmingUnsubscribe = true">
          <TrashIcon class="h-4 w-4" />
          Unsubscribe
        </button>
      </template>

      <!-- Group submenu -->
      <template v-else-if="showGroupSubmenu">
        <button class="menu-item-muted py-1.5 text-xs" @click.prevent.stop="showGroupSubmenu = false">
          <ChevronRightIcon class="h-3 w-3 rotate-180" />
          Back
        </button>
        <div class="my-1 border-t border-border" />
        <button
          v-for="group in groupStore.sortedGroups"
          :key="group.id"
          class="menu-item"
          @click.prevent.stop="toggleFeedInGroup(group.id)"
        >
          <CheckIcon class="h-4 w-4 shrink-0" :class="groupStore.isFeedInGroup(group.id, feed.id) ? 'text-accent' : 'text-transparent'" />
          <span class="flex-1 truncate">{{ group.name }}</span>
        </button>
      </template>

      <InlineConfirm
        v-else
        layout="stacked"
        prompt="Unsubscribe from this feed?"
        confirm-label="Confirm"
        cancel-label="Cancel"
        @confirm="confirmUnsubscribe"
        @cancel="closeMenu"
      />
    </DropdownMenu>
  </div>
</template>
