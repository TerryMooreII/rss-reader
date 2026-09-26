<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useEntryStore } from '@/stores/entries'
import { useSwipe } from '@/composables/useSwipe'
import { useBreakpoint } from '@/composables/useBreakpoint'
import EntryListHeader from './EntryListHeader.vue'
import EntryList from './EntryList.vue'
import EntryReader from '@/components/reader/EntryReader.vue'

defineProps<{ title: string }>()

const ui = useUIStore()
const entryStore = useEntryStore()
const { isMobile } = useBreakpoint()

const dragging = ref(false)
const mobileReaderRef = ref<HTMLElement | null>(null)

useSwipe({
  target: mobileReaderRef,
  direction: 'right',
  onSwipe: () => ui.closeReader(),
})

const isFeedMode = computed(() => ui.displayMode === 'feed')
const showReader = computed(() => ui.readerOpen && !isFeedMode.value)
// Exactly one reader instance exists at a time: a pane on desktop, an overlay on mobile.
const showDesktopReader = computed(() => showReader.value && !isMobile.value)
const showMobileReader = computed(() => showReader.value && isMobile.value && !!entryStore.selectedEntry)

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const container = (e.currentTarget as HTMLElement).parentElement!
  ui.setListWidth(e.clientX - container.getBoundingClientRect().left)
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
      :style="showDesktopReader ? { width: ui.listWidth + 'px' } : undefined"
    >
      <EntryListHeader :title="title" />
      <EntryList />
    </div>

    <!-- Resize handle -->
    <div
      v-if="showDesktopReader"
      class="flex w-1 shrink-0 cursor-col-resize items-center justify-center hover:bg-accent/20 active:bg-accent/30 transition-colors"
      :class="dragging ? 'bg-accent/30' : ''"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />

    <!-- Reader pane (desktop) -->
    <div v-if="showDesktopReader" class="flex-1 min-w-0">
      <EntryReader />
    </div>

    <!-- Reader overlay (mobile) -->
    <Teleport to="body">
      <Transition name="slide-right">
        <div v-if="showMobileReader" ref="mobileReaderRef" class="fixed inset-0 z-50 bg-bg-primary">
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
