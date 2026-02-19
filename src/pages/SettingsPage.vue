<script setup lang="ts">
import { ref } from 'vue'
import { Bars3Icon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useNotificationStore } from '@/stores/notifications'
import { supabase } from '@/config/supabase'
import GroupsSettingsTab from '@/components/settings/GroupsSettingsTab.vue'

const authStore = useAuthStore()
const ui = useUIStore()
const notifications = useNotificationStore()

const activeTab = ref('general')

const tabs = [
  { id: 'general', label: 'General' },
  { id: 'account', label: 'Account' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'groups', label: 'Groups' },
  { id: 'import-export', label: 'Import / Export' },
  { id: 'keyboard', label: 'Keyboard Shortcuts' },
]

async function handleExportOPML() {
  try {
    const { data, error } = await supabase.rpc('export_opml_data', {
      p_user_id: authStore.user?.id,
    })
    if (error) throw error

    const opmlData = data as any
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n<head><title>Acta Feeds Export</title></head>\n<body>\n'

    // Groups
    if (opmlData.groups) {
      for (const group of opmlData.groups) {
        xml += `  <outline text="${escapeXml(group.name)}">\n`
        for (const feed of group.feeds || []) {
          xml += `    <outline type="rss" text="${escapeXml(feed.title || '')}" xmlUrl="${escapeXml(feed.xml_url || '')}" htmlUrl="${escapeXml(feed.html_url || '')}" />\n`
        }
        xml += '  </outline>\n'
      }
    }

    // Ungrouped
    if (opmlData.ungrouped) {
      for (const feed of opmlData.ungrouped) {
        xml += `  <outline type="rss" text="${escapeXml(feed.title || '')}" xmlUrl="${escapeXml(feed.xml_url || '')}" htmlUrl="${escapeXml(feed.html_url || '')}" />\n`
      }
    }

    xml += '</body>\n</opml>'

    const blob = new Blob([xml], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'acta-feeds.opml'
    a.click()
    URL.revokeObjectURL(url)
    notifications.success('OPML exported')
  } catch (e: any) {
    notifications.error('Failed to export')
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const themes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'forest', label: 'Forest' },
]

const shortcuts = [
  { key: 'j', desc: 'Next entry' },
  { key: 'k', desc: 'Previous entry' },
  { key: 's', desc: 'Star / unstar' },
  { key: 'm', desc: 'Toggle read / unread' },
  { key: 'o', desc: 'Open in browser' },
  { key: 'Enter', desc: 'Open reader' },
  { key: 'Esc', desc: 'Close reader' },
  { key: '/', desc: 'Focus search' },
  { key: 'Shift+?', desc: 'Keyboard shortcuts' },
]
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-2xl px-4 py-6">
      <div class="flex items-center gap-2 mb-6">
        <button
          class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary md:hidden"
          @click="ui.toggleSidebar()"
        >
          <Bars3Icon class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-text-primary">Settings</h1>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 border-b mb-6 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="shrink-0 px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="
            activeTab === tab.id
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          "
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- General -->
      <div v-if="activeTab === 'general'" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Theme</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              v-for="t in themes"
              :key="t.value"
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              :class="
                ui.theme === t.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'hover:bg-bg-hover text-text-secondary'
              "
              @click="ui.setTheme(t.value as any)"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Display Mode</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              :class="
                ui.displayMode === 'comfortable'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'hover:bg-bg-hover text-text-secondary'
              "
              @click="ui.setDisplayMode('comfortable')"
            >
              Comfortable
            </button>
            <button
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              :class="
                ui.displayMode === 'compact'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'hover:bg-bg-hover text-text-secondary'
              "
              @click="ui.setDisplayMode('compact')"
            >
              Compact
            </button>
            <button
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              :class="
                ui.displayMode === 'feed'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'hover:bg-bg-hover text-text-secondary'
              "
              @click="ui.setDisplayMode('feed')"
            >
              Feed
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Pagination</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              :class="
                ui.paginationMode === 'infinite'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'hover:bg-bg-hover text-text-secondary'
              "
              @click="ui.setPaginationMode('infinite')"
            >
              Infinite Scroll
            </button>
            <button
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              :class="
                ui.paginationMode === 'paginated'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'hover:bg-bg-hover text-text-secondary'
              "
              @click="ui.setPaginationMode('paginated')"
            >
              Paginated
            </button>
          </div>
        </div>

        <div v-if="ui.paginationMode === 'paginated'">
          <label class="block text-sm font-medium text-text-secondary mb-2">Entries Per Page</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="size in [10, 25, 50]"
              :key="size"
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              :class="
                ui.entriesPerPage === size
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'hover:bg-bg-hover text-text-secondary'
              "
              @click="ui.setEntriesPerPage(size)"
            >
              {{ size }}
            </button>
          </div>
        </div>

        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="ui.markReadOnScroll"
            type="checkbox"
            class="rounded border-border"
          />
          <span class="text-sm text-text-primary">Mark entries as read on scroll</span>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="ui.showImages" type="checkbox" class="rounded border-border" />
          <span class="text-sm text-text-primary">Show images in entries</span>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="ui.openLinksInNewTab"
            type="checkbox"
            class="rounded border-border"
          />
          <span class="text-sm text-text-primary">Open links in new tab</span>
        </label>
      </div>

      <!-- Account -->
      <div v-if="activeTab === 'account'" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1">Handle</label>
          <p class="text-sm text-text-primary">@{{ authStore.profile?.handle }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1">Email</label>
          <p class="text-sm text-text-primary">{{ authStore.profile?.email }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1">Name</label>
          <p class="text-sm text-text-primary">
            {{ authStore.profile?.first_name }} {{ authStore.profile?.last_name }}
          </p>
        </div>
        <button class="btn-danger text-sm" @click="authStore.logout()">Sign out</button>
      </div>

      <!-- Notifications -->
      <div v-if="activeTab === 'notifications'" class="space-y-4">
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="ui.notifyNewEntries"
            type="checkbox"
            class="rounded border-border"
          />
          <span class="text-sm text-text-primary">Push notifications for new entries</span>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="ui.notifyEmail" type="checkbox" class="rounded border-border" />
          <span class="text-sm text-text-primary">Email notifications</span>
        </label>
      </div>

      <!-- Groups -->
      <GroupsSettingsTab v-if="activeTab === 'groups'" />

      <!-- Import/Export -->
      <div v-if="activeTab === 'import-export'" class="space-y-6">
        <div>
          <h3 class="text-sm font-medium text-text-primary mb-2">Export Feeds</h3>
          <p class="text-sm text-text-muted mb-3">
            Download your feeds as an OPML file for backup or to import into another reader.
          </p>
          <button class="btn-secondary text-sm" @click="handleExportOPML">Export OPML</button>
        </div>
        <div>
          <h3 class="text-sm font-medium text-text-primary mb-2">Import Feeds</h3>
          <p class="text-sm text-text-muted mb-3">
            Use the "Add Feed" button and select "Import OPML" to import feeds from another reader.
          </p>
        </div>
      </div>

      <!-- Keyboard Shortcuts -->
      <div v-if="activeTab === 'keyboard'" class="space-y-2">
        <div
          v-for="s in shortcuts"
          :key="s.key"
          class="flex items-center justify-between py-2 border-b last:border-0"
        >
          <span class="text-sm text-text-primary">{{ s.desc }}</span>
          <kbd
            class="rounded bg-bg-secondary px-2 py-1 text-xs font-mono text-text-secondary border"
          >
            {{ s.key }}
          </kbd>
        </div>
      </div>
    </div>
  </div>
</template>
