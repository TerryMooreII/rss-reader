<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useStarTagStore } from '@/stores/starTags'
import { useNotificationStore } from '@/stores/notifications'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

const starTagStore = useStarTagStore()
const notifications = useNotificationStore()

const newTagName = ref('')
const editingTagId = ref<string | null>(null)
const editingName = ref('')
const editInput = ref<HTMLInputElement | null>(null)
const confirmingDeleteId = ref<string | null>(null)

async function createTag() {
  if (!newTagName.value.trim()) return

  try {
    await starTagStore.createTag(newTagName.value.trim())
    notifications.success('Tag created')
    newTagName.value = ''
  } catch {
    notifications.error('Failed to create tag')
  }
}

async function startEdit(tagId: string, currentName: string) {
  editingTagId.value = tagId
  editingName.value = currentName
  confirmingDeleteId.value = null
  await nextTick()
  editInput.value?.focus()
  editInput.value?.select()
}

function cancelEdit() {
  editingTagId.value = null
  editingName.value = ''
}

async function saveEdit(tagId: string) {
  if (!editingName.value.trim()) {
    cancelEdit()
    return
  }

  try {
    await starTagStore.renameTag(tagId, editingName.value.trim())
    notifications.success('Tag renamed')
  } catch {
    notifications.error('Failed to rename tag')
  } finally {
    cancelEdit()
  }
}

function startDelete(tagId: string) {
  confirmingDeleteId.value = tagId
  editingTagId.value = null
}

async function confirmDelete(tagId: string) {
  try {
    await starTagStore.deleteTag(tagId)
    notifications.success('Tag deleted. Starred entries moved to main Starred view.')
  } catch {
    notifications.error('Failed to delete tag')
  } finally {
    confirmingDeleteId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-text-primary mb-1">Star Tags</h2>
      <p class="text-sm text-text-muted">
        Organize starred entries with tags. Tags appear under Starred in the sidebar. Deleting a tag moves its entries to the main Starred view.
      </p>
    </div>

    <!-- Create new tag -->
    <div class="rounded-lg border border-border bg-bg-secondary p-4">
      <label class="block text-sm font-medium text-text-secondary mb-2">Create New Tag</label>
      <div class="flex gap-2">
        <input
          v-model="newTagName"
          type="text"
          placeholder="Tag name"
          class="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          @keydown.enter="createTag"
        />
        <button
          class="btn-primary shrink-0 flex items-center gap-1"
          :disabled="!newTagName.trim()"
          @click="createTag"
        >
          <PlusIcon class="h-4 w-4" />
          Add
        </button>
      </div>
    </div>

    <!-- Tags list -->
    <div v-if="starTagStore.sortedTags.length > 0" class="space-y-2">
      <div
        v-for="tag in starTagStore.sortedTags"
        :key="tag.id"
        class="rounded-lg border border-border bg-bg-secondary"
      >
        <div class="flex items-center gap-3 p-3">
          <!-- Tag name (editable) -->
          <div class="flex-1 min-w-0">
            <template v-if="editingTagId === tag.id">
              <input
                ref="editInput"
                v-model="editingName"
                type="text"
                class="w-full rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                @keydown.enter="saveEdit(tag.id)"
                @keydown.escape="cancelEdit"
              />
            </template>
            <template v-else>
              <span class="text-sm font-medium text-text-primary">{{ tag.name }}</span>
            </template>
          </div>

          <!-- Unread count -->
          <span v-if="(tag.unread_count ?? 0) > 0" class="text-xs text-text-muted shrink-0">
            {{ tag.unread_count }} unread
          </span>

          <!-- Action buttons -->
          <div class="flex items-center gap-1 shrink-0">
            <template v-if="editingTagId === tag.id">
              <button
                class="rounded p-1 text-accent hover:bg-bg-hover"
                aria-label="Save"
                @click="saveEdit(tag.id)"
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
            <template v-else-if="confirmingDeleteId === tag.id">
              <span class="text-xs text-text-muted mr-1">Delete?</span>
              <button
                class="rounded px-2 py-1 text-xs font-medium text-white bg-danger hover:bg-danger/80"
                @click="confirmDelete(tag.id)"
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
                aria-label="Rename tag"
                @click="startEdit(tag.id, tag.name)"
              >
                <PencilIcon class="h-4 w-4" />
              </button>
              <button
                class="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-danger"
                aria-label="Delete tag"
                @click="startDelete(tag.id)"
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
        No star tags yet. Create your first tag above to organize your starred entries.
      </p>
    </div>
  </div>
</template>
