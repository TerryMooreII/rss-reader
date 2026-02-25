<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useFilterStore } from '@/stores/filters'
import { useFeedStore } from '@/stores/feeds'
import { useGroupStore } from '@/stores/groups'
import { useStarTagStore } from '@/stores/starTags'
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
const starTagStore = useStarTagStore()
const notifications = useNotificationStore()

// --- Create form state ---
const newKeyword = ref('')
const newScopeValue = ref('global:null')
const newAction = ref<'hide' | 'mark_read' | 'auto_star'>('hide')
const newStarTagId = ref<string | null>(null)
const newTagName = ref('')
const showNewTagInput = ref(false)

// --- Edit state ---
const editingFilterId = ref<string | null>(null)
const editKeyword = ref('')
const editScopeValue = ref('')
const editAction = ref<'hide' | 'mark_read' | 'auto_star'>('hide')
const editStarTagId = ref<string | null>(null)
const editNewTagName = ref('')
const showEditNewTagInput = ref(false)
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

// --- Tag helpers ---
function tagName(tagId: string | null): string {
  if (!tagId) return ''
  return starTagStore.tagById(tagId)?.name ?? 'Unknown tag'
}

async function resolveNewStarTagId(): Promise<string | null> {
  if (newAction.value !== 'auto_star') return null
  if (showNewTagInput.value && newTagName.value.trim()) {
    const tag = await starTagStore.createTag(newTagName.value.trim())
    showNewTagInput.value = false
    newTagName.value = ''
    return tag?.id ?? null
  }
  return newStarTagId.value
}

async function resolveEditStarTagId(): Promise<string | null> {
  if (editAction.value !== 'auto_star') return null
  if (showEditNewTagInput.value && editNewTagName.value.trim()) {
    const tag = await starTagStore.createTag(editNewTagName.value.trim())
    showEditNewTagInput.value = false
    editNewTagName.value = ''
    return tag?.id ?? null
  }
  return editStarTagId.value
}

// --- Actions ---
async function createFilter() {
  if (!newKeyword.value.trim()) return
  if (newAction.value === 'auto_star' && !newStarTagId.value && !newTagName.value.trim()) return

  const { scope_type, scope_id } = parseScope(newScopeValue.value)
  const starTagId = await resolveNewStarTagId()

  const result = await filterStore.createFilter({
    keyword: newKeyword.value.trim(),
    scope_type,
    scope_id,
    action: newAction.value,
    star_tag_id: starTagId,
  })

  if (result) {
    notifications.success('Filter created')
    newKeyword.value = ''
    newScopeValue.value = 'global:null'
    newAction.value = 'hide'
    newStarTagId.value = null
    newTagName.value = ''
    showNewTagInput.value = false
  } else {
    notifications.error('Failed to create filter')
  }
}

async function startEdit(filter: ContentFilter) {
  editingFilterId.value = filter.id
  editKeyword.value = filter.keyword
  editScopeValue.value = toScopeValue(filter)
  editAction.value = filter.action
  editStarTagId.value = filter.star_tag_id
  showEditNewTagInput.value = false
  editNewTagName.value = ''
  confirmingDeleteId.value = null
  await nextTick()
  editInput.value?.focus()
  editInput.value?.select()
}

function cancelEdit() {
  editingFilterId.value = null
  editKeyword.value = ''
  editStarTagId.value = null
  showEditNewTagInput.value = false
  editNewTagName.value = ''
}

async function saveEdit(id: string) {
  if (!editKeyword.value.trim()) {
    cancelEdit()
    return
  }

  const { scope_type, scope_id } = parseScope(editScopeValue.value)
  const starTagId = await resolveEditStarTagId()

  await filterStore.updateFilter(id, {
    keyword: editKeyword.value.trim(),
    scope_type,
    scope_id,
    action: editAction.value,
    star_tag_id: starTagId,
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
          <button
            class="px-3 py-2 text-sm font-medium transition-colors border-l border-border"
            :class="
              newAction === 'auto_star'
                ? 'bg-star/10 text-star'
                : 'bg-bg-primary text-text-secondary hover:bg-bg-hover'
            "
            @click="newAction = 'auto_star'"
          >
            Auto Star
          </button>
        </div>
      </div>

      <!-- Tag selector for auto_star -->
      <div v-if="newAction === 'auto_star'" class="flex gap-2 items-center">
        <template v-if="!showNewTagInput">
          <select
            v-model="newStarTagId"
            class="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option :value="null" disabled>Select a tag...</option>
            <option
              v-for="tag in starTagStore.sortedTags"
              :key="tag.id"
              :value="tag.id"
            >
              {{ tag.name }}
            </option>
          </select>
          <button
            class="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover shrink-0"
            @click="showNewTagInput = true"
          >
            New tag...
          </button>
        </template>
        <template v-else>
          <input
            v-model="newTagName"
            type="text"
            placeholder="New tag name"
            class="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            @keydown.escape="showNewTagInput = false; newTagName = ''"
          />
          <button
            class="rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-muted hover:bg-bg-hover shrink-0"
            @click="showNewTagInput = false; newTagName = ''"
          >
            Cancel
          </button>
        </template>
      </div>

      <button
        class="btn-primary flex items-center gap-1"
        :disabled="!newKeyword.trim() || (newAction === 'auto_star' && !newStarTagId && !newTagName.trim())"
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
              <button
                class="px-2 py-1 text-xs font-medium transition-colors border-l border-border"
                :class="
                  editAction === 'auto_star'
                    ? 'bg-star/10 text-star'
                    : 'bg-bg-primary text-text-secondary hover:bg-bg-hover'
                "
                @click="editAction = 'auto_star'"
              >
                Auto Star
              </button>
            </div>
          </div>
          <!-- Tag selector for edit auto_star -->
          <div v-if="editAction === 'auto_star'" class="flex gap-2 items-center">
            <template v-if="!showEditNewTagInput">
              <select
                v-model="editStarTagId"
                class="flex-1 rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option :value="null" disabled>Select a tag...</option>
                <option
                  v-for="tag in starTagStore.sortedTags"
                  :key="tag.id"
                  :value="tag.id"
                >
                  {{ tag.name }}
                </option>
              </select>
              <button
                class="rounded border border-border bg-bg-primary px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover shrink-0"
                @click="showEditNewTagInput = true"
              >
                New tag...
              </button>
            </template>
            <template v-else>
              <input
                v-model="editNewTagName"
                type="text"
                placeholder="New tag name"
                class="flex-1 rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                @keydown.escape="showEditNewTagInput = false; editNewTagName = ''"
              />
              <button
                class="rounded border border-border bg-bg-primary px-2 py-1 text-xs text-text-muted hover:bg-bg-hover shrink-0"
                @click="showEditNewTagInput = false; editNewTagName = ''"
              >
                Cancel
              </button>
            </template>
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
                    : filter.action === 'auto_star'
                      ? 'bg-star/10 text-star'
                      : 'bg-accent/10 text-accent'
                "
              >
                {{ filter.action === 'hide' ? 'Hide' : filter.action === 'auto_star' ? 'Auto Star' : 'Mark read' }}
              </span>
              <span
                v-if="filter.action === 'auto_star' && filter.star_tag_id"
                class="rounded-full bg-star/10 px-2 py-0.5 text-xs font-medium text-star"
              >
                {{ tagName(filter.star_tag_id) }}
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
