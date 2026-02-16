<script setup lang="ts">
import { computed, ref, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Group } from '@/types/models'
import {
  FolderIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { useGroupStore } from '@/stores/groups'
import { useNotificationStore } from '@/stores/notifications'

const props = defineProps<{
  group: Group
  isExpanded: boolean
}>()

const route = useRoute()
const router = useRouter()
const groupStore = useGroupStore()
const notifications = useNotificationStore()

const isActive = computed(
  () => route.name === 'group-entries' && route.params.groupId === props.group.id,
)

const menuOpen = ref(false)
const confirmingDelete = ref(false)
const renaming = ref(false)
const newName = ref(props.group.name)
const renameInput = ref<HTMLInputElement | null>(null)

// Drop target state
const isDropTarget = ref(false)

function toggleExpand(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  groupStore.toggleGroup(props.group.id)
}

function navigateToGroup() {
  router.push({ name: 'group-entries', params: { groupId: props.group.id } })
}

function toggleMenu(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  menuOpen.value = !menuOpen.value
  confirmingDelete.value = false
  renaming.value = false
}

function closeMenu() {
  menuOpen.value = false
  confirmingDelete.value = false
  renaming.value = false
}

async function startRename(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  renaming.value = true
  newName.value = props.group.name
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
}

async function confirmRename(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  if (!newName.value.trim()) return

  try {
    await groupStore.renameGroup(props.group.id, newName.value.trim())
    notifications.success('Group renamed')
  } catch {
    notifications.error('Failed to rename group')
  } finally {
    closeMenu()
  }
}

function startDelete(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  confirmingDelete.value = true
}

async function confirmDelete(e: Event) {
  e.preventDefault()
  e.stopPropagation()

  try {
    if (isActive.value) {
      router.push({ name: 'all-entries' })
    }
    await groupStore.deleteGroup(props.group.id)
    notifications.success('Group deleted')
  } catch {
    notifications.error('Failed to delete group')
  } finally {
    closeMenu()
  }
}

// Drag-and-drop (drop target)
function onDragOver(e: DragEvent) {
  if (!e.dataTransfer?.types.includes('application/x-feed-id')) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'copy'
  isDropTarget.value = true
}

function onDragLeave() {
  isDropTarget.value = false
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  isDropTarget.value = false

  const feedId = e.dataTransfer?.getData('application/x-feed-id')
  if (!feedId) return

  // Skip if feed is already in this group
  const existing = groupStore.feedsByGroup(props.group.id)
  if (existing.includes(feedId)) {
    notifications.success('Feed already in this group')
    return
  }

  try {
    await groupStore.addFeedToGroup(props.group.id, feedId)
    notifications.success(`Added to ${props.group.name}`)

    // Auto-expand group to show the newly added feed
    if (!props.isExpanded) {
      groupStore.toggleGroup(props.group.id)
    }
  } catch {
    notifications.error('Failed to add feed to group')
  }
}

// Close menu on outside click
const menuEl = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (!menuOpen.value) return
  if (menuEl.value && menuEl.value.contains(e.target as Node)) return
  closeMenu()
}

document.addEventListener('click', onDocClick)
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div
    class="relative group/grp"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div
      :class="[
        isActive ? 'sidebar-item-active' : 'sidebar-item',
        isDropTarget ? 'ring-2 ring-accent ring-inset' : '',
      ]"
      class="w-full"
    >
      <!-- Expand/collapse chevron -->
      <button
        class="shrink-0"
        :aria-expanded="isExpanded"
        @click="toggleExpand"
      >
        <ChevronRightIcon
          class="h-4 w-4 transition-transform"
          :class="{ 'rotate-90': isExpanded }"
          aria-hidden="true"
        />
      </button>

      <!-- Group icon -->
      <FolderIcon class="h-5 w-5 shrink-0" aria-hidden="true" />

      <!-- Group name (clickable to navigate) -->
      <button
        class="flex-1 truncate text-left"
        @click="navigateToGroup"
      >
        {{ group.name }}
      </button>

      <!-- Unread count / menu button swap -->
      <span class="relative ml-auto shrink-0 flex items-center justify-end">
        <span
          v-if="group.unread_count && group.unread_count > 0"
          class="text-xs text-text-muted transition-opacity duration-150"
          :class="menuOpen ? 'opacity-0' : 'group-hover/grp:opacity-0'"
        >
          {{ group.unread_count }}
        </span>
        <button
          class="absolute right-0 flex items-center justify-center rounded p-0.5 text-text-muted hover:text-text-primary transition-opacity duration-150"
          :class="menuOpen ? 'opacity-100' : 'opacity-0 group-hover/grp:opacity-100'"
          aria-label="Group options"
          :aria-expanded="menuOpen"
          @click="toggleMenu"
        >
          <EllipsisVerticalIcon class="h-4 w-4" />
        </button>
      </span>
    </div>

    <!-- Dropdown menu -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="menuOpen"
        ref="menuEl"
        role="menu"
        class="absolute right-2 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-bg-primary py-1 shadow-lg"
      >
        <!-- Rename inline input -->
        <div v-if="renaming" class="px-3 py-2">
          <input
            ref="renameInput"
            v-model="newName"
            type="text"
            class="w-full rounded border border-border bg-bg-secondary px-2 py-1 text-sm text-text-primary"
            @keydown.enter="confirmRename"
            @keydown.escape="closeMenu"
          />
          <div class="flex gap-2 mt-2">
            <button
              class="flex-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent/80"
              @click="confirmRename"
            >
              Save
            </button>
            <button
              class="flex-1 rounded-md bg-bg-secondary px-2 py-1 text-xs font-medium text-text-primary hover:bg-bg-tertiary"
              @click="closeMenu"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Delete confirmation -->
        <template v-else-if="confirmingDelete">
          <div class="px-3 py-2">
            <p class="text-xs text-text-secondary mb-2">Delete this group? Feeds will not be deleted.</p>
            <div class="flex gap-2">
              <button
                class="flex-1 rounded-md bg-danger px-2 py-1 text-xs font-medium text-white hover:bg-danger/80"
                @click="confirmDelete"
              >
                Delete
              </button>
              <button
                class="flex-1 rounded-md bg-bg-secondary px-2 py-1 text-xs font-medium text-text-primary hover:bg-bg-tertiary"
                @click="closeMenu"
              >
                Cancel
              </button>
            </div>
          </div>
        </template>

        <!-- Default menu items -->
        <template v-else>
          <button
            class="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover"
            @click="startRename"
          >
            <PencilIcon class="h-4 w-4" />
            Rename
          </button>
          <button
            class="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-bg-hover"
            @click="startDelete"
          >
            <TrashIcon class="h-4 w-4" />
            Delete
          </button>
        </template>
      </div>
    </Transition>
  </div>
</template>
