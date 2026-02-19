<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useEntryStore } from '@/stores/entries'
import EntryListHeader from './EntryListHeader.vue'
import EntryList from './EntryList.vue'
import EntryReader from '@/components/reader/EntryReader.vue'

defineProps<{ title: string }>()

const ui = useUIStore()
const entryStore = useEntryStore()

const dragging = ref(false)

const isFeedMode = computed(() => ui.displayMode === 'feed')
const showReader = computed(() => ui.readerOpen && !isFeedMode.value)

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  // Get the left edge of the flex container (the parent of the list pane)
  const container = (e.currentTarget as HTMLElement).parentElement!
  const containerRect = container.getBoundingClientRect()
  const newWidth = e.clientX - containerRect.left
  ui.setListWidth(newWidth)
}

function onPointerUp() {
  dragging.value = false
}
</script>

<template>
  <div class="flex h-full overflow-hidden">
    <!-- Entry list pane -->
    <div
      class="flex flex-col shrink-0 min-w-0"
      :class="[
        showReader ? 'hidden md:flex border-r border-border' : 'flex-1',
        !isFeedMode ? 'border-r border-border' : '',
      ]"
      :style="showReader ? { width: ui.listWidth + 'px' } : undefined"
    >
      <EntryListHeader :title="title" />
      <EntryList />
    </div>

    <!-- Resize handle (desktop only, when reader is open, not in feed mode) -->
    <div
      v-if="showReader"
      class="hidden md:flex w-1 shrink-0 cursor-col-resize items-center justify-center
        hover:bg-accent/20 active:bg-accent/30 transition-colors"
      :class="dragging ? 'bg-accent/30' : ''"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />

    <!-- Reader pane (desktop, not in feed mode) -->
    <div v-if="showReader" class="flex-1 hidden md:block min-w-0">
      <EntryReader />
    </div>

    <!-- Reader overlay (mobile, not in feed mode) -->
    <Teleport to="body">
      <Transition name="slide-right">
        <div
          v-if="showReader && entryStore.selectedEntry"
          class="fixed inset-0 z-50 bg-bg-primary md:hidden"
        >
          <EntryReader />
        </div>
      </Transition>
    </Teleport>
  </div>

  <!-- Prevent text selection while dragging -->
  <Teleport to="body">
    <div v-if="dragging" class="fixed inset-0 z-[9999] cursor-col-resize" />
  </Teleport>
</template>
