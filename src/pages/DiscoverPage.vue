<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { FEED_CATEGORIES } from '@/config/constants'
import { useFeedStore } from '@/stores/feeds'
import { useNotificationStore } from '@/stores/notifications'
import { useUIStore } from '@/stores/ui'
import { supabase } from '@/config/supabase'
import type { Feed } from '@/types/models'
import { formatTimeAgo } from '@/utils/date'
import { MagnifyingGlassIcon, PlusIcon, CheckIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import GroupSelector from '@/components/common/GroupSelector.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import FeedFavicon from '@/components/ui/FeedFavicon.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

type DiscoverFeed = Pick<Feed, 'id' | 'url' | 'title' | 'description' | 'favicon_url' | 'category' | 'subscriber_count'>
interface PreviewEntry {
  title: string | null
  url: string | null
  published_at: string | null
  author: string | null
}

const ui = useUIStore()
const feedStore = useFeedStore()
const notifications = useNotificationStore()

const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const feeds = ref<DiscoverFeed[]>([])
const loading = ref(false)
const actionLoading = ref<string | null>(null)
const groupPickerFeedId = ref<string | null>(null)

// Expandable preview state
const expandedFeedId = ref<string | null>(null)
const previewEntries = ref<Record<string, PreviewEntry[]>>({})
const previewLoading = ref<string | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let loadSeq = 0

/** PostgREST `ilike` treats % and _ as wildcards; escape user input. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}

async function loadFeeds() {
  const seq = ++loadSeq
  loading.value = true
  try {
    let query = supabase
      .from('feeds')
      .select('id, url, title, description, favicon_url, category, subscriber_count')
      .eq('is_private', false)
      .eq('status', 'active')
      .order('subscriber_count', { ascending: false })
      .order('title', { ascending: true })
      .limit(50)

    if (selectedCategory.value) query = query.eq('category', selectedCategory.value)
    const q = searchQuery.value.trim()
    if (q) query = query.ilike('title', `%${escapeLike(q)}%`)

    const { data, error } = await query
    if (error) throw error
    if (seq !== loadSeq) return
    feeds.value = (data ?? []) as DiscoverFeed[]
  } catch {
    if (seq === loadSeq) notifications.error('Failed to load feeds')
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

async function subscribe(feedId: string) {
  actionLoading.value = feedId
  try {
    await feedStore.subscribeFeed(feedId)
    notifications.success('Subscribed!')
  } catch (e) {
    notifications.error(e instanceof Error ? e.message : 'Failed to subscribe')
  } finally {
    actionLoading.value = null
  }
}

async function unsubscribe(feedId: string) {
  actionLoading.value = feedId
  try {
    await feedStore.unsubscribeFeed(feedId)
    notifications.success('Unsubscribed')
  } catch (e) {
    notifications.error(e instanceof Error ? e.message : 'Failed to unsubscribe')
  } finally {
    actionLoading.value = null
  }
}

// One stable subscriber per feed so GroupSelector's prop doesn't change every render.
const subscribers = new Map<string, () => Promise<void>>()
function subscriberFor(feedId: string) {
  let fn = subscribers.get(feedId)
  if (!fn) {
    fn = async () => {
      if (!feedStore.isSubscribed(feedId)) await feedStore.subscribeFeed(feedId)
    }
    subscribers.set(feedId, fn)
  }
  return fn
}

async function fetchPreviewEntries(feedId: string): Promise<PreviewEntry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('title, url, published_at, author')
    .eq('feed_id', feedId)
    .order('published_at', { ascending: false })
    .limit(5)
  if (error) throw error
  return (data ?? []) as PreviewEntry[]
}

async function togglePreview(feedId: string) {
  if (expandedFeedId.value === feedId) {
    expandedFeedId.value = null
    return
  }
  expandedFeedId.value = feedId
  if (previewEntries.value[feedId]) return

  previewLoading.value = feedId
  try {
    let entries = await fetchPreviewEntries(feedId)
    // Never polled yet: fetch on demand so the preview isn't empty.
    if (entries.length === 0) {
      const { error } = await supabase.functions.invoke('fetch-feed-entries', { body: { feed_id: feedId } })
      if (!error) entries = await fetchPreviewEntries(feedId)
    }
    previewEntries.value[feedId] = entries
  } catch {
    previewEntries.value[feedId] = []
  } finally {
    previewLoading.value = null
  }
}

watch(selectedCategory, () => loadFeeds())
watch(searchQuery, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(loadFeeds, 300)
})

onMounted(loadFeeds)
onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-3xl px-4 py-6">
      <PageHeader title="Discover Feeds" />

      <!-- Search -->
      <div class="relative mb-6">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
        <input v-model="searchQuery" type="text" placeholder="Search feeds..." class="input pl-10" />
      </div>

      <!-- Categories -->
      <div class="mb-6 flex flex-wrap gap-2">
        <button
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
          :class="!selectedCategory ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'"
          @click="selectedCategory = null"
        >
          All
        </button>
        <button
          v-for="cat in FEED_CATEGORIES"
          :key="cat.value"
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
          :class="selectedCategory === cat.value ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'"
          @click="selectedCategory = cat.value"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="animate-pulse rounded-lg border p-4">
          <div class="flex items-center gap-3">
            <div class="h-8 w-8 rounded bg-bg-tertiary" />
            <div class="flex-1 space-y-2">
              <div class="h-4 w-1/3 rounded bg-bg-tertiary" />
              <div class="h-3 w-2/3 rounded bg-bg-tertiary" />
            </div>
          </div>
        </div>
      </div>

      <!-- Feed list -->
      <div v-else-if="feeds.length > 0" class="space-y-3">
        <div
          v-for="feed in feeds"
          :key="feed.id"
          class="rounded-lg border transition-colors"
          :class="expandedFeedId === feed.id ? 'bg-bg-secondary/50' : ''"
        >
          <div class="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 cursor-pointer hover:bg-bg-hover transition-colors rounded-lg" @click="togglePreview(feed.id)">
            <ChevronRightIcon class="h-4 w-4 shrink-0 text-text-muted transition-transform" :class="expandedFeedId === feed.id ? 'rotate-90' : ''" />
            <FeedFavicon :src="feed.favicon_url" size="md" />

            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-text-primary truncate">{{ feed.title || feed.url }}</h3>
              <p v-if="feed.description" class="text-sm text-text-muted line-clamp-1">{{ feed.description }}</p>
              <div class="flex items-center gap-1.5 text-xs text-text-muted whitespace-nowrap">
                <span class="capitalize">{{ feed.category.replace('_', ' ') }}</span>
                <span v-if="feed.subscriber_count">&middot; {{ feed.subscriber_count }} {{ feed.subscriber_count === 1 ? 'subscriber' : 'subscribers' }}</span>
              </div>
            </div>

            <!-- Subscribed: unsubscribe button -->
            <button
              v-if="feedStore.isSubscribed(feed.id)"
              class="btn-ghost text-xs text-success shrink-0 hover:text-danger group/sub"
              :disabled="actionLoading === feed.id"
              @click.stop="unsubscribe(feed.id)"
            >
              <LoadingSpinner v-if="actionLoading === feed.id" />
              <template v-else>
                <CheckIcon class="h-4 w-4 group-hover/sub:hidden" />
                <span class="hidden sm:inline group-hover/sub:hidden">Subscribed</span>
                <span class="hidden group-hover/sub:inline text-danger">Unsubscribe</span>
              </template>
            </button>

            <!-- Not subscribed: split button -->
            <div v-else class="relative flex shrink-0" @click.stop>
              <button class="btn-primary text-xs rounded-r-none border-r border-white/20" :disabled="actionLoading === feed.id" @click="subscribe(feed.id)">
                <LoadingSpinner v-if="actionLoading === feed.id" class="text-white" />
                <template v-else>
                  <PlusIcon class="h-4 w-4" />
                  <span class="hidden sm:inline">Subscribe</span>
                </template>
              </button>
              <button
                class="btn-primary text-xs rounded-l-none px-1.5"
                :disabled="actionLoading === feed.id"
                aria-label="Subscribe and add to group"
                @click="groupPickerFeedId = groupPickerFeedId === feed.id ? null : feed.id"
              >
                <ChevronDownIcon class="h-3.5 w-3.5" />
              </button>
              <GroupSelector
                v-if="groupPickerFeedId === feed.id"
                mode="dropdown"
                :feed-id="feed.id"
                :subscribe-first="subscriberFor(feed.id)"
                class="right-0 top-full"
                @close="groupPickerFeedId = null"
              />
            </div>
          </div>

          <!-- Expanded preview -->
          <div v-if="expandedFeedId === feed.id" class="border-t px-4 pb-4 pt-2">
            <div v-if="previewLoading === feed.id" class="space-y-2 pl-8">
              <div v-for="i in 3" :key="i" class="animate-pulse flex items-center gap-3">
                <div class="h-3 w-3/5 rounded bg-bg-tertiary" />
                <div class="h-3 w-16 rounded bg-bg-tertiary ml-auto" />
              </div>
            </div>

            <template v-else-if="previewEntries[feed.id]?.length">
              <p class="text-xs font-medium text-text-muted mb-2 pl-8">Recent entries</p>
              <ul class="space-y-1 pl-8">
                <li v-for="(entry, i) in previewEntries[feed.id]" :key="entry.url ?? i">
                  <a
                    v-if="entry.url"
                    :href="entry.url"
                    :target="ui.openLinksInNewTab ? '_blank' : undefined"
                    rel="noopener noreferrer"
                    class="flex items-baseline gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-bg-hover transition-colors group"
                    @click.stop
                  >
                    <span class="text-sm text-text-primary truncate group-hover:text-accent">{{ entry.title || 'Untitled' }}</span>
                    <span class="shrink-0 text-xs text-text-muted ml-auto">{{ formatTimeAgo(entry.published_at) }}</span>
                  </a>
                  <div v-else class="flex items-baseline gap-3 px-2 py-1.5 -mx-2">
                    <span class="text-sm text-text-primary truncate">{{ entry.title || 'Untitled' }}</span>
                    <span class="shrink-0 text-xs text-text-muted ml-auto">{{ formatTimeAgo(entry.published_at) }}</span>
                  </div>
                </li>
              </ul>
            </template>

            <p v-else class="text-xs text-text-muted pl-8">No entries yet for this feed.</p>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-12">
        <p class="text-text-secondary">No feeds found. Try a different search or category.</p>
      </div>
    </div>
  </div>
</template>
