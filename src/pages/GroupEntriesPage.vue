<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useEntryStore } from '@/stores/entries'
import { useGroupStore } from '@/stores/groups'
import { useUIStore } from '@/stores/ui'
import EntryContentArea from '@/components/entries/EntryContentArea.vue'

const props = defineProps<{ groupId: string }>()

const entryStore = useEntryStore()
const groupStore = useGroupStore()
const ui = useUIStore()

const group = computed(() => groupStore.groupById(props.groupId))
const title = computed(() => group.value?.name || 'Group')

function loadEntries() {
  entryStore.fetchEntries({ type: 'group', groupId: props.groupId, unreadOnly: ui.unreadOnly })
}

onMounted(loadEntries)
watch(() => props.groupId, loadEntries)
</script>

<template>
  <EntryContentArea :title="title" />
</template>
