<script setup lang="ts">
import { ref } from 'vue'
import { useStarTagStore } from '@/stores/starTags'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { PlusIcon } from '@heroicons/vue/24/outline'
import EditableListRow from './EditableListRow.vue'

const starTagStore = useStarTagStore()
const { run } = useAsyncAction()

const newTagName = ref('')
const editingTagId = ref<string | null>(null)
const confirmingDeleteId = ref<string | null>(null)

async function createTag() {
  const name = newTagName.value.trim()
  if (!name) return
  const tag = await run(() => starTagStore.createTag(name), { success: 'Tag created', error: 'Failed to create tag' })
  if (tag) newTagName.value = ''
}

async function saveEdit(tagId: string, name: string) {
  await run(() => starTagStore.renameTag(tagId, name), { success: 'Tag renamed', error: 'Failed to rename tag' })
  editingTagId.value = null
}

async function confirmDelete(tagId: string) {
  await run(() => starTagStore.deleteTag(tagId), {
    success: 'Tag deleted. Starred entries moved to main Starred view.',
    error: 'Failed to delete tag',
  })
  confirmingDeleteId.value = null
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

    <div class="rounded-lg border border-border bg-bg-secondary p-4">
      <label class="field-label mb-2">Create New Tag</label>
      <div class="flex gap-2">
        <input v-model="newTagName" type="text" placeholder="Tag name" class="input flex-1" @keydown.enter="createTag" />
        <button class="btn-primary shrink-0 flex items-center gap-1" :disabled="!newTagName.trim()" @click="createTag">
          <PlusIcon class="h-4 w-4" />
          Add
        </button>
      </div>
    </div>

    <div v-if="starTagStore.sortedTags.length > 0" class="space-y-2">
      <div v-for="tag in starTagStore.sortedTags" :key="tag.id" class="rounded-lg border border-border bg-bg-secondary">
        <EditableListRow
          :name="tag.name"
          :editing="editingTagId === tag.id"
          :confirming-delete="confirmingDeleteId === tag.id"
          @start-edit="(editingTagId = tag.id), (confirmingDeleteId = null)"
          @save="(name) => saveEdit(tag.id, name)"
          @cancel-edit="editingTagId = null"
          @start-delete="(confirmingDeleteId = tag.id), (editingTagId = null)"
          @confirm-delete="confirmDelete(tag.id)"
          @cancel-delete="confirmingDeleteId = null"
        >
          <template #meta>
            <span v-if="starTagStore.unreadFor(tag.id) > 0" class="text-xs text-text-muted shrink-0">
              {{ starTagStore.unreadFor(tag.id) }} unread
            </span>
          </template>
        </EditableListRow>
      </div>
    </div>

    <div v-else class="rounded-lg border border-dashed border-border bg-bg-secondary p-8 text-center">
      <p class="text-sm text-text-muted">No star tags yet. Create your first tag above to organize your starred entries.</p>
    </div>
  </div>
</template>
