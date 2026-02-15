<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useEntryStore } from '@/stores/entries'
import { useFeedStore } from '@/stores/feeds'
import EntryContentArea from '@/components/entries/EntryContentArea.vue'

const props = defineProps<{ feedId: string }>()

const entryStore = useEntryStore()
const feedStore = useFeedStore()

const feed = computed(() => feedStore.feedById(props.feedId))
const title = computed(() => feed.value?.custom_title || feed.value?.title || 'Feed')

function loadEntries() {
  entryStore.fetchEntries({ type: 'feed', feedId: props.feedId, unreadOnly: false })
}

onMounted(loadEntries)
watch(() => props.feedId, loadEntries)
</script>

<template>
  <EntryContentArea :title="title" />
</template>
