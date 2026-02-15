<script setup lang="ts">
import { ref } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useEntryStore } from '@/stores/entries'
import EntryListHeader from './EntryListHeader.vue'
import EntryList from './EntryList.vue'
import EntryReader from '@/components/reader/EntryReader.vue'

defineProps<{ title: string }>()

const ui = useUIStore()
const entryStore = useEntryStore()

const dragging = ref(false)

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
      class="flex flex-col border-r border-border shrink-0"
      :class="ui.readerOpen ? 'hidden md:flex' : 'flex-1'"
      :style="ui.readerOpen ? { width: ui.listWidth + 'px' } : undefined"
    >
      <EntryListHeader :title="title" />
      <EntryList />
    </div>

    <!-- Resize handle (desktop only, when reader is open) -->
    <div
      v-if="ui.readerOpen"
      class="hidden md:flex w-1 shrink-0 cursor-col-resize items-center justify-center
        hover:bg-accent/20 active:bg-accent/30 transition-colors"
      :class="dragging ? 'bg-accent/30' : ''"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />

    <!-- Reader pane (desktop) -->
    <div v-if="ui.readerOpen" class="flex-1 hidden md:block min-w-0">
      <EntryReader />
    </div>

    <!-- Reader overlay (mobile) -->
    <Teleport to="body">
      <Transition name="slide-right">
        <div
          v-if="ui.readerOpen && entryStore.selectedEntry"
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
