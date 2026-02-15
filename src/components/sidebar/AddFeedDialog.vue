<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import { XMarkIcon, RssIcon } from '@heroicons/vue/24/outline'
import { useFeedStore } from '@/stores/feeds'
import { useNotificationStore } from '@/stores/notifications'
import { FEED_CATEGORIES } from '@/config/constants'
import { addFeed, importOPML } from '@/services/feeds.service'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const feedStore = useFeedStore()
const notifications = useNotificationStore()

const feedUrl = ref('')
const category = ref('other')
const isPrivate = ref(false)
const loading = ref(false)
const opmlFile = ref<File | null>(null)
const mode = ref<'url' | 'opml'>('url')

watch(
  () => props.open,
  (v) => {
    if (v) {
      feedUrl.value = ''
      category.value = 'other'
      isPrivate.value = false
      opmlFile.value = null
      mode.value = 'url'
    }
  },
)

async function handleAddFeed() {
  if (!feedUrl.value.trim()) return
  loading.value = true
  try {
    const result = await addFeed(feedUrl.value.trim(), category.value, isPrivate.value)
    // Subscribe to the feed
    await feedStore.subscribeFeed(result.id)
    notifications.success(result.created ? 'Feed added and subscribed!' : 'Subscribed to existing feed!')
    emit('close')
  } catch (e: any) {
    if (e?.code === '23505' || e?.message?.includes('subscriptions_unique')) {
      notifications.error('You are already subscribed to this feed')
    } else {
      notifications.error(e.message || 'Failed to add feed')
    }
  } finally {
    loading.value = false
  }
}

async function handleImportOPML() {
  if (!opmlFile.value) return
  loading.value = true
  try {
    const result = await importOPML(opmlFile.value)
    await feedStore.fetchFeeds()
    notifications.success(
      `Imported ${result.feeds_added} feeds, ${result.groups_created} groups created`,
    )
    emit('close')
  } catch (e: any) {
    notifications.error(e.message || 'Failed to import OPML')
  } finally {
    loading.value = false
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  opmlFile.value = input.files?.[0] || null
}
</script>

<template>
  <TransitionRoot :show="open" as="template">
    <Dialog class="relative z-50" @close="$emit('close')">
      <TransitionChild
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/40" />
      </TransitionChild>

      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild
          enter="ease-out duration-200"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="ease-in duration-150"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel class="w-full max-w-md rounded-xl border bg-bg-primary p-6 shadow-xl">
            <div class="flex items-center justify-between mb-4">
              <DialogTitle class="text-lg font-semibold text-text-primary">Add Feed</DialogTitle>
              <button class="text-text-muted hover:text-text-primary" @click="$emit('close')">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>

            <!-- Mode tabs -->
            <div class="mb-4 flex rounded-lg bg-bg-secondary p-1">
              <button
                class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                :class="
                  mode === 'url'
                    ? 'bg-bg-primary text-text-primary shadow-sm'
                    : 'text-text-secondary'
                "
                @click="mode = 'url'"
              >
                Feed URL
              </button>
              <button
                class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                :class="
                  mode === 'opml'
                    ? 'bg-bg-primary text-text-primary shadow-sm'
                    : 'text-text-secondary'
                "
                @click="mode = 'opml'"
              >
                Import OPML
              </button>
            </div>

            <!-- URL mode -->
            <form v-if="mode === 'url'" @submit.prevent="handleAddFeed" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-text-secondary mb-1">Feed URL</label>
                <div class="relative">
                  <RssIcon
                    class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    v-model="feedUrl"
                    type="url"
                    placeholder="https://example.com/feed.xml"
                    class="input pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-secondary mb-1">Category</label>
                <select v-model="category" class="input">
                  <option v-for="cat in FEED_CATEGORIES" :key="cat.value" :value="cat.value">
                    {{ cat.label }}
                  </option>
                </select>
              </div>

              <label class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input v-model="isPrivate" type="checkbox" class="rounded border-border" />
                Private feed (won't appear in Discover)
              </label>

              <button type="submit" class="btn-primary w-full" :disabled="loading || !feedUrl">
                {{ loading ? 'Adding...' : 'Add Feed' }}
              </button>
            </form>

            <!-- OPML mode -->
            <form v-else @submit.prevent="handleImportOPML" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-text-secondary mb-1"
                  >OPML File</label
                >
                <input
                  type="file"
                  accept=".opml,.xml"
                  class="input"
                  @change="onFileChange"
                />
              </div>

              <button
                type="submit"
                class="btn-primary w-full"
                :disabled="loading || !opmlFile"
              >
                {{ loading ? 'Importing...' : 'Import Feeds' }}
              </button>
            </form>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
