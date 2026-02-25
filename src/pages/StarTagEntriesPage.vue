<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useEntryStore } from '@/stores/entries'
import { useStarTagStore } from '@/stores/starTags'
import EntryContentArea from '@/components/entries/EntryContentArea.vue'

const props = defineProps<{
  starTagId: string
}>()

const entryStore = useEntryStore()
const starTagStore = useStarTagStore()

const tagName = computed(() => starTagStore.tagById(props.starTagId)?.name ?? 'Tagged')

function load() {
  entryStore.fetchEntries({ type: 'star_tag', starTagId: props.starTagId, unreadOnly: false })
}

onMounted(load)
watch(() => props.starTagId, load)
</script>

<template>
  <EntryContentArea :title="tagName" />
</template>
