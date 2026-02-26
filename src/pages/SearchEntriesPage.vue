<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useEntryStore } from '@/stores/entries'
import { useUIStore } from '@/stores/ui'
import EntryContentArea from '@/components/entries/EntryContentArea.vue'

const route = useRoute()
const entryStore = useEntryStore()
const ui = useUIStore()

function loadFromQuery() {
  const q = (route.query.q as string) || ''
  const scope = (route.query.scope as 'subscribed' | 'all') || 'subscribed'

  // Sync UI store state so SearchBar reflects the URL
  ui.searchQuery = q
  ui.searchScope = scope
  ui.openSearch()

  if (q.trim()) {
    entryStore.fetchEntries({
      type: 'search',
      query: q.trim(),
      scope,
      unreadOnly: false,
    })
  }
}

onMounted(loadFromQuery)

// Re-fetch when query params change (e.g. new search from SearchBar)
watch(
  () => route.query,
  () => {
    if (route.name === 'search-entries') {
      loadFromQuery()
    }
  },
)
</script>

<template>
  <EntryContentArea title="Search" />
</template>
