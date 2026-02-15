<script setup lang="ts">
import { useEntryStore } from '@/stores/entries'
import { useUIStore } from '@/stores/ui'
import { CheckIcon, Bars3BottomLeftIcon, Squares2X2Icon, Bars3Icon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  title: string
}>()

const entryStore = useEntryStore()
const ui = useUIStore()

function toggleUnreadFilter() {
  const newFilter = { ...entryStore.filter, unreadOnly: !entryStore.filter.unreadOnly }
  entryStore.fetchEntries(newFilter)
}
</script>

<template>
  <div class="flex h-12 items-center justify-between border-b px-4 shrink-0">
    <div class="flex items-center gap-2">
      <button
        class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary md:hidden"
        @click="ui.toggleSidebar()"
      >
        <Bars3Icon class="h-5 w-5" />
      </button>
      <h1 class="text-lg font-semibold text-text-primary">{{ title }}</h1>
    </div>

    <div class="flex items-center gap-2">
      <!-- Unread / All toggle -->
      <div class="flex rounded-lg bg-bg-secondary p-0.5 text-xs">
        <button
          class="rounded-md px-2.5 py-1 font-medium transition-colors"
          :class="
            entryStore.filter.unreadOnly
              ? 'bg-bg-primary text-text-primary shadow-sm'
              : 'text-text-secondary'
          "
          @click="!entryStore.filter.unreadOnly && toggleUnreadFilter()"
        >
          Unread
        </button>
        <button
          class="rounded-md px-2.5 py-1 font-medium transition-colors"
          :class="
            !entryStore.filter.unreadOnly
              ? 'bg-bg-primary text-text-primary shadow-sm'
              : 'text-text-secondary'
          "
          @click="entryStore.filter.unreadOnly && toggleUnreadFilter()"
        >
          All
        </button>
      </div>

      <!-- Mark all read -->
      <button
        class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        title="Mark all as read"
        @click="entryStore.markAllRead()"
      >
        <CheckIcon class="h-4 w-4" />
      </button>

      <!-- Display mode toggle -->
      <button
        class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary"
        title="Toggle display mode"
        @click="ui.setDisplayMode(ui.displayMode === 'comfortable' ? 'compact' : 'comfortable')"
      >
        <Bars3BottomLeftIcon v-if="ui.displayMode === 'comfortable'" class="h-4 w-4" />
        <Squares2X2Icon v-else class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
