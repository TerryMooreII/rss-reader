<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { supabase } from '@/config/supabase'
import { KEYBOARD_SHORTCUTS } from '@/config/constants'
import GroupsSettingsTab from '@/components/settings/GroupsSettingsTab.vue'
import FiltersSettingsTab from '@/components/settings/FiltersSettingsTab.vue'
import TagsSettingsTab from '@/components/settings/TagsSettingsTab.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import TabBar from '@/components/ui/TabBar.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'

const authStore = useAuthStore()
const ui = useUIStore()
const { run } = useAsyncAction()

const route = useRoute()
const router = useRouter()

type TabId = 'general' | 'account' | 'groups' | 'filters' | 'tags' | 'import-export' | 'keyboard'
const tabs: { id: TabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'account', label: 'Account' },
  { id: 'groups', label: 'Groups' },
  { id: 'filters', label: 'Filters' },
  { id: 'tags', label: 'Tags' },
  { id: 'import-export', label: 'Import / Export' },
  { id: 'keyboard', label: 'Keyboard' },
]

const tabParam = route.query.tab as TabId | undefined
const activeTab = ref<TabId>(tabs.some((t) => t.id === tabParam) ? tabParam! : 'general')

watch(activeTab, (tab) => {
  router.replace({ query: tab === 'general' ? {} : { tab } })
})

const themeOptions = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
  { value: 'midnight' as const, label: 'Midnight' },
  { value: 'forest' as const, label: 'Forest' },
]
const fontSizeOptions = [
  { value: 'small' as const, label: 'Small' },
  { value: 'medium' as const, label: 'Medium' },
  { value: 'large' as const, label: 'Large' },
]
const displayModeOptions = [
  { value: 'comfortable' as const, label: 'Comfortable' },
  { value: 'compact' as const, label: 'Compact' },
  { value: 'feed' as const, label: 'Feed' },
]
const paginationOptions = [
  { value: 'infinite' as const, label: 'Infinite Scroll' },
  { value: 'paginated' as const, label: 'Paginated' },
]
const pageSizeOptions = [10, 25, 50].map((n) => ({ value: n, label: String(n) }))

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface OpmlFeed {
  title?: string | null
  xml_url?: string | null
  html_url?: string | null
}

function opmlOutline(feed: OpmlFeed, indent: string): string {
  return `${indent}<outline type="rss" text="${escapeXml(feed.title || '')}" xmlUrl="${escapeXml(feed.xml_url || '')}" htmlUrl="${escapeXml(feed.html_url || '')}" />\n`
}

async function exportOPML() {
  const { data, error } = await supabase.rpc('export_opml_data', { p_user_id: authStore.user?.id })
  if (error) throw error
  const opml = data as { groups?: { name: string; feeds?: OpmlFeed[] }[]; ungrouped?: OpmlFeed[] }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n<head><title>Acta Feeds Export</title></head>\n<body>\n'
  for (const group of opml.groups ?? []) {
    xml += `  <outline text="${escapeXml(group.name)}">\n`
    for (const feed of group.feeds ?? []) xml += opmlOutline(feed, '    ')
    xml += '  </outline>\n'
  }
  for (const feed of opml.ungrouped ?? []) xml += opmlOutline(feed, '  ')
  xml += '</body>\n</opml>'

  const url = URL.createObjectURL(new Blob([xml], { type: 'text/xml' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'acta-feeds.opml'
  a.click()
  URL.revokeObjectURL(url)
}

function handleExportOPML() {
  run(exportOPML, { success: 'OPML exported', error: 'Failed to export' })
}
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-2xl px-4 py-6">
      <PageHeader title="Settings" />

      <TabBar v-model="activeTab" :tabs="tabs" />

      <!-- General -->
      <div v-if="activeTab === 'general'" class="space-y-6">
        <div>
          <label class="field-label mb-2">Theme</label>
          <SegmentedControl :model-value="ui.theme" :options="themeOptions" variant="cards" grid-class="grid-cols-2 sm:grid-cols-4" @update:model-value="ui.setTheme" />
        </div>

        <div>
          <label class="field-label mb-2">Font Size</label>
          <SegmentedControl :model-value="ui.fontSize" :options="fontSizeOptions" variant="cards" grid-class="grid-cols-3" @update:model-value="ui.setFontSize" />
        </div>

        <div>
          <label class="field-label mb-2">Display Mode</label>
          <SegmentedControl :model-value="ui.displayMode" :options="displayModeOptions" variant="cards" grid-class="grid-cols-3" @update:model-value="ui.setDisplayMode" />
        </div>

        <div>
          <label class="field-label mb-2">Pagination</label>
          <SegmentedControl :model-value="ui.paginationMode" :options="paginationOptions" variant="cards" grid-class="grid-cols-2" @update:model-value="ui.setPaginationMode" />
        </div>

        <div v-if="ui.paginationMode === 'paginated'">
          <label class="field-label mb-2">Entries Per Page</label>
          <SegmentedControl :model-value="ui.entriesPerPage" :options="pageSizeOptions" variant="cards" grid-class="grid-cols-3" @update:model-value="ui.setEntriesPerPage" />
        </div>

        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="ui.showImages" type="checkbox" class="rounded border-border" />
          <span class="text-sm text-text-primary">Show images in entries</span>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="ui.showArchiveLinks" type="checkbox" class="rounded border-border" />
          <span class="text-sm text-text-primary">Show Archive.ph links on articles</span>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="ui.openLinksInNewTab" type="checkbox" class="rounded border-border" />
          <span class="text-sm text-text-primary">Open links in new tab</span>
        </label>
      </div>

      <!-- Account -->
      <div v-if="activeTab === 'account'" class="space-y-6">
        <div>
          <label class="field-label">Handle</label>
          <p class="text-sm text-text-primary">@{{ authStore.profile?.handle }}</p>
        </div>
        <div>
          <label class="field-label">Email</label>
          <p class="text-sm text-text-primary">{{ authStore.profile?.email }}</p>
        </div>
        <div>
          <label class="field-label">Name</label>
          <p class="text-sm text-text-primary">{{ authStore.profile?.first_name }} {{ authStore.profile?.last_name }}</p>
        </div>
        <button class="btn-danger text-sm" @click="authStore.logout()">Sign out</button>
      </div>

      <GroupsSettingsTab v-if="activeTab === 'groups'" />
      <FiltersSettingsTab v-if="activeTab === 'filters'" />
      <TagsSettingsTab v-if="activeTab === 'tags'" />

      <!-- Import/Export -->
      <div v-if="activeTab === 'import-export'" class="space-y-6">
        <div>
          <h3 class="text-sm font-medium text-text-primary mb-2">Export Feeds</h3>
          <p class="text-sm text-text-muted mb-3">Download your feeds as an OPML file for backup or to import into another reader.</p>
          <button class="btn-secondary text-sm" @click="handleExportOPML">Export OPML</button>
        </div>
        <div>
          <h3 class="text-sm font-medium text-text-primary mb-2">Import Feeds</h3>
          <p class="text-sm text-text-muted mb-3">Use the "Add Feed" button and select "Import OPML" to import feeds from another reader.</p>
        </div>
      </div>

      <!-- Keyboard Shortcuts -->
      <div v-if="activeTab === 'keyboard'" class="space-y-2">
        <div v-for="s in KEYBOARD_SHORTCUTS" :key="s.key" class="flex items-center justify-between py-2 border-b last:border-0">
          <span class="text-sm text-text-primary">{{ s.description }}</span>
          <kbd class="rounded bg-bg-secondary px-2 py-1 text-xs font-mono text-text-secondary border">{{ s.key }}</kbd>
        </div>
      </div>
    </div>
  </div>
</template>
