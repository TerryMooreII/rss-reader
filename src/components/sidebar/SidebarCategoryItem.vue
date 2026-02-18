<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import type { Component } from 'vue'
import {
  ChevronRightIcon,
  EllipsisVerticalIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'
import { useEntryStore } from '@/stores/entries'
import { useNotificationStore } from '@/stores/notifications'

const props = defineProps<{
  category: string
  label: string
  icon: Component
  unreadCount: number
  isActive: boolean
  isExpanded: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const entryStore = useEntryStore()
const notifications = useNotificationStore()

const menuOpen = ref(false)

function toggleMenu(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

async function markAsRead(e: Event) {
  e.preventDefault()
  e.stopPropagation()

  try {
    await entryStore.markCategoryAsRead(props.category)
    notifications.success('Marked as read')
  } catch {
    notifications.error('Failed to mark as read')
  } finally {
    closeMenu()
  }
}

function handleClick() {
  emit('click')
}

// Close menu on outside click
const menuEl = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (!menuOpen.value) return
  if (menuEl.value && menuEl.value.contains(e.target as Node)) return
  closeMenu()
}

document.addEventListener('click', onDocClick)
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div class="relative group/cat">
    <button
      :class="isActive ? 'sidebar-item-active' : 'sidebar-item'"
      class="w-full"
      :aria-expanded="isExpanded"
      :aria-current="isActive ? 'page' : undefined"
      @click="handleClick"
    >
      <ChevronRightIcon
        class="h-4 w-4 shrink-0 transition-transform"
        :class="{ 'rotate-90': isExpanded }"
        aria-hidden="true"
      />
      <component
        :is="icon"
        class="h-5 w-5 shrink-0"
        aria-hidden="true"
      />
      <span class="flex-1 truncate text-left">{{ label }}</span>

      <!-- Unread count / menu button swap -->
      <span class="relative ml-auto shrink-0 flex items-center justify-end">
        <span
          class="text-xs transition-opacity duration-150"
          :class="[
            menuOpen ? 'opacity-0' : 'group-hover/cat:opacity-0',
            unreadCount > 0 ? 'text-text-muted' : 'text-text-muted/40',
          ]"
        >
          {{ unreadCount }}
        </span>
        <button
          class="absolute right-0 flex items-center justify-center rounded p-0.5 text-text-muted hover:text-text-primary transition-opacity duration-150"
          :class="menuOpen ? 'opacity-100' : 'opacity-0 group-hover/cat:opacity-100'"
          aria-label="Category options"
          :aria-expanded="menuOpen"
          @click.stop="toggleMenu"
        >
          <EllipsisVerticalIcon class="h-4 w-4" />
        </button>
      </span>
    </button>

    <!-- Dropdown menu -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="menuOpen"
        ref="menuEl"
        role="menu"
        class="absolute right-2 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-bg-primary py-1 shadow-lg"
      >
        <button
          class="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover"
          @click="markAsRead"
        >
          <CheckCircleIcon class="h-4 w-4" />
          Mark as Read
        </button>
      </div>
    </Transition>
  </div>
</template>
