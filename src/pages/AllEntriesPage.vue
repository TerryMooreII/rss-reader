<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useEntryStore } from '@/stores/entries'
import { useFeedStore } from '@/stores/feeds'
import { useUIStore } from '@/stores/ui'
import EntryContentArea from '@/components/entries/EntryContentArea.vue'

const entryStore = useEntryStore()
const feedStore = useFeedStore()
const ui = useUIStore()

onMounted(() => {
  entryStore.fetchEntries({ type: 'all', unreadOnly: ui.unreadOnly })
})

// Re-fetch when feeds change (e.g., after initial load)
watch(
  () => feedStore.feeds.length,
  (len, oldLen) => {
    if (len > 0 && oldLen === 0) {
      entryStore.fetchEntries({ type: 'all', unreadOnly: ui.unreadOnly })
    }
  },
)
</script>

<template>
  <EntryContentArea title="All" />
</template>
