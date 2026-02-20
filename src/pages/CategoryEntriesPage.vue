<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useEntryStore } from '@/stores/entries'
import { useUIStore } from '@/stores/ui'
import { FEED_CATEGORIES } from '@/config/constants'
import EntryContentArea from '@/components/entries/EntryContentArea.vue'

const props = defineProps<{ category: string }>()

const entryStore = useEntryStore()
const ui = useUIStore()

const categoryMeta = computed(() =>
  FEED_CATEGORIES.find((c) => c.value === props.category),
)
const title = computed(() => categoryMeta.value?.label || 'Category')

function loadEntries() {
  entryStore.fetchEntries({ type: 'category', category: props.category, unreadOnly: ui.unreadOnly })
}

onMounted(loadEntries)
watch(() => props.category, loadEntries)
</script>

<template>
  <EntryContentArea :title="title" />
</template>
