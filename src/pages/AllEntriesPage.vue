<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useEntryStore } from '@/stores/entries'
import { useFeedStore } from '@/stores/feeds'
import EntryContentArea from '@/components/entries/EntryContentArea.vue'

const entryStore = useEntryStore()
const feedStore = useFeedStore()

onMounted(() => {
  entryStore.fetchEntries({ type: 'all', unreadOnly: false })
})

// Re-fetch when feeds change (e.g., after initial load)
watch(
  () => feedStore.feeds.length,
  (len, oldLen) => {
    if (len > 0 && oldLen === 0) {
      entryStore.fetchEntries({ type: 'all', unreadOnly: false })
    }
  },
)
</script>

<template>
  <EntryContentArea title="All" />
</template>
