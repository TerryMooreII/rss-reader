<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useEntryStore } from '@/stores/entries'
import { useUIStore } from '@/stores/ui'
import {
  CheckIcon,
  Bars3BottomLeftIcon,
  Squares2X2Icon,
  NewspaperIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'

/** The header's controls: search, unread toggle, mark read, display mode. */
withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const entryStore = useEntryStore()
const ui = useUIStore()
const route = useRoute()
const { run } = useAsyncAction()

const unreadOptions = [
  { value: 'unread', label: 'Unread' },
  { value: 'all', label: 'All' },
]
const unreadValue = computed({
  get: () => (ui.unreadOnly ? 'unread' : 'all'),
  set: (v: string) => {
    const unreadOnly = v === 'unread'
    ui.setUnreadOnly(unreadOnly)
    entryStore.setUnreadOnly(unreadOnly)
  },
})

const markReadLabel = computed(() => {
  switch (entryStore.filter.type) {
    case 'feed':
      return 'Mark Feed Read'
    case 'group':
      return 'Mark Group Read'
    case 'category':
      return 'Mark Category Read'
    default:
      return 'Mark All Read'
  }
})

const displayModeIcon = computed(() => {
  if (ui.displayMode === 'comfortable') return Bars3BottomLeftIcon
  if (ui.displayMode === 'compact') return Squares2X2Icon
  return NewspaperIcon
})

const displayModeOrder = ['comfortable', 'compact', 'feed'] as const
function cycleDisplayMode() {
  const i = displayModeOrder.indexOf(ui.displayMode)
  ui.setDisplayMode(displayModeOrder[(i + 1) % displayModeOrder.length]!)
}

function openSearch() {
  ui.setPreSearchRoute(route.fullPath)
  ui.openSearch()
}

function markAllRead() {
  run(() => entryStore.markAllRead(), { error: 'Failed to mark entries as read' })
}
</script>

<template>
  <div class="flex items-center" :class="compact ? 'w-full justify-between' : 'gap-2'">
    <button v-if="!compact" class="btn-toolbar" aria-label="Search entries (press /)" @click="openSearch">
      <MagnifyingGlassIcon class="h-4 w-4" />
    </button>

    <SegmentedControl
      v-if="entryStore.supportsUnreadToggle"
      v-model="unreadValue"
      :options="unreadOptions"
      label="Filter entries"
    />
    <span v-else />

    <div class="flex items-center" :class="compact ? 'gap-1' : 'gap-2'">
      <button v-if="compact" class="btn-toolbar" aria-label="Search entries" @click="openSearch">
        <MagnifyingGlassIcon class="h-4 w-4" />
      </button>

      <button
        v-if="entryStore.supportsMarkAllRead"
        class="btn-toolbar"
        :aria-label="markReadLabel"
        :disabled="entryStore.markingAllRead"
        @click="markAllRead"
      >
        <ArrowPathIcon v-if="entryStore.markingAllRead" class="h-4 w-4 animate-spin" />
        <CheckIcon v-else class="h-4 w-4" />
        <span>{{ entryStore.markingAllRead ? 'Marking…' : markReadLabel }}</span>
      </button>

      <button
        class="btn-toolbar"
        :aria-label="`Display mode: ${ui.displayMode}. Click to change.`"
        @click="cycleDisplayMode"
      >
        <component :is="displayModeIcon" class="h-4 w-4" />
        <span class="capitalize">{{ ui.displayMode }}</span>
      </button>
    </div>
  </div>
</template>
