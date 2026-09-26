<script setup lang="ts">
import { ref } from 'vue'
import { useFilterStore, type ContentFilterInput } from '@/stores/filters'
import { useFeedStore } from '@/stores/feeds'
import { useGroupStore } from '@/stores/groups'
import { useStarTagStore } from '@/stores/starTags'
import { useAsyncAction } from '@/composables/useAsyncAction'
import type { ContentFilter } from '@/types/models'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import FilterForm from './FilterForm.vue'
import InlineConfirm from '@/components/ui/InlineConfirm.vue'

const filterStore = useFilterStore()
const feedStore = useFeedStore()
const groupStore = useGroupStore()
const starTagStore = useStarTagStore()
const { run } = useAsyncAction()

const createForm = ref<InstanceType<typeof FilterForm> | null>(null)
const editingFilterId = ref<string | null>(null)
const confirmingDeleteId = ref<string | null>(null)

const actionLabel: Record<ContentFilter['action'], string> = { hide: 'Hide', mark_read: 'Mark read', auto_star: 'Auto Star' }
const actionClass: Record<ContentFilter['action'], string> = {
  hide: 'bg-danger/10 text-danger',
  mark_read: 'bg-accent/10 text-accent',
  auto_star: 'bg-star/10 text-star',
}

function scopeLabel(filter: ContentFilter): string {
  if (filter.scope_type === 'feed') {
    const feed = feedStore.feedById(filter.scope_id!)
    return feed ? feed.custom_title || feed.title || 'Unknown feed' : 'Unknown feed'
  }
  if (filter.scope_type === 'group') return groupStore.groupById(filter.scope_id!)?.name ?? 'Unknown group'
  return 'All feeds'
}

function tagName(tagId: string | null): string {
  return tagId ? (starTagStore.tagById(tagId)?.name ?? 'Unknown tag') : ''
}

async function createFilter(payload: ContentFilterInput) {
  const created = await run(() => filterStore.createFilter(payload), { success: 'Filter created', error: 'Failed to create filter' })
  if (created) createForm.value?.reset()
}

async function saveEdit(id: string, payload: ContentFilterInput) {
  await run(() => filterStore.updateFilter(id, payload), { success: 'Filter updated', error: 'Failed to update filter' })
  editingFilterId.value = null
}

async function confirmDelete(id: string) {
  await run(() => filterStore.deleteFilter(id), { success: 'Filter deleted', error: 'Failed to delete filter' })
  confirmingDeleteId.value = null
}

function toggleFilter(id: string) {
  run(() => filterStore.toggleFilter(id), { error: 'Failed to update filter' })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-text-primary mb-1">Content Filters</h2>
      <p class="text-sm text-text-muted">
        Hide or auto-mark entries that match specific keywords. Filters apply to entry titles and content.
        Use search syntax: <code class="text-text-primary bg-bg-secondary px-1 rounded text-xs">word1 word2</code> for AND,
        <code class="text-text-primary bg-bg-secondary px-1 rounded text-xs">OR</code> between words,
        <code class="text-text-primary bg-bg-secondary px-1 rounded text-xs">"exact phrase"</code>,
        <code class="text-text-primary bg-bg-secondary px-1 rounded text-xs">-word</code> to exclude.
      </p>
    </div>

    <!-- Create -->
    <div class="rounded-lg border border-border bg-bg-secondary p-4 space-y-3">
      <label class="field-label">New Filter</label>
      <FilterForm ref="createForm" @submit="createFilter">
        <template #submit-icon><PlusIcon class="h-4 w-4" /></template>
      </FilterForm>
    </div>

    <!-- List -->
    <div v-if="filterStore.filters.length > 0" class="space-y-2">
      <div v-for="filter in filterStore.filters" :key="filter.id" class="rounded-lg border border-border bg-bg-secondary transition-colors">
        <div v-if="editingFilterId === filter.id" class="p-3">
          <FilterForm :initial="filter" size="sm" submit-label="Save" autofocus @submit="(p) => saveEdit(filter.id, p)" @cancel="editingFilterId = null">
            <template #actions>
              <button type="button" class="btn-ghost px-3 py-1.5 text-xs" @click="editingFilterId = null">Cancel</button>
            </template>
          </FilterForm>
        </div>

        <div v-else class="flex items-center gap-3 p-3">
          <input type="checkbox" :checked="filter.enabled" class="rounded border-border shrink-0" @change="toggleFilter(filter.id)" />

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <code class="rounded bg-bg-primary px-1.5 py-0.5 text-xs font-mono text-text-primary border border-border" :class="{ 'opacity-50': !filter.enabled }">
                {{ filter.keyword }}
              </code>
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="actionClass[filter.action]">
                {{ actionLabel[filter.action] }}
              </span>
              <span v-if="filter.action === 'auto_star' && filter.star_tag_id" class="rounded-full bg-star/10 px-2 py-0.5 text-xs font-medium text-star">
                {{ tagName(filter.star_tag_id) }}
              </span>
            </div>
            <p class="text-xs text-text-muted mt-0.5 truncate">{{ scopeLabel(filter) }}</p>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <InlineConfirm v-if="confirmingDeleteId === filter.id" @confirm="confirmDelete(filter.id)" @cancel="confirmingDeleteId = null" />
            <template v-else>
              <button class="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary" aria-label="Edit filter" @click="(editingFilterId = filter.id), (confirmingDeleteId = null)">
                <PencilIcon class="h-4 w-4" />
              </button>
              <button class="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-danger" aria-label="Delete filter" @click="(confirmingDeleteId = filter.id), (editingFilterId = null)">
                <TrashIcon class="h-4 w-4" />
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="rounded-lg border border-dashed border-border bg-bg-secondary p-8 text-center">
      <p class="text-sm text-text-muted">No content filters yet. Create your first filter above to hide or auto-mark entries matching specific keywords.</p>
    </div>
  </div>
</template>
