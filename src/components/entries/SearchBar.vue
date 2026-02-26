<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

const ui = useUIStore()
const router = useRouter()
const route = useRoute()

const inputRef = ref<HTMLInputElement | null>(null)
const helpBtnRef = ref<{ el: HTMLElement; $el?: HTMLElement } | null>(null)
const localQuery = ref(ui.searchQuery)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const helpPanelStyle = computed(() => {
  const el = helpBtnRef.value?.el ?? helpBtnRef.value?.$el
  if (!el) return {}
  const rect = el.getBoundingClientRect()
  return {
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
})

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

watch(localQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)

  if (!val.trim()) return

  debounceTimer = setTimeout(() => {
    ui.searchQuery = val.trim()
    navigateToSearch()
  }, 500)
})

function navigateToSearch() {
  const query = ui.searchQuery.trim()
  if (!query) return

  router.push({
    name: 'search-entries',
    query: { q: query, scope: ui.searchScope },
  })
}

function handleSubmit() {
  if (debounceTimer) clearTimeout(debounceTimer)
  ui.searchQuery = localQuery.value.trim()
  navigateToSearch()
}

function handleScopeToggle() {
  ui.setSearchScope(ui.searchScope === 'subscribed' ? 'all' : 'subscribed')
  if (ui.searchQuery.trim()) {
    navigateToSearch()
  }
}

function handleClose() {
  if (ui.preSearchRoute && route.fullPath !== ui.preSearchRoute) {
    router.push(ui.preSearchRoute)
  }
  ui.closeSearch()
}
</script>

<template>
  <div class="flex items-center gap-2 px-4 h-14 md:border-b">
    <!-- Back button -->
    <button
      class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary shrink-0"
      aria-label="Close search"
      @click="handleClose"
    >
      <ArrowLeftIcon class="h-5 w-5" />
    </button>

    <!-- Search input group: input + scope toggle -->
    <div class="flex flex-1 min-w-0 rounded-lg border border-border bg-bg-secondary focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent">
      <!-- Input -->
      <div class="relative flex-1 min-w-0">
        <MagnifyingGlassIcon
          class="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          ref="inputRef"
          v-model="localQuery"
          type="search"
          placeholder="Search entries..."
          class="w-full bg-transparent pl-9 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          @keydown.enter.prevent="handleSubmit"
          @keydown.escape="handleClose"
        />
      </div>

      <!-- Scope toggle (right side of input) -->
      <button
        class="shrink-0 flex items-center gap-1 px-2.5 text-xs font-medium whitespace-nowrap border-l border-border transition-colors rounded-r-lg"
        :class="
          ui.searchScope === 'all'
            ? 'bg-accent/10 text-accent'
            : 'text-text-secondary hover:bg-bg-hover'
        "
        :aria-label="`Search scope: ${ui.searchScope === 'all' ? 'All Feeds' : 'My Feeds'}. Click to toggle.`"
        @click="handleScopeToggle"
      >
        {{ ui.searchScope === 'all' ? 'All Feeds' : 'My Feeds' }}
      </button>
    </div>

    <!-- Help tooltip -->
    <Popover v-slot="{ open }" class="relative shrink-0">
      <PopoverButton
        ref="helpBtnRef"
        class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary focus:outline-none"
        aria-label="Search help"
      >
        <QuestionMarkCircleIcon class="h-4 w-4" />
      </PopoverButton>
      <Teleport to="body">
        <PopoverPanel
          v-if="open"
          static
          class="fixed z-50 w-64 rounded-lg border border-border bg-bg-primary p-3 shadow-lg"
          :style="helpPanelStyle"
        >
          <p class="text-xs font-semibold text-text-primary mb-2">Search tips</p>
          <ul class="space-y-1.5 text-xs text-text-secondary">
            <li><code class="text-text-primary bg-bg-secondary px-1 rounded">word1 word2</code> match both (AND)</li>
            <li><code class="text-text-primary bg-bg-secondary px-1 rounded">word1 OR word2</code> match either</li>
            <li><code class="text-text-primary bg-bg-secondary px-1 rounded">"exact phrase"</code> exact match</li>
            <li><code class="text-text-primary bg-bg-secondary px-1 rounded">-word</code> exclude word</li>
          </ul>
        </PopoverPanel>
      </Teleport>
    </Popover>

    <!-- Close button (desktop) -->
    <button
      class="hidden md:flex rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary shrink-0"
      aria-label="Close search"
      @click="handleClose"
    >
      <XMarkIcon class="h-4 w-4" />
    </button>
  </div>
</template>
