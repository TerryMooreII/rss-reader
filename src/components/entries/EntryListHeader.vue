<script setup lang="ts">
import { computed } from 'vue'
import { useEntryStore } from '@/stores/entries'
import { useUIStore } from '@/stores/ui'
import { CheckIcon, Bars3BottomLeftIcon, Squares2X2Icon, Bars3Icon, NewspaperIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  title: string
}>()

const entryStore = useEntryStore()
const ui = useUIStore()

const markReadLabel = computed(() => {
  switch (entryStore.filter.type) {
    case 'feed': return 'Mark Feed Read'
    case 'group': return 'Mark Group Read'
    case 'category': return 'Mark Category Read'
    default: return 'Mark All Read'
  }
})

function toggleUnreadFilter() {
  const newFilter = { ...entryStore.filter, unreadOnly: !entryStore.filter.unreadOnly }
  entryStore.fetchEntries(newFilter)
}

const displayModeOrder: Array<'comfortable' | 'compact' | 'feed'> = ['comfortable', 'compact', 'feed']
function cycleDisplayMode() {
  const currentIndex = displayModeOrder.indexOf(ui.displayMode)
  const nextIndex = (currentIndex + 1) % displayModeOrder.length
  ui.setDisplayMode(displayModeOrder[nextIndex]!)
}
</script>

<template>
  <div class="shrink-0 border-b overflow-hidden">
    <!-- Single row on desktop, two rows on mobile -->
    <div class="flex items-center justify-between px-4 h-14 md:h-14">
      <!-- Left: hamburger + title -->
      <div class="flex items-center gap-2 min-w-0">
        <button
          class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary md:hidden shrink-0"
          aria-label="Toggle sidebar"
          @click="ui.toggleSidebar()"
        >
          <Bars3Icon class="h-5 w-5" />
        </button>
        <h1 class="text-lg font-semibold text-text-primary truncate">{{ title }}</h1>
      </div>

      <!-- Right: action buttons (desktop only, inline) -->
      <div class="hidden md:flex items-center gap-2">
        <!-- Unread / All toggle -->
        <div class="flex rounded-lg bg-bg-secondary p-0.5 text-xs" role="group" aria-label="Filter entries">
          <button
            class="rounded-md px-2.5 py-1 font-medium transition-colors"
            :class="
              entryStore.filter.unreadOnly
                ? 'bg-bg-primary text-text-primary shadow-sm'
                : 'text-text-secondary'
            "
            :aria-pressed="entryStore.filter.unreadOnly"
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
            :aria-pressed="!entryStore.filter.unreadOnly"
            @click="entryStore.filter.unreadOnly && toggleUnreadFilter()"
          >
            All
          </button>
        </div>

        <!-- Mark all read -->
        <button
          class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-bg-hover hover:text-text-primary"
          :aria-label="markReadLabel"
          @click="entryStore.markAllRead()"
        >
          <CheckIcon class="h-4 w-4" />
          <span>{{ markReadLabel }}</span>
        </button>

        <!-- Display mode toggle -->
        <button
          class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-bg-hover hover:text-text-primary"
          :aria-label="`Display mode: ${ui.displayMode}. Click to change.`"
          @click="cycleDisplayMode"
        >
          <Bars3BottomLeftIcon v-if="ui.displayMode === 'comfortable'" class="h-4 w-4" />
          <Squares2X2Icon v-else-if="ui.displayMode === 'compact'" class="h-4 w-4" />
          <NewspaperIcon v-else class="h-4 w-4" />
          <span class="capitalize">{{ ui.displayMode }}</span>
        </button>
      </div>
    </div>

    <!-- Second row: action buttons (mobile only) -->
    <div class="flex items-center justify-between px-4 pb-2 md:hidden">
      <!-- Unread / All toggle -->
      <div class="flex rounded-lg bg-bg-secondary p-0.5 text-xs" role="group" aria-label="Filter entries">
        <button
          class="rounded-md px-2.5 py-1 font-medium transition-colors"
          :class="
            entryStore.filter.unreadOnly
              ? 'bg-bg-primary text-text-primary shadow-sm'
              : 'text-text-secondary'
          "
          :aria-pressed="entryStore.filter.unreadOnly"
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
          :aria-pressed="!entryStore.filter.unreadOnly"
          @click="entryStore.filter.unreadOnly && toggleUnreadFilter()"
        >
          All
        </button>
      </div>

      <div class="flex items-center gap-1">
        <!-- Mark all read -->
        <button
          class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-bg-hover hover:text-text-primary"
          :aria-label="markReadLabel"
          @click="entryStore.markAllRead()"
        >
          <CheckIcon class="h-4 w-4" />
          <span>{{ markReadLabel }}</span>
        </button>

        <!-- Display mode toggle -->
        <button
          class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-text-muted hover:bg-bg-hover hover:text-text-primary"
          :aria-label="`Display mode: ${ui.displayMode}. Click to change.`"
          @click="cycleDisplayMode"
        >
          <Bars3BottomLeftIcon v-if="ui.displayMode === 'comfortable'" class="h-4 w-4" />
          <Squares2X2Icon v-else-if="ui.displayMode === 'compact'" class="h-4 w-4" />
          <NewspaperIcon v-else class="h-4 w-4" />
          <span class="capitalize">{{ ui.displayMode }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
