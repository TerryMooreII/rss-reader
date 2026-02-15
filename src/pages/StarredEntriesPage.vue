<script setup lang="ts">
import { onMounted } from 'vue'
import { useEntryStore } from '@/stores/entries'
import EntryContentArea from '@/components/entries/EntryContentArea.vue'

const entryStore = useEntryStore()

onMounted(() => {
  entryStore.fetchEntries({ type: 'starred', unreadOnly: false })
})
</script>

<template>
  <EntryContentArea title="Starred" />
</template>
