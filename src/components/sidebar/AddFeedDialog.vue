<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RssIcon } from '@heroicons/vue/24/outline'
import { useFeedStore } from '@/stores/feeds'
import { useGroupStore } from '@/stores/groups'
import { useNotificationStore } from '@/stores/notifications'
import { FEED_CATEGORIES } from '@/config/constants'
import { addFeed, importOPML } from '@/services/feeds.service'
import { detectPlatformHint } from '@/utils/platformDetect'
import { errorMessage } from '@/composables/useAsyncAction'
import GroupSelector from '@/components/common/GroupSelector.vue'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const feedStore = useFeedStore()
const groupStore = useGroupStore()
const notifications = useNotificationStore()

const feedUrl = ref('')
const category = ref('other')
const isPrivate = ref(false)
const loading = ref(false)
const selectedGroupIds = ref<string[]>([])
const opmlFile = ref<File | null>(null)
const mode = ref<'url' | 'opml'>('url')

const modeOptions = [
  { value: 'url' as const, label: 'Feed URL' },
  { value: 'opml' as const, label: 'Import OPML' },
]

const platformHint = computed(() => detectPlatformHint(feedUrl.value))

watch(
  () => props.open,
  (v) => {
    if (!v) return
    feedUrl.value = ''
    category.value = 'other'
    isPrivate.value = false
    selectedGroupIds.value = []
    opmlFile.value = null
    mode.value = 'url'
  },
)

async function handleAddFeed() {
  if (!feedUrl.value.trim()) return
  loading.value = true
  try {
    const result = await addFeed(feedUrl.value.trim(), category.value, isPrivate.value)
    await feedStore.subscribeFeed(result.id)
    if (selectedGroupIds.value.length > 0) {
      await Promise.allSettled(selectedGroupIds.value.map((gid) => groupStore.addFeedToGroup(gid, result.id)))
    }
    const platformName = result.platform ? ` (${result.platform})` : ''
    const groupMsg = selectedGroupIds.value.length > 0 ? ` Added to ${selectedGroupIds.value.length} group(s).` : ''
    notifications.success((result.created ? `Feed added and subscribed!${platformName}` : 'Subscribed to existing feed!') + groupMsg)
    emit('close')
  } catch (e: unknown) {
    const code = typeof e === 'object' && e && 'code' in e ? (e as { code?: string }).code : undefined
    const msg = errorMessage(e, 'Failed to add feed')
    if (code === '23505' || msg.includes('subscriptions_unique')) notifications.error('You are already subscribed to this feed')
    else notifications.error(msg)
  } finally {
    loading.value = false
  }
}

async function handleImportOPML() {
  if (!opmlFile.value) return
  loading.value = true
  try {
    const result = await importOPML(opmlFile.value)
    await Promise.all([feedStore.fetchFeeds(), groupStore.fetchGroups()])
    notifications.success(`Imported ${result.feeds_added} feeds, ${result.groups_created} groups created`)
    emit('close')
  } catch (e: unknown) {
    notifications.error(errorMessage(e, 'Failed to import OPML'))
  } finally {
    loading.value = false
  }
}

function onFileChange(e: Event) {
  opmlFile.value = (e.target as HTMLInputElement).files?.[0] || null
}
</script>

<template>
  <BaseDialog :open="open" title="Add Feed" @close="emit('close')">
    <SegmentedControl v-model="mode" :options="modeOptions" size="md" class="mb-4" label="Add feed mode" />

    <!-- URL mode -->
    <form v-if="mode === 'url'" class="space-y-4" @submit.prevent="handleAddFeed">
      <FormField label="Feed URL">
        <div class="relative">
          <RssIcon class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input v-model="feedUrl" type="url" placeholder="Paste any URL — feed, YouTube, Reddit, GitHub..." class="input pl-9" required />
        </div>
        <div v-if="platformHint" class="mt-1.5 flex items-center gap-1.5">
          <span class="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">{{ platformHint.label }}</span>
          <span class="text-xs text-text-muted">{{ platformHint.description }}</span>
        </div>
      </FormField>

      <FormField label="Category">
        <select v-model="category" class="input">
          <option v-for="cat in FEED_CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
        </select>
      </FormField>

      <label class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
        <input v-model="isPrivate" type="checkbox" class="rounded border-border" />
        Private feed (won't appear in Discover)
      </label>

      <GroupSelector v-model="selectedGroupIds" mode="form" />

      <button type="submit" class="btn-primary w-full" :disabled="loading || !feedUrl">
        {{ loading && platformHint ? `Resolving ${platformHint.label}...` : loading ? 'Adding...' : 'Add Feed' }}
      </button>
    </form>

    <!-- OPML mode -->
    <form v-else class="space-y-4" @submit.prevent="handleImportOPML">
      <FormField label="OPML File">
        <input type="file" accept=".opml,.xml" class="input" @change="onFileChange" />
      </FormField>
      <button type="submit" class="btn-primary w-full" :disabled="loading || !opmlFile">
        {{ loading ? 'Importing...' : 'Import Feeds' }}
      </button>
    </form>
  </BaseDialog>
</template>
