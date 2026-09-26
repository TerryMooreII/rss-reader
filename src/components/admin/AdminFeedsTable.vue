<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Feed } from '@/types/models'
import { FEED_CATEGORIES } from '@/config/constants'
import { formatTimeAgo, formatShortDateTime } from '@/utils/date'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { faviconServiceUrl, updateFeed } from '@/services/admin.service'
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline'
import FeedFavicon from '@/components/ui/FeedFavicon.vue'
import SortableTh from './SortableTh.vue'
import StatusBadge from './StatusBadge.vue'

export type SortableColumn = 'title' | 'category' | 'status' | 'subscriber_count' | 'last_fetched_at' | 'consecutive_failures' | 'created_at'

const props = defineProps<{
  feeds: Feed[]
  loading: boolean
  total: number
  page: number
  pageSize: number
  sortColumn: string
  sortAsc: boolean
  categoryFilter: string
}>()
const emit = defineEmits<{
  'update:page': [n: number]
  'update:pageSize': [n: number]
  'update:categoryFilter': [v: string]
  sort: [column: string]
  manage: [feed: Feed]
}>()

const { run } = useAsyncAction()
const refetchingIcons = ref(new Set<string>())

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const categoryLabel = new Map<string, string>(FEED_CATEGORIES.map((c) => [c.value, c.label]))

async function refetchFavicon(feed: Feed) {
  let url: string
  try {
    url = faviconServiceUrl(feed)
  } catch {
    return run(() => Promise.reject(new Error('Could not determine domain from feed URL')), { error: 'Could not determine domain' })
  }
  refetchingIcons.value.add(feed.id)
  await run(
    async () => {
      await updateFeed(feed.id, { favicon_url: url })
      feed.favicon_url = url
    },
    { success: 'Icon refreshed', error: 'Failed to update icon' },
  )
  refetchingIcons.value.delete(feed.id)
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <div class="flex items-center gap-2">
        <label class="text-xs font-medium text-text-secondary">Category</label>
        <select :value="categoryFilter" class="input text-sm py-1 w-44" @change="emit('update:categoryFilter', ($event.target as HTMLSelectElement).value)">
          <option value="">All Categories</option>
          <option v-for="cat in FEED_CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
        </select>
      </div>
      <div class="flex items-center gap-2 ml-auto">
        <label class="text-xs font-medium text-text-secondary">Per page</label>
        <select :value="pageSize" class="input text-sm py-1 w-20" @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))">
          <option v-for="n in [25, 50, 100]" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b text-left text-text-muted">
            <SortableTh column="title" :active-column="sortColumn" :ascending="sortAsc" @sort="emit('sort', $event)">Feed</SortableTh>
            <SortableTh column="category" :active-column="sortColumn" :ascending="sortAsc" @sort="emit('sort', $event)">Category</SortableTh>
            <SortableTh column="status" :active-column="sortColumn" :ascending="sortAsc" @sort="emit('sort', $event)">Status</SortableTh>
            <SortableTh column="subscriber_count" :active-column="sortColumn" :ascending="sortAsc" @sort="emit('sort', $event)">Subs</SortableTh>
            <SortableTh column="last_fetched_at" :active-column="sortColumn" :ascending="sortAsc" @sort="emit('sort', $event)">Last Fetched</SortableTh>
            <SortableTh column="consecutive_failures" :active-column="sortColumn" :ascending="sortAsc" @sort="emit('sort', $event)">Failures</SortableTh>
            <th class="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="py-8 text-center text-text-muted">Loading...</td>
          </tr>
          <tr v-else-if="feeds.length === 0">
            <td colspan="7" class="py-8 text-center text-text-muted">No feeds found</td>
          </tr>
          <tr v-for="feed in feeds" v-else :key="feed.id" class="border-b last:border-0">
            <td class="py-2 pr-4">
              <div class="flex items-center gap-2">
                <button
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-bg-secondary hover:bg-bg-tertiary transition-colors"
                  :disabled="refetchingIcons.has(feed.id)"
                  title="Refetch favicon"
                  @click.stop="refetchFavicon(feed)"
                >
                  <ArrowPathIcon v-if="refetchingIcons.has(feed.id)" class="h-3.5 w-3.5 animate-spin text-text-muted" />
                  <FeedFavicon v-else :src="feed.favicon_url" />
                </button>
                <div class="min-w-0">
                  <p class="truncate font-medium text-text-primary max-w-xs">{{ feed.title || feed.url }}</p>
                  <p class="truncate text-xs text-text-muted max-w-xs">{{ feed.url }}</p>
                </div>
              </div>
            </td>
            <td class="py-2 pr-4 text-text-muted text-xs">{{ categoryLabel.get(feed.category) ?? feed.category }}</td>
            <td class="py-2 pr-4"><StatusBadge :status="feed.status" /></td>
            <td class="py-2 pr-4 text-text-muted">{{ feed.subscriber_count }}</td>
            <td class="py-2 pr-4 text-text-muted" :title="formatShortDateTime(feed.last_fetched_at, 'Never fetched')">
              {{ feed.last_fetched_at ? formatTimeAgo(feed.last_fetched_at) : 'Never' }}
            </td>
            <td class="py-2 pr-4 text-text-muted">{{ feed.consecutive_failures }}</td>
            <td class="py-2">
              <button class="btn-ghost text-xs flex items-center gap-1" @click="emit('manage', feed)">
                <Cog6ToothIcon class="h-3.5 w-3.5" />
                Manage
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-4 pt-4 border-t">
      <p class="text-xs text-text-muted">
        {{ total === 0 ? 'No feeds' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} feeds` }}
      </p>
      <div class="flex items-center gap-1">
        <button class="btn-icon disabled:opacity-30 disabled:cursor-not-allowed" :disabled="page <= 1" aria-label="Previous page" @click="emit('update:page', page - 1)">
          <ChevronLeftIcon class="h-4 w-4" />
        </button>
        <span class="px-2 text-sm text-text-secondary">Page {{ page }} of {{ totalPages }}</span>
        <button class="btn-icon disabled:opacity-30 disabled:cursor-not-allowed" :disabled="page >= totalPages" aria-label="Next page" @click="emit('update:page', page + 1)">
          <ChevronRightIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
