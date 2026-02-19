<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { FEED_CATEGORIES } from '@/config/constants'
import { useFeedStore } from '@/stores/feeds'
import { useNotificationStore } from '@/stores/notifications'
import { supabase } from '@/config/supabase'
import { useAuthStore } from '@/stores/auth'
import type { Feed } from '@/types/models'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  CheckIcon,
  RssIcon,
  Bars3Icon,
  ChevronRightIcon,
} from '@heroicons/vue/24/outline'
import { useUIStore } from '@/stores/ui'

const ui = useUIStore()
const feedStore = useFeedStore()
const authStore = useAuthStore()
const notifications = useNotificationStore()

const faviconErrors = ref(new Set<string>())

const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const feeds = ref<(Feed & { subscriber_count?: number })[]>([])
const loading = ref(false)

const actionLoading = ref<string | null>(null)

// Expandable preview state
const expandedFeedId = ref<string | null>(null)
const previewEntries = ref<Record<string, { title: string; url: string | null; published_at: string | null; author: string | null }[]>>({})
const previewLoading = ref<string | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function loadFeeds() {
  loading.value = true
  try {
    let query = supabase
      .from('feeds')
      .select('*')
      .eq('is_private', false)
      .eq('status', 'active')
      .order('subscriber_count', { ascending: false })
      .order('title', { ascending: true })
      .limit(50)

    if (selectedCategory.value) {
      query = query.eq('category', selectedCategory.value)
    }

    if (searchQuery.value.trim()) {
      query = query.ilike('title', `%${searchQuery.value.trim()}%`)
    }

    const { data, error } = await query
    if (error) throw error
    feeds.value = data || []
  } catch (e: any) {
    notifications.error('Failed to load feeds')
  } finally {
    loading.value = false
  }
}

function isSubscribed(feedId: string) {
  return feedStore.feeds.some((f) => f.id === feedId)
}

async function subscribe(feedId: string) {
  actionLoading.value = feedId
  try {
    await feedStore.subscribeFeed(feedId)
    notifications.success('Subscribed!')
  } catch (e: any) {
    notifications.error(e.message || 'Failed to subscribe')
  } finally {
    actionLoading.value = null
  }
}

async function togglePreview(feedId: string) {
  if (expandedFeedId.value === feedId) {
    expandedFeedId.value = null
    return
  }
  expandedFeedId.value = feedId

  // Skip fetch if we already have entries cached
  if (previewEntries.value[feedId]) return

  previewLoading.value = feedId
  try {
    const { data, error } = await supabase
      .from('entries')
      .select('title, url, published_at, author')
      .eq('feed_id', feedId)
      .order('published_at', { ascending: false })
      .limit(5)
    if (error) throw error
    previewEntries.value[feedId] = data || []
  } catch {
    previewEntries.value[feedId] = []
  } finally {
    previewLoading.value = null
  }
}

function previewTimeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

async function unsubscribe(feedId: string) {
  actionLoading.value = feedId
  try {
    await feedStore.unsubscribeFeed(feedId)
    notifications.success('Unsubscribed')
  } catch (e: any) {
    notifications.error(e.message || 'Failed to unsubscribe')
  } finally {
    actionLoading.value = null
  }
}

watch(selectedCategory, () => loadFeeds())

watch(searchQuery, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(loadFeeds, 300)
})

onMounted(loadFeeds)
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-3xl px-4 py-6">
      <div class="flex items-center gap-2 mb-6">
        <button
          class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary md:hidden"
          @click="ui.toggleSidebar()"
        >
          <Bars3Icon class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-text-primary">Discover Feeds</h1>
      </div>

      <!-- Search -->
      <div class="relative mb-6">
        <MagnifyingGlassIcon
          class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search feeds..."
          class="input pl-10"
        />
      </div>

      <!-- Categories -->
      <div class="mb-6 flex flex-wrap gap-2">
        <button
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
          :class="
            !selectedCategory
              ? 'bg-accent text-white'
              : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
          "
          @click="selectedCategory = null"
        >
          All
        </button>
        <button
          v-for="cat in FEED_CATEGORIES"
          :key="cat.value"
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
          :class="
            selectedCategory === cat.value
              ? 'bg-accent text-white'
              : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
          "
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
          <!-- Feed header row -->
          <div
            class="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 cursor-pointer hover:bg-bg-hover transition-colors rounded-lg"
            @click="togglePreview(feed.id)"
          >
            <ChevronRightIcon
              class="h-4 w-4 shrink-0 text-text-muted transition-transform"
              :class="expandedFeedId === feed.id ? 'rotate-90' : ''"
            />
            <img
              v-if="feed.favicon_url && !faviconErrors.has(feed.id)"
              :src="feed.favicon_url"
              alt=""
              class="h-6 w-6 sm:h-8 sm:w-8 rounded shrink-0"
              @error="faviconErrors.add(feed.id)"
            />
            <RssIcon v-else class="h-6 w-6 sm:h-8 sm:w-8 shrink-0 text-text-muted" />

            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-text-primary truncate">
                {{ feed.title || feed.url }}
              </h3>
              <p v-if="feed.description" class="text-sm text-text-muted line-clamp-1">
                {{ feed.description }}
              </p>
              <div class="flex items-center gap-1.5 text-xs text-text-muted whitespace-nowrap">
                <span class="capitalize">{{ feed.category.replace('_', ' ') }}</span>
                <span v-if="feed.subscriber_count">&middot; {{ feed.subscriber_count }} {{ feed.subscriber_count === 1 ? 'subscriber' : 'subscribers' }}</span>
              </div>
            </div>

            <button
              v-if="isSubscribed(feed.id)"
              class="btn-ghost text-xs text-success shrink-0 hover:text-danger group/sub"
              :disabled="actionLoading === feed.id"
              @click.stop="unsubscribe(feed.id)"
            >
              <span v-if="actionLoading === feed.id" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <template v-else>
                <CheckIcon class="h-4 w-4 group-hover/sub:hidden" />
                <span class="hidden sm:inline group-hover/sub:hidden">Subscribed</span>
                <span class="hidden group-hover/sub:inline text-danger">Unsubscribe</span>
              </template>
            </button>
            <button
              v-else
              class="btn-primary text-xs shrink-0"
              :disabled="actionLoading === feed.id"
              @click.stop="subscribe(feed.id)"
            >
              <span v-if="actionLoading === feed.id" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <template v-else>
                <PlusIcon class="h-4 w-4" />
                <span class="hidden sm:inline">Subscribe</span>
              </template>
            </button>
          </div>

          <!-- Expanded preview -->
          <div v-if="expandedFeedId === feed.id" class="border-t px-4 pb-4 pt-2">
            <!-- Loading skeleton -->
            <div v-if="previewLoading === feed.id" class="space-y-2 pl-8">
              <div v-for="i in 3" :key="i" class="animate-pulse flex items-center gap-3">
                <div class="h-3 w-3/5 rounded bg-bg-tertiary" />
                <div class="h-3 w-16 rounded bg-bg-tertiary ml-auto" />
              </div>
            </div>

            <!-- Entries list -->
            <template v-else-if="previewEntries[feed.id]?.length">
              <p class="text-xs font-medium text-text-muted mb-2 pl-8">Recent entries</p>
              <ul class="space-y-1 pl-8">
                <li v-for="(entry, i) in previewEntries[feed.id]" :key="i">
                  <a
                    v-if="entry.url"
                    :href="entry.url"
                    :target="ui.openLinksInNewTab ? '_blank' : undefined"
                    rel="noopener noreferrer"
                    class="flex items-baseline gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-bg-hover transition-colors group"
                    @click.stop
                  >
                    <span class="text-sm text-text-primary truncate group-hover:text-accent">{{ entry.title || 'Untitled' }}</span>
                    <span class="shrink-0 text-xs text-text-muted ml-auto">{{ previewTimeAgo(entry.published_at) }}</span>
                  </a>
                  <div v-else class="flex items-baseline gap-3 px-2 py-1.5 -mx-2">
                    <span class="text-sm text-text-primary truncate">{{ entry.title || 'Untitled' }}</span>
                    <span class="shrink-0 text-xs text-text-muted ml-auto">{{ previewTimeAgo(entry.published_at) }}</span>
                  </div>
                </li>
              </ul>
            </template>

            <!-- No entries -->
            <p v-else class="text-xs text-text-muted pl-8">No entries yet for this feed.</p>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12">
        <p class="text-text-secondary">No feeds found. Try a different search or category.</p>
      </div>
    </div>
  </div>
</template>
