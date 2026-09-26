<script setup lang="ts">
import { ref } from 'vue'
import { PlusIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline'
import { FEED_CATEGORIES } from '@/config/constants'
import { addFeed, importOPML } from '@/services/feeds.service'
import { useAsyncAction } from '@/composables/useAsyncAction'
import BaseDialog from '@/components/ui/BaseDialog.vue'
import FormField from '@/components/ui/FormField.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; imported: [] }>()

const { loading: addingUrl, run: runAdd } = useAsyncAction()
const { loading: importing, run: runImport } = useAsyncAction()

const url = ref('')
const category = ref('other')
const opmlFile = ref<File | null>(null)

async function submitUrl() {
  if (!url.value.trim()) return
  const result = await runAdd(() => addFeed(url.value.trim(), category.value, false), {
    success: (r) => (r.created ? 'Feed added to catalog' : 'Feed already exists in catalog'),
    error: 'Failed to add feed',
  })
  if (result) {
    url.value = ''
    category.value = 'other'
    emit('imported')
  }
}

async function submitOpml() {
  if (!opmlFile.value) return
  const result = await runImport(() => importOPML(opmlFile.value!, true), {
    success: (r) => `Imported ${r.feeds_added} feeds to catalog (${r.feeds_skipped} already existed)`,
    error: 'Failed to import OPML',
  })
  if (result) {
    opmlFile.value = null
    emit('imported')
  }
}
</script>

<template>
  <BaseDialog :open="open" title="Import Feeds to Catalog" description="Add feeds to the system without subscribing your account." @close="emit('close')">
    <form class="space-y-3 mb-5" @submit.prevent="submitUrl">
      <FormField label="Feed URL">
        <input v-model="url" type="url" placeholder="https://example.com/feed.xml" class="input text-sm" required />
      </FormField>
      <FormField label="Category">
        <select v-model="category" class="input text-sm">
          <option v-for="cat in FEED_CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
        </select>
      </FormField>
      <button type="submit" class="btn-primary text-sm py-2 px-3 w-full flex items-center justify-center gap-1.5" :disabled="addingUrl || !url">
        <PlusIcon class="h-4 w-4" />
        {{ addingUrl ? 'Adding...' : 'Add Feed' }}
      </button>
    </form>

    <div class="border-t border-border pt-4 space-y-3">
      <p class="text-xs font-medium text-text-secondary">Or import from OPML file</p>
      <input type="file" accept=".opml,.xml" class="input text-sm" @change="opmlFile = ($event.target as HTMLInputElement).files?.[0] || null" />
      <button class="btn-primary text-sm py-2 px-3 w-full flex items-center justify-center gap-1.5" :disabled="importing || !opmlFile" @click="submitOpml">
        <ArrowUpTrayIcon class="h-4 w-4" />
        {{ importing ? 'Importing...' : 'Import OPML' }}
      </button>
    </div>
  </BaseDialog>
</template>
