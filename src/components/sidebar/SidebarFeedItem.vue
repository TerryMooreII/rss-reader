<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { SubscribedFeed } from '@/types/models'
import { RssIcon, EllipsisVerticalIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { computed, ref, onUnmounted } from 'vue'
import { useFeedStore } from '@/stores/feeds'
import { useNotificationStore } from '@/stores/notifications'

const props = defineProps<{
  feed: SubscribedFeed | undefined
}>()

const route = useRoute()
const router = useRouter()
const feedStore = useFeedStore()
const notifications = useNotificationStore()

const faviconError = ref(false)

const isActive = computed(
  () => route.name === 'feed-entries' && route.params.feedId === props.feed?.id,
)

const menuOpen = ref(false)
const confirmingUnsubscribe = ref(false)

function toggleMenu(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  menuOpen.value = !menuOpen.value
  confirmingUnsubscribe.value = false
}

function closeMenu() {
  menuOpen.value = false
  confirmingUnsubscribe.value = false
}

function startUnsubscribe(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  confirmingUnsubscribe.value = true
}

async function confirmUnsubscribe(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  if (!props.feed) return

  try {
    const feedTitle = props.feed.custom_title || props.feed.title || 'Feed'
    // Navigate away if we're currently viewing this feed
    if (isActive.value) {
      router.push({ name: 'all-entries' })
    }
    await feedStore.unsubscribeFeed(props.feed.id)
    notifications.success(`Unsubscribed from ${feedTitle}`)
  } catch {
    notifications.error('Failed to unsubscribe')
  } finally {
    closeMenu()
  }
}

// Close menu on outside click
const menuEl = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (!menuOpen.value) return
  // Don't close if clicking inside the dropdown
  if (menuEl.value && menuEl.value.contains(e.target as Node)) return
  closeMenu()
}

document.addEventListener('click', onDocClick)
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div v-if="feed" class="relative group">
    <RouterLink
      :to="{ name: 'feed-entries', params: { feedId: feed.id } }"
      :class="isActive ? 'sidebar-item-active' : 'sidebar-item'"
    >
      <img
        v-if="feed.favicon_url && !faviconError"
        :src="feed.favicon_url"
        :alt="feed.title || 'Feed'"
        class="h-4 w-4 shrink-0 rounded"
        loading="lazy"
        @error="faviconError = true"
      />
      <RssIcon v-else class="h-4 w-4 shrink-0 text-text-muted" />
      <span class="flex-1 truncate text-left">
        {{ feed.custom_title || feed.title || feed.url }}
      </span>
      <!-- Unread count / menu button swap -->
      <span class="relative ml-auto shrink-0 flex items-center justify-end">
        <span
          v-if="feed.unread_count > 0"
          class="text-xs text-text-muted transition-opacity duration-150"
          :class="menuOpen ? 'opacity-0' : 'group-hover:opacity-0'"
        >
          {{ feed.unread_count }}
        </span>
        <button
          class="absolute right-0 flex items-center justify-center rounded p-0.5 text-text-muted hover:text-text-primary transition-opacity duration-150"
          :class="menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
          title="Feed options"
          @click="toggleMenu"
        >
          <EllipsisVerticalIcon class="h-4 w-4" />
        </button>
      </span>
    </RouterLink>

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
        class="absolute right-2 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-bg-primary py-1 shadow-lg"
      >
        <button
          v-if="!confirmingUnsubscribe"
          class="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-bg-hover"
          @click="startUnsubscribe"
        >
          <TrashIcon class="h-4 w-4" />
          Unsubscribe
        </button>
        <div v-else class="px-3 py-2">
          <p class="text-xs text-text-secondary mb-2">Unsubscribe from this feed?</p>
          <div class="flex gap-2">
            <button
              class="flex-1 rounded-md bg-danger px-2 py-1 text-xs font-medium text-white hover:bg-danger/80"
              @click="confirmUnsubscribe"
            >
              Confirm
            </button>
            <button
              class="flex-1 rounded-md bg-bg-secondary px-2 py-1 text-xs font-medium text-text-primary hover:bg-bg-tertiary"
              @click="closeMenu"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
