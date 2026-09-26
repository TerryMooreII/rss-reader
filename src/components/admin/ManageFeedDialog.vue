<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Feed } from '@/types/models'
import { FEED_CATEGORIES } from '@/config/constants'
import { formatTimeAgo, formatShortDateTime } from '@/utils/date'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { faviconServiceUrl, updateFeed, deleteFeed } from '@/services/admin.service'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import FeedFavicon from '@/components/ui/FeedFavicon.vue'
import FormField from '@/components/ui/FormField.vue'
import InlineConfirm from '@/components/ui/InlineConfirm.vue'

const props = defineProps<{ feed: Feed | null }>()
const emit = defineEmits<{ close: []; updated: [feed: Feed]; deleted: [id: string] }>()

const { run } = useAsyncAction()
const draft = ref<Feed | null>(null)
const refetchingIcon = ref(false)
const confirmingDelete = ref(false)

watch(
  () => props.feed,
  (f) => {
    draft.value = f ? { ...f } : null
    confirmingDelete.value = false
  },
  { immediate: true },
)

async function patch(field: 'status' | 'category', value: string) {
  if (!draft.value) return
  const feed = draft.value
  const ok = await run(() => updateFeed(feed.id, { [field]: value }), {
    success: `${field === 'category' ? 'Category' : 'Status'} updated`,
    error: `Failed to update ${field}`,
  })
  if (ok !== undefined) {
    ;(feed as Record<string, unknown>)[field] = value
    emit('updated', { ...feed })
  }
}

async function refetchIcon() {
  if (!draft.value) return
  const feed = draft.value
  let url: string
  try {
    url = faviconServiceUrl(feed)
  } catch {
    return
  }
  refetchingIcon.value = true
  const ok = await run(() => updateFeed(feed.id, { favicon_url: url }), { success: 'Icon refreshed', error: 'Failed to update icon' })
  refetchingIcon.value = false
  if (ok !== undefined) {
    feed.favicon_url = url
    emit('updated', { ...feed })
  }
}

async function remove() {
  if (!draft.value) return
  const id = draft.value.id
  const ok = await run(() => deleteFeed(id), { success: 'Feed deleted', error: 'Failed to delete feed' })
  if (ok !== undefined) emit('deleted', id)
}
</script>

<template>
  <BaseDialog :open="!!feed" title="Manage Feed" max-width="max-w-lg" scroll @close="emit('close')">
    <div v-if="draft">
      <!-- Feed identity -->
      <div class="flex items-center gap-3 mb-5">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-tertiary shrink-0">
          <FeedFavicon :src="draft.favicon_url" size="lg" />
        </div>
        <div class="min-w-0">
          <p class="font-semibold text-text-primary truncate">{{ draft.title || 'Untitled' }}</p>
          <a v-if="draft.site_url" :href="draft.site_url" target="_blank" rel="noopener noreferrer" class="text-xs text-accent hover:underline truncate block">
            {{ draft.site_url }}
          </a>
        </div>
      </div>

      <!-- Info grid -->
      <div class="rounded-lg border bg-bg-secondary/50 p-4 mb-5 space-y-3 text-sm">
        <div>
          <p class="text-xs font-medium text-text-muted mb-0.5">Feed URL</p>
          <p class="text-text-primary break-all text-xs">{{ draft.url }}</p>
        </div>
        <div v-if="draft.description">
          <p class="text-xs font-medium text-text-muted mb-0.5">Description</p>
          <p class="text-text-secondary text-xs line-clamp-3">{{ draft.description }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-xs font-medium text-text-muted mb-0.5">Subscribers</p>
            <p class="text-text-primary">{{ draft.subscriber_count }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-text-muted mb-0.5">Last Fetched</p>
            <p class="text-text-primary" :title="formatShortDateTime(draft.last_fetched_at, '')">
              {{ draft.last_fetched_at ? formatTimeAgo(draft.last_fetched_at) : 'Never' }}
            </p>
          </div>
          <div>
            <p class="text-xs font-medium text-text-muted mb-0.5">Poll interval</p>
            <p class="text-text-primary">{{ draft.fetch_interval_minutes }} min</p>
          </div>
          <div>
            <p class="text-xs font-medium text-text-muted mb-0.5">Failures</p>
            <p :class="draft.consecutive_failures > 0 ? 'text-danger' : 'text-text-primary'">{{ draft.consecutive_failures }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-text-muted mb-0.5">Added</p>
            <p class="text-text-primary">{{ new Date(draft.created_at).toLocaleDateString() }}</p>
          </div>
        </div>
        <div v-if="draft.last_error_message">
          <p class="text-xs font-medium text-text-muted mb-0.5">Last Error</p>
          <p class="text-danger text-xs">{{ draft.last_error_message }}</p>
        </div>
      </div>

      <!-- Editable fields -->
      <div class="space-y-4 mb-5">
        <FormField label="Status">
          <select class="input text-sm" :value="draft.status" @change="patch('status', ($event.target as HTMLSelectElement).value)">
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
            <option value="dead">Dead</option>
          </select>
        </FormField>
        <FormField label="Category">
          <select class="input text-sm" :value="draft.category" @change="patch('category', ($event.target as HTMLSelectElement).value)">
            <option v-for="cat in FEED_CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
          </select>
        </FormField>
      </div>

      <!-- Icon management -->
      <div class="mb-5">
        <label class="field-label mb-2">Feed Icon</label>
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg border bg-bg-secondary shrink-0">
            <FeedFavicon :src="draft.favicon_url" size="sm" />
          </div>
          <button class="btn-ghost text-xs flex items-center gap-1.5" :disabled="refetchingIcon" @click="refetchIcon">
            <ArrowPathIcon class="h-3.5 w-3.5" :class="refetchingIcon ? 'animate-spin' : ''" />
            {{ refetchingIcon ? 'Fetching...' : 'Refetch Icon' }}
          </button>
          <span class="text-xs text-text-muted">Uses Google favicon service</span>
        </div>
      </div>

      <!-- Danger zone -->
      <div class="border-t pt-4 flex items-center gap-2">
        <InlineConfirm v-if="confirmingDelete" prompt="Delete this feed and all its entries?" confirm-label="Delete" cancel-label="Keep" @confirm="remove" @cancel="confirmingDelete = false" />
        <template v-else>
          <button class="btn-danger text-sm px-4 py-2" @click="confirmingDelete = true">Delete Feed</button>
          <p class="text-xs text-text-muted">Permanently delete this feed and all its entries.</p>
        </template>
      </div>
    </div>
  </BaseDialog>
</template>
