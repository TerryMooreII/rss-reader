<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useFilterStore } from '@/stores/filters'
import { useFeedStore } from '@/stores/feeds'
import { useGroupStore } from '@/stores/groups'
import { useNotificationStore } from '@/stores/notifications'
import type { ContentFilter } from '@/types/models'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

const filterStore = useFilterStore()
const feedStore = useFeedStore()
const groupStore = useGroupStore()
const notifications = useNotificationStore()

// --- Create form state ---
const newKeyword = ref('')
const newScopeValue = ref('global:null')
const newAction = ref<'hide' | 'mark_read'>('hide')

// --- Edit state ---
const editingFilterId = ref<string | null>(null)
const editKeyword = ref('')
const editScopeValue = ref('')
const editAction = ref<'hide' | 'mark_read'>('hide')
const editInput = ref<HTMLInputElement | null>(null)

// --- Delete confirm state ---
const confirmingDeleteId = ref<string | null>(null)

// --- Scope helpers ---
function parseScope(val: string): { scope_type: 'global' | 'feed' | 'group'; scope_id: string | null } {
  const idx = val.indexOf(':')
  const type = val.slice(0, idx) as 'global' | 'feed' | 'group'
  const id = val.slice(idx + 1)
  return { scope_type: type, scope_id: id === 'null' ? null : id }
}

function toScopeValue(filter: ContentFilter): string {
  return `${filter.scope_type}:${filter.scope_id ?? 'null'}`
}

function scopeLabel(filter: ContentFilter): string {
  if (filter.scope_type === 'global') return 'All feeds'
  if (filter.scope_type === 'feed') {
    const feed = feedStore.feedById(filter.scope_id!)
    return feed ? (feed.custom_title || feed.title || 'Unknown feed') : 'Unknown feed'
  }
  if (filter.scope_type === 'group') {
    const group = groupStore.groupById(filter.scope_id!)
    return group ? group.name : 'Unknown group'
  }
  return 'Unknown'
}

// --- Actions ---
async function createFilter() {
  if (!newKeyword.value.trim()) return

  const { scope_type, scope_id } = parseScope(newScopeValue.value)

  const result = await filterStore.createFilter({
    keyword: newKeyword.value.trim(),
    scope_type,
    scope_id,
    action: newAction.value,
  })

  if (result) {
    notifications.success('Filter created')
    newKeyword.value = ''
    newScopeValue.value = 'global:null'
    newAction.value = 'hide'
  } else {
    notifications.error('Failed to create filter')
  }
}

async function startEdit(filter: ContentFilter) {
  editingFilterId.value = filter.id
  editKeyword.value = filter.keyword
  editScopeValue.value = toScopeValue(filter)
  editAction.value = filter.action
  confirmingDeleteId.value = null
  await nextTick()
  editInput.value?.focus()
  editInput.value?.select()
}

function cancelEdit() {
  editingFilterId.value = null
  editKeyword.value = ''
}

async function saveEdit(id: string) {
  if (!editKeyword.value.trim()) {
    cancelEdit()
    return
  }

  const { scope_type, scope_id } = parseScope(editScopeValue.value)

  await filterStore.updateFilter(id, {
    keyword: editKeyword.value.trim(),
    scope_type,
    scope_id,
    action: editAction.value,
  })
  notifications.success('Filter updated')
  cancelEdit()
}

function startDelete(id: string) {
  confirmingDeleteId.value = id
  editingFilterId.value = null
}

async function confirmDelete(id: string) {
  await filterStore.deleteFilter(id)
  notifications.success('Filter deleted')
  confirmingDeleteId.value = null
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-text-primary mb-1">Content Filters</h2>
      <p class="text-sm text-text-muted">
        Hide or auto-mark entries that match specific keywords. Filters apply to entry titles and content.
      </p>
    </div>

    <!-- Create new filter -->
    <div class="rounded-lg border border-border bg-bg-secondary p-4 space-y-3">
      <label class="block text-sm font-medium text-text-secondary">New Filter</label>

      <input
        v-model="newKeyword"
        type="text"
        placeholder="Keyword to filter (e.g. sponsored)"
        class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        @keydown.enter="createFilter"
      />

      <div class="flex flex-col sm:flex-row gap-2">
        <select
          v-model="newScopeValue"
          class="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="global:null">All feeds</option>
          <optgroup v-if="feedStore.feeds.length > 0" label="Specific Feed">
            <option
              v-for="feed in feedStore.feeds"
              :key="feed.id"
              :value="`feed:${feed.id}`"
            >
              {{ feed.custom_title || feed.title || feed.url }}
            </option>
          </optgroup>
          <optgroup v-if="groupStore.sortedGroups.length > 0" label="Specific Group">
            <option
              v-for="group in groupStore.sortedGroups"
              :key="group.id"
              :value="`group:${group.id}`"
            >
              {{ group.name }}
            </option>
          </optgroup>
        </select>

        <div class="flex rounded-lg border border-border overflow-hidden shrink-0">
          <button
            class="px-3 py-2 text-sm font-medium transition-colors"
            :class="
              newAction === 'hide'
                ? 'bg-accent/10 text-accent'
                : 'bg-bg-primary text-text-secondary hover:bg-bg-hover'
            "
            @click="newAction = 'hide'"
          >
            Hide
          </button>
          <button
            class="px-3 py-2 text-sm font-medium transition-colors border-l border-border"
            :class="
              newAction === 'mark_read'
                ? 'bg-accent/10 text-accent'
                : 'bg-bg-primary text-text-secondary hover:bg-bg-hover'
            "
            @click="newAction = 'mark_read'"
          >
            Mark Read
          </button>
        </div>
      </div>

      <button
        class="btn-primary flex items-center gap-1"
        :disabled="!newKeyword.trim()"
        @click="createFilter"
      >
        <PlusIcon class="h-4 w-4" />
        Add Filter
      </button>
    </div>

    <!-- Filters list -->
    <div v-if="filterStore.filters.length > 0" class="space-y-2">
      <div
        v-for="filter in filterStore.filters"
        :key="filter.id"
        class="rounded-lg border border-border bg-bg-secondary transition-colors"
      >
        <!-- Editing mode -->
        <div v-if="editingFilterId === filter.id" class="p-3 space-y-2">
          <input
            ref="editInput"
            v-model="editKeyword"
            type="text"
            class="w-full rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            @keydown.enter="saveEdit(filter.id)"
            @keydown.escape="cancelEdit"
          />
          <div class="flex gap-2">
            <select
              v-model="editScopeValue"
              class="flex-1 rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="global:null">All feeds</option>
              <optgroup v-if="feedStore.feeds.length > 0" label="Specific Feed">
                <option
                  v-for="feed in feedStore.feeds"
                  :key="feed.id"
                  :value="`feed:${feed.id}`"
                >
                  {{ feed.custom_title || feed.title || feed.url }}
                </option>
              </optgroup>
              <optgroup v-if="groupStore.sortedGroups.length > 0" label="Specific Group">
                <option
                  v-for="group in groupStore.sortedGroups"
                  :key="group.id"
                  :value="`group:${group.id}`"
                >
                  {{ group.name }}
                </option>
              </optgroup>
            </select>
            <div class="flex rounded border border-border overflow-hidden shrink-0">
              <button
                class="px-2 py-1 text-xs font-medium transition-colors"
                :class="
                  editAction === 'hide'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-bg-primary text-text-secondary hover:bg-bg-hover'
                "
                @click="editAction = 'hide'"
              >
                Hide
              </button>
              <button
                class="px-2 py-1 text-xs font-medium transition-colors border-l border-border"
                :class="
                  editAction === 'mark_read'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-bg-primary text-text-secondary hover:bg-bg-hover'
                "
                @click="editAction = 'mark_read'"
              >
                Mark Read
              </button>
            </div>
          </div>
          <div class="flex gap-1">
            <button
              class="rounded p-1 text-accent hover:bg-bg-hover"
              aria-label="Save"
              @click="saveEdit(filter.id)"
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
          </div>
        </div>

        <!-- Display mode -->
        <div v-else class="flex items-center gap-3 p-3">
          <!-- Enable/disable toggle -->
          <input
            type="checkbox"
            :checked="filter.enabled"
            class="rounded border-border shrink-0"
            @change="filterStore.toggleFilter(filter.id)"
          />

          <!-- Filter info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <code
                class="rounded bg-bg-primary px-1.5 py-0.5 text-xs font-mono text-text-primary border border-border"
                :class="{ 'opacity-50': !filter.enabled }"
              >
                {{ filter.keyword }}
              </code>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="
                  filter.action === 'hide'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-accent/10 text-accent'
                "
              >
                {{ filter.action === 'hide' ? 'Hide' : 'Mark read' }}
              </span>
            </div>
            <p class="text-xs text-text-muted mt-0.5 truncate">
              {{ scopeLabel(filter) }}
            </p>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-1 shrink-0">
            <template v-if="confirmingDeleteId === filter.id">
              <span class="text-xs text-text-muted mr-1">Delete?</span>
              <button
                class="rounded px-2 py-1 text-xs font-medium text-white bg-danger hover:bg-danger/80"
                @click="confirmDelete(filter.id)"
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
                aria-label="Edit filter"
                @click="startEdit(filter)"
              >
                <PencilIcon class="h-4 w-4" />
              </button>
              <button
                class="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-danger"
                aria-label="Delete filter"
                @click="startDelete(filter.id)"
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
        No content filters yet. Create your first filter above to hide or auto-mark entries matching specific keywords.
      </p>
    </div>
  </div>
</template>
