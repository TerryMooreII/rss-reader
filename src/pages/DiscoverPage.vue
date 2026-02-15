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
  try {
    await feedStore.subscribeFeed(feedId)
    notifications.success('Subscribed!')
  } catch (e: any) {
    notifications.error(e.message || 'Failed to subscribe')
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
          class="flex items-center gap-4 rounded-lg border p-4 hover:bg-bg-hover transition-colors"
        >
          <img
            v-if="feed.favicon_url && !faviconErrors.has(feed.id)"
            :src="feed.favicon_url"
            alt=""
            class="h-8 w-8 rounded shrink-0"
            @error="faviconErrors.add(feed.id)"
          />
          <RssIcon v-else class="h-8 w-8 shrink-0 text-text-muted" />

          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-text-primary truncate">
              {{ feed.title || feed.url }}
            </h3>
            <p v-if="feed.description" class="text-sm text-text-muted line-clamp-1">
              {{ feed.description }}
            </p>
            <div class="flex items-center gap-2 text-xs text-text-muted">
              <span class="capitalize">{{ feed.category.replace('_', ' ') }}</span>
              <span v-if="feed.subscriber_count" class="text-text-muted">&middot; {{ feed.subscriber_count }} {{ feed.subscriber_count === 1 ? 'subscriber' : 'subscribers' }}</span>
            </div>
          </div>

          <button
            v-if="isSubscribed(feed.id)"
            class="btn-ghost text-xs text-success shrink-0"
            disabled
          >
            <CheckIcon class="h-4 w-4" />
            Subscribed
          </button>
          <button v-else class="btn-primary text-xs shrink-0" @click="subscribe(feed.id)">
            <PlusIcon class="h-4 w-4" />
            Subscribe
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12">
        <p class="text-text-secondary">No feeds found. Try a different search or category.</p>
      </div>
    </div>
  </div>
</template>
