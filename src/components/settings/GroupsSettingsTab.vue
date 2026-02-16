<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useGroupStore } from '@/stores/groups'
import { useFeedStore } from '@/stores/feeds'
import { useNotificationStore } from '@/stores/notifications'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  Bars3Icon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

const groupStore = useGroupStore()
const feedStore = useFeedStore()
const notifications = useNotificationStore()

const newGroupName = ref('')
const editingGroupId = ref<string | null>(null)
const editingName = ref('')
const editInput = ref<HTMLInputElement | null>(null)
const confirmingDeleteId = ref<string | null>(null)

// Drag state for reordering
const draggedGroupId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)

async function createGroup() {
  if (!newGroupName.value.trim()) return

  try {
    await groupStore.createGroup(newGroupName.value.trim())
    notifications.success('Group created')
    newGroupName.value = ''
  } catch {
    notifications.error('Failed to create group')
  }
}

async function startEdit(groupId: string, currentName: string) {
  editingGroupId.value = groupId
  editingName.value = currentName
  confirmingDeleteId.value = null
  await nextTick()
  editInput.value?.focus()
  editInput.value?.select()
}

function cancelEdit() {
  editingGroupId.value = null
  editingName.value = ''
}

async function saveEdit(groupId: string) {
  if (!editingName.value.trim()) {
    cancelEdit()
    return
  }

  try {
    await groupStore.renameGroup(groupId, editingName.value.trim())
    notifications.success('Group renamed')
  } catch {
    notifications.error('Failed to rename group')
  } finally {
    cancelEdit()
  }
}

function startDelete(groupId: string) {
  confirmingDeleteId.value = groupId
  editingGroupId.value = null
}

async function confirmDelete(groupId: string) {
  try {
    await groupStore.deleteGroup(groupId)
    notifications.success('Group deleted')
  } catch {
    notifications.error('Failed to delete group')
  } finally {
    confirmingDeleteId.value = null
  }
}

// Drag-and-drop for reordering
function onDragStart(e: DragEvent, groupId: string) {
  draggedGroupId.value = groupId
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', groupId)
}

function onDragOver(e: DragEvent, groupId: string) {
  e.preventDefault()
  if (draggedGroupId.value && draggedGroupId.value !== groupId) {
    dropTargetId.value = groupId
  }
}

function onDragLeave() {
  dropTargetId.value = null
}

async function onDrop(e: DragEvent, targetGroupId: string) {
  e.preventDefault()
  dropTargetId.value = null

  if (!draggedGroupId.value || draggedGroupId.value === targetGroupId) {
    draggedGroupId.value = null
    return
  }

  const groups = [...groupStore.sortedGroups]
  const draggedIndex = groups.findIndex((g) => g.id === draggedGroupId.value)
  const targetIndex = groups.findIndex((g) => g.id === targetGroupId)

  if (draggedIndex === -1 || targetIndex === -1) return

  const [removed] = groups.splice(draggedIndex, 1)
  groups.splice(targetIndex, 0, removed)

  try {
    await groupStore.reorderGroups(groups.map((g) => g.id))
  } catch {
    notifications.error('Failed to reorder groups')
  } finally {
    draggedGroupId.value = null
  }
}

function onDragEnd() {
  draggedGroupId.value = null
  dropTargetId.value = null
}

function feedCountForGroup(groupId: string): number {
  return groupStore.feedsByGroup(groupId).length
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-text-primary mb-1">Manage Groups</h2>
      <p class="text-sm text-text-muted">
        Create and organize groups to categorize your feeds. Drag to reorder.
      </p>
    </div>

    <!-- Create new group -->
    <div class="rounded-lg border border-border bg-bg-secondary p-4">
      <label class="block text-sm font-medium text-text-secondary mb-2"> Create New Group </label>
      <div class="flex gap-2">
        <input
          v-model="newGroupName"
          type="text"
          placeholder="Group name"
          class="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          @keydown.enter="createGroup"
        />
        <button
          class="btn-primary shrink-0 flex items-center gap-1"
          :disabled="!newGroupName.trim()"
          @click="createGroup"
        >
          <PlusIcon class="h-4 w-4" />
          Add
        </button>
      </div>
    </div>

    <!-- Groups list -->
    <div v-if="groupStore.sortedGroups.length > 0" class="space-y-2">
      <div
        v-for="group in groupStore.sortedGroups"
        :key="group.id"
        class="rounded-lg border border-border bg-bg-secondary transition-colors"
        :class="{
          'ring-2 ring-accent': dropTargetId === group.id,
          'opacity-50': draggedGroupId === group.id,
        }"
        draggable="true"
        @dragstart="(e) => onDragStart(e, group.id)"
        @dragover="(e) => onDragOver(e, group.id)"
        @dragleave="onDragLeave"
        @drop="(e) => onDrop(e, group.id)"
        @dragend="onDragEnd"
      >
        <div class="flex items-center gap-3 p-3">
          <!-- Drag handle -->
          <div
            class="cursor-grab text-text-muted hover:text-text-primary active:cursor-grabbing"
          >
            <Bars3Icon class="h-5 w-5" />
          </div>

          <!-- Group name (editable) -->
          <div class="flex-1 min-w-0">
            <template v-if="editingGroupId === group.id">
              <input
                ref="editInput"
                v-model="editingName"
                type="text"
                class="w-full rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                @keydown.enter="saveEdit(group.id)"
                @keydown.escape="cancelEdit"
              />
            </template>
            <template v-else>
              <span class="text-sm font-medium text-text-primary">{{ group.name }}</span>
            </template>
          </div>

          <!-- Feed count -->
          <span class="text-xs text-text-muted shrink-0">
            {{ feedCountForGroup(group.id) }} {{ feedCountForGroup(group.id) === 1 ? 'feed' : 'feeds' }}
          </span>

          <!-- Action buttons -->
          <div class="flex items-center gap-1 shrink-0">
            <template v-if="editingGroupId === group.id">
              <button
                class="rounded p-1 text-accent hover:bg-bg-hover"
                aria-label="Save"
                @click="saveEdit(group.id)"
              >
                <CheckIcon class="h-4 w-4" />
              </button>
              <button
                class="rounded p-1 text-text-muted hover:bg-bg-hover"
                aria-label="Cancel"
                @click="cancelEdit"
              >
                <XMarkIcon class="h-4 w-4" />
              </button>
            </template>
            <template v-else-if="confirmingDeleteId === group.id">
              <span class="text-xs text-text-muted mr-1">Delete?</span>
              <button
                class="rounded px-2 py-1 text-xs font-medium text-white bg-danger hover:bg-danger/80"
                @click="confirmDelete(group.id)"
              >
                Yes
              </button>
              <button
                class="rounded px-2 py-1 text-xs font-medium text-text-primary bg-bg-primary hover:bg-bg-hover"
                @click="confirmingDeleteId = null"
              >
                No
              </button>
            </template>
            <template v-else>
              <button
                class="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary"
                aria-label="Rename group"
                @click="startEdit(group.id, group.name)"
              >
                <PencilIcon class="h-4 w-4" />
              </button>
              <button
                class="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-danger"
                aria-label="Delete group"
                @click="startDelete(group.id)"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="rounded-lg border border-dashed border-border bg-bg-secondary p-8 text-center"
    >
      <p class="text-sm text-text-muted">
        No groups yet. Create your first group above to start organizing your feeds.
      </p>
    </div>
  </div>
</template>
