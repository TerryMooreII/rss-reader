<script setup lang="ts">
import { ref } from 'vue'
import { useGroupStore } from '@/stores/groups'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { PlusIcon, Bars3Icon } from '@heroicons/vue/24/outline'
import EditableListRow from './EditableListRow.vue'

const groupStore = useGroupStore()
const { run } = useAsyncAction()

const newGroupName = ref('')
const editingGroupId = ref<string | null>(null)
const confirmingDeleteId = ref<string | null>(null)

// Drag state for reordering
const draggedGroupId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)

async function createGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  const group = await run(() => groupStore.createGroup(name), { success: 'Group created', error: 'Failed to create group' })
  if (group) newGroupName.value = ''
}

async function saveEdit(groupId: string, name: string) {
  await run(() => groupStore.renameGroup(groupId, name), { success: 'Group renamed', error: 'Failed to rename group' })
  editingGroupId.value = null
}

async function confirmDelete(groupId: string) {
  await run(() => groupStore.deleteGroup(groupId), { success: 'Group deleted', error: 'Failed to delete group' })
  confirmingDeleteId.value = null
}

// Drag-and-drop for reordering
function onDragStart(e: DragEvent, groupId: string) {
  draggedGroupId.value = groupId
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', groupId)
}

function onDragOver(e: DragEvent, groupId: string) {
  e.preventDefault()
  if (draggedGroupId.value && draggedGroupId.value !== groupId) dropTargetId.value = groupId
}

async function onDrop(e: DragEvent, targetGroupId: string) {
  e.preventDefault()
  dropTargetId.value = null
  const dragged = draggedGroupId.value
  draggedGroupId.value = null
  if (!dragged || dragged === targetGroupId) return

  const ids = groupStore.sortedGroups.map((g) => g.id)
  const from = ids.indexOf(dragged)
  const to = ids.indexOf(targetGroupId)
  if (from === -1 || to === -1) return
  ids.splice(from, 1)
  ids.splice(to, 0, dragged)

  await run(() => groupStore.reorderGroups(ids), { error: 'Failed to reorder groups' })
}

function onDragEnd() {
  draggedGroupId.value = null
  dropTargetId.value = null
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-text-primary mb-1">Manage Groups</h2>
      <p class="text-sm text-text-muted">Create and organize groups to categorize your feeds. Drag to reorder.</p>
    </div>

    <!-- Create new group -->
    <div class="rounded-lg border border-border bg-bg-secondary p-4">
      <label class="field-label mb-2">Create New Group</label>
      <div class="flex gap-2">
        <input v-model="newGroupName" type="text" placeholder="Group name" class="input flex-1" @keydown.enter="createGroup" />
        <button class="btn-primary shrink-0 flex items-center gap-1" :disabled="!newGroupName.trim()" @click="createGroup">
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
        :class="{ 'ring-2 ring-accent': dropTargetId === group.id, 'opacity-50': draggedGroupId === group.id }"
        draggable="true"
        @dragstart="(e) => onDragStart(e, group.id)"
        @dragover="(e) => onDragOver(e, group.id)"
        @dragleave="dropTargetId = null"
        @drop="(e) => onDrop(e, group.id)"
        @dragend="onDragEnd"
      >
        <EditableListRow
          :name="group.name"
          :editing="editingGroupId === group.id"
          :confirming-delete="confirmingDeleteId === group.id"
          @start-edit="(editingGroupId = group.id), (confirmingDeleteId = null)"
          @save="(name) => saveEdit(group.id, name)"
          @cancel-edit="editingGroupId = null"
          @start-delete="(confirmingDeleteId = group.id), (editingGroupId = null)"
          @confirm-delete="confirmDelete(group.id)"
          @cancel-delete="confirmingDeleteId = null"
        >
          <template #prefix>
            <div class="cursor-grab text-text-muted hover:text-text-primary active:cursor-grabbing">
              <Bars3Icon class="h-5 w-5" />
            </div>
          </template>
          <template #meta>
            <span class="text-xs text-text-muted shrink-0">
              {{ groupStore.feedsByGroup(group.id).length }}
              {{ groupStore.feedsByGroup(group.id).length === 1 ? 'feed' : 'feeds' }}
            </span>
          </template>
        </EditableListRow>
      </div>
    </div>

    <div v-else class="rounded-lg border border-dashed border-border bg-bg-secondary p-8 text-center">
      <p class="text-sm text-text-muted">No groups yet. Create your first group above to start organizing your feeds.</p>
    </div>
  </div>
</template>
