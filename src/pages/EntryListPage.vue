<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { EntryFilter } from '@/types/models'
import { useEntryStore } from '@/stores/entries'
import { useFeedStore } from '@/stores/feeds'
import { useGroupStore } from '@/stores/groups'
import { useStarTagStore } from '@/stores/starTags'
import { useUIStore } from '@/stores/ui'
import { useAppReady } from '@/composables/useAppReady'
import { FEED_CATEGORIES } from '@/config/constants'
import EntryContentArea from '@/components/entries/EntryContentArea.vue'

/**
 * One page for every entry list. The route's `meta.filterType` picks the
 * list; params / query supply the rest. Staying on one component means the
 * list, reader and their observers survive switching between feeds/groups.
 */
const route = useRoute()
const entryStore = useEntryStore()
const feedStore = useFeedStore()
const groupStore = useGroupStore()
const starTagStore = useStarTagStore()
const ui = useUIStore()
const { ready } = useAppReady()

const filter = computed<EntryFilter | null>(() => {
  const p = route.params as Record<string, string | undefined>
  switch (route.meta.filterType) {
    case 'feed':
      return p.feedId ? { type: 'feed', feedId: p.feedId, unreadOnly: ui.unreadOnly } : null
    case 'group':
      return p.groupId ? { type: 'group', groupId: p.groupId, unreadOnly: ui.unreadOnly } : null
    case 'category':
      return p.category ? { type: 'category', category: p.category, unreadOnly: ui.unreadOnly } : null
    case 'starred':
      return { type: 'starred', unreadOnly: false }
    case 'star_tag':
      return p.starTagId ? { type: 'star_tag', starTagId: p.starTagId, unreadOnly: false } : null
    case 'search': {
      const query = ((route.query.q as string) || '').trim()
      const scope = (route.query.scope as 'subscribed' | 'all') || 'subscribed'
      return query ? { type: 'search', query, scope, unreadOnly: false } : null
    }
    case 'all':
    default:
      return { type: 'all', unreadOnly: ui.unreadOnly }
  }
})

const title = computed(() => {
  const f = filter.value
  switch (f?.type) {
    case 'feed': {
      const feed = feedStore.feedById(f.feedId)
      return feed?.custom_title || feed?.title || 'Feed'
    }
    case 'group':
      return groupStore.groupById(f.groupId)?.name || 'Group'
    case 'category':
      return FEED_CATEGORIES.find((c) => c.value === f.category)?.label || 'Category'
    case 'starred':
      return 'Starred'
    case 'star_tag':
      return starTagStore.tagById(f.starTagId)?.name || 'Tagged'
    case 'search':
      return 'Search'
    default:
      return 'All'
  }
})

// Fetch once the sidebar data and settings are in, then on every filter change
// (route params, search query, or the unread toggle from settings sync).
watch(
  [ready, () => JSON.stringify(filter.value)],
  ([isReady]) => {
    const f = filter.value
    if (f?.type === 'search') {
      // Keep the search bar in sync with the URL (back/forward, shared links).
      ui.searchQuery = f.query
      ui.searchScope = f.scope
      ui.openSearch()
    }
    if (isReady && f) entryStore.fetchEntries(f)
  },
  { immediate: true },
)
</script>

<template>
  <EntryContentArea :title="title" />
</template>
