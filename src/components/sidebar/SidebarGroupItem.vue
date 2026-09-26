<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Group } from '@/types/models'
import {
  FolderIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { useGroupStore } from '@/stores/groups'
import { useEntryStore } from '@/stores/entries'
import { useNotificationStore } from '@/stores/notifications'
import { useAsyncAction } from '@/composables/useAsyncAction'
import UnreadBadge from '@/components/ui/UnreadBadge.vue'
import DropdownMenu from '@/components/ui/DropdownMenu.vue'
import InlineConfirm from '@/components/ui/InlineConfirm.vue'

const props = defineProps<{ group: Group; isExpanded: boolean }>()

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const entryStore = useEntryStore()
const notifications = useNotificationStore()
const { run } = useAsyncAction()

const isActive = computed(() => route.name === 'group-entries' && route.params.groupId === props.group.id)
const unread = computed(() => groupStore.unreadFor(props.group.id))

const menuOpen = ref(false)
const confirmingDelete = ref(false)
const renaming = ref(false)
const newName = ref(props.group.name)
const renameInput = ref<HTMLInputElement | null>(null)
const isDropTarget = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  confirmingDelete.value = false
  renaming.value = false
}

function closeMenu() {
  menuOpen.value = false
  confirmingDelete.value = false
  renaming.value = false
}

async function startRename() {
  renaming.value = true
  newName.value = props.group.name
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
}

async function confirmRename() {
  const name = newName.value.trim()
  if (!name) return
  await run(() => groupStore.renameGroup(props.group.id, name), { success: 'Group renamed', error: 'Failed to rename group' })
  closeMenu()
}

async function markAsRead() {
  await run(() => entryStore.markGroupAsRead(props.group.id), { success: 'Marked as read', error: 'Failed to mark as read' })
  closeMenu()
}

async function confirmDelete() {
  if (isActive.value) router.push({ name: 'all-entries' })
  await run(() => groupStore.deleteGroup(props.group.id), { success: 'Group deleted', error: 'Failed to delete group' })
  closeMenu()
}

// Drag-and-drop (drop target)
function onDragOver(e: DragEvent) {
  if (!e.dataTransfer?.types.includes('application/x-feed-id')) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  isDropTarget.value = true
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  isDropTarget.value = false
  const feedId = e.dataTransfer?.getData('application/x-feed-id')
  if (!feedId) return

  if (groupStore.isFeedInGroup(props.group.id, feedId)) {
    notifications.success('Feed already in this group')
    return
  }
  const ok = await run(() => groupStore.addFeedToGroup(props.group.id, feedId).then(() => true), {
    success: `Added to ${props.group.name}`,
    error: 'Failed to add feed to group',
  })
  if (ok && !props.isExpanded) groupStore.setExpanded(props.group.id, true)
}
</script>

<template>
  <div class="relative group/grp" @dragover="onDragOver" @dragleave="isDropTarget = false" @drop="onDrop">
    <div
      :class="[isActive ? 'sidebar-item-active' : 'sidebar-item', isDropTarget ? 'ring-2 ring-accent ring-inset' : '']"
      class="w-full"
    >
      <!-- Group icon / expand chevron (swap on hover) -->
      <span class="relative h-5 w-5 shrink-0">
        <FolderIcon class="h-5 w-5 absolute inset-0 transition-opacity group-hover/grp:opacity-0" aria-hidden="true" />
        <ChevronRightIcon
          class="h-5 w-5 absolute inset-0 opacity-0 transition-all group-hover/grp:opacity-100 cursor-pointer"
          :class="{ 'rotate-90': isExpanded }"
          aria-hidden="true"
          @click.prevent.stop="groupStore.toggleGroup(group.id)"
        />
      </span>

      <button class="flex-1 truncate text-left" @click="router.push({ name: 'group-entries', params: { groupId: group.id } })">
        {{ group.name }}
      </button>

      <!-- Unread count / menu button swap -->
      <span class="relative ml-auto shrink-0 flex items-center justify-end">
        <UnreadBadge
          :count="unread"
          variant="muted"
          class="transition-opacity duration-150"
          :class="menuOpen ? 'opacity-0' : 'group-hover/grp:opacity-0'"
        />
        <button
          class="absolute right-0 flex items-center justify-center rounded p-0.5 text-text-muted hover:text-text-primary transition-opacity duration-150"
          :class="menuOpen ? 'opacity-100' : 'opacity-0 group-hover/grp:opacity-100'"
          aria-label="Group options"
          :aria-expanded="menuOpen"
          @click.prevent.stop="toggleMenu"
        >
          <EllipsisVerticalIcon class="h-4 w-4" />
        </button>
      </span>
    </div>

    <DropdownMenu :open="menuOpen" @close="closeMenu">
      <!-- Rename inline input -->
      <div v-if="renaming" class="px-3 py-2">
        <input
          ref="renameInput"
          v-model="newName"
          type="text"
          class="input-sm bg-bg-secondary"
          @keydown.enter="confirmRename"
          @keydown.escape="closeMenu"
        />
        <div class="mt-2 flex gap-2">
          <button class="flex-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent/80" @click.stop="confirmRename">Save</button>
          <button class="flex-1 rounded-md bg-bg-secondary px-2 py-1 text-xs font-medium text-text-primary hover:bg-bg-tertiary" @click.stop="closeMenu">Cancel</button>
        </div>
      </div>

      <InlineConfirm
        v-else-if="confirmingDelete"
        layout="stacked"
        prompt="Delete this group? Feeds will not be deleted."
        confirm-label="Delete"
        cancel-label="Cancel"
        @confirm="confirmDelete"
        @cancel="closeMenu"
      />

      <template v-else>
        <button class="menu-item" @click.stop="markAsRead">
          <CheckCircleIcon class="h-4 w-4" />
          Mark as Read
        </button>
        <button class="menu-item" @click.stop="startRename">
          <PencilIcon class="h-4 w-4" />
          Rename
        </button>
        <button class="menu-item-danger" @click.stop="confirmingDelete = true">
          <TrashIcon class="h-4 w-4" />
          Delete
        </button>
      </template>
    </DropdownMenu>
  </div>
</template>
