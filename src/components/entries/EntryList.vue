<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useEntryStore } from '@/stores/entries'
import { useUIStore } from '@/stores/ui'
import EntryListItem from './EntryListItem.vue'
import EntryListItemCozy from './EntryListItemCozy.vue'
import EntryListItemFeed from './EntryListItemFeed.vue'

const entryStore = useEntryStore()
const ui = useUIStore()

const scrollContainer = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// Track which entry is expanded in feed mode
const expandedEntryId = ref<string | null>(null)

const isFeedMode = computed(() => ui.displayMode === 'feed')

const component = computed(() => {
  if (ui.displayMode === 'compact') return EntryListItem
  if (ui.displayMode === 'feed') return EntryListItemFeed
  return EntryListItemCozy
})

function handleEntryClick(entryId: string) {
  if (isFeedMode.value) {
    // Toggle expand/collapse in feed mode
    expandedEntryId.value = expandedEntryId.value === entryId ? null : entryId
  } else {
    entryStore.selectEntry(entryId)
  }
}

function handleIntersect(entries: IntersectionObserverEntry[]) {
  if (entries[0]?.isIntersecting && entryStore.hasMore && !entryStore.loadingMore) {
    entryStore.fetchMore()
  }
}

onMounted(() => {
  if (sentinel.value) {
    observer = new IntersectionObserver(handleIntersect, {
      root: scrollContainer.value,
      rootMargin: '0px 0px 200px 0px',
    })
    observer.observe(sentinel.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})

// Re-observe when entries change (sentinel might have moved)
watch(
  () => entryStore.entries.length,
  () => {
    if (sentinel.value && observer) {
      observer.disconnect()
      observer.observe(sentinel.value)
    }
  },
)

// Reset expanded entry when switching modes or filters
watch(() => ui.displayMode, () => {
  expandedEntryId.value = null
})
watch(() => entryStore.filter, () => {
  expandedEntryId.value = null
})
</script>

<template>
  <div ref="scrollContainer" class="flex-1 overflow-y-auto">
    <!-- Empty state -->
    <div
      v-if="!entryStore.loading && entryStore.entries.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <p class="text-lg font-medium text-text-secondary">No entries found</p>
      <p class="mt-1 text-sm text-text-muted">
        {{
          entryStore.filter.unreadOnly
            ? 'All caught up! Switch to "All" to see read entries.'
            : 'Subscribe to feeds to start reading.'
        }}
      </p>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="entryStore.loading">
      <!-- Feed mode skeleton -->
      <div v-if="isFeedMode" class="mx-auto max-w-2xl">
        <div v-for="i in 6" :key="i" class="animate-pulse border-b border-border px-4 py-4">
          <!-- Header: favicon + feed name + time -->
          <div class="flex items-center gap-2 mb-2">
            <div class="h-5 w-5 shrink-0 rounded bg-bg-tertiary" />
            <div class="h-3 w-24 rounded bg-bg-tertiary" />
            <div class="ml-auto h-3 w-12 rounded bg-bg-tertiary" />
          </div>
          <!-- Title -->
          <div class="h-4 w-3/4 rounded bg-bg-tertiary mb-2" />
          <!-- Excerpt + thumbnail -->
          <div class="flex gap-3">
            <div class="flex-1 space-y-2">
              <div class="h-3 w-full rounded bg-bg-tertiary" />
              <div class="h-3 w-full rounded bg-bg-tertiary" />
              <div class="h-3 w-2/3 rounded bg-bg-tertiary" />
            </div>
            <div class="h-20 w-28 shrink-0 rounded-lg bg-bg-tertiary" />
          </div>
        </div>
      </div>

      <!-- Compact / Cozy skeleton -->
      <div v-else>
        <div v-for="i in 10" :key="i" class="animate-pulse border-b px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="h-4 w-4 rounded bg-bg-tertiary" />
            <div class="h-4 flex-1 rounded bg-bg-tertiary" />
            <div class="h-3 w-12 rounded bg-bg-tertiary" />
          </div>
        </div>
      </div>
    </div>

    <!-- Entry list -->
    <div v-else :class="isFeedMode ? 'mx-auto max-w-2xl' : ''">
      <!-- Feed mode -->
      <template v-if="isFeedMode">
        <EntryListItemFeed
          v-for="entry in entryStore.entries"
          :key="entry.id"
          :entry="entry"
          :expanded="entry.id === expandedEntryId"
          :data-entry-id="entry.id"
          @click="handleEntryClick(entry.id)"
        />
      </template>

      <!-- Compact / Comfortable modes -->
      <template v-else>
        <component
          :is="component"
          v-for="entry in entryStore.entries"
          :key="entry.id"
          :entry="entry"
          :selected="entry.id === entryStore.selectedEntryId"
          :data-entry-id="entry.id"
          @click="handleEntryClick(entry.id)"
        />
      </template>
    </div>

    <!-- Infinite scroll sentinel -->
    <div ref="sentinel" class="h-px" />

    <!-- Loading more indicator -->
    <div v-if="entryStore.loadingMore" class="flex justify-center py-4">
      <div class="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  </div>
</template>
