<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Bars3Icon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useFeedStore } from '@/stores/feeds'
import { useNotificationStore } from '@/stores/notifications'
import { supabase } from '@/config/supabase'
import type { UserSettings } from '@/types/models'

const authStore = useAuthStore()
const ui = useUIStore()
const feedStore = useFeedStore()
const notifications = useNotificationStore()

const settings = ref<UserSettings | null>(null)
const loading = ref(false)
const activeTab = ref('general')

const tabs = [
  { id: 'general', label: 'General' },
  { id: 'account', label: 'Account' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'import-export', label: 'Import / Export' },
  { id: 'keyboard', label: 'Keyboard Shortcuts' },
]

async function fetchSettings() {
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', authStore.user?.id)
    .single()
  if (data) settings.value = data as UserSettings
}

// Re-fetch settings on tab return if they failed to load
function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && !settings.value) {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) fetchSettings()
    })
  }
}

onMounted(() => {
  fetchSettings()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

async function saveSettings() {
  if (!settings.value) return
  loading.value = true
  try {
    const { error } = await supabase
      .from('user_settings')
      .update({
        theme: settings.value.theme,
        custom_theme: settings.value.custom_theme,
        display_mode: settings.value.display_mode,
        mark_read_on_scroll: settings.value.mark_read_on_scroll,
        show_images: settings.value.show_images,
        open_links_in_new_tab: settings.value.open_links_in_new_tab,
        notify_new_entries: settings.value.notify_new_entries,
        notify_email: settings.value.notify_email,
        entries_per_page: settings.value.entries_per_page,
      })
      .eq('user_id', authStore.user?.id)
    if (error) throw error
    // Sync UI store
    if (settings.value.custom_theme) {
      ui.setTheme(settings.value.custom_theme as any)
    }
    if (settings.value.display_mode) {
      ui.setDisplayMode(settings.value.display_mode)
    }
    notifications.success('Settings saved')
  } catch (e: any) {
    notifications.error('Failed to save settings')
  } finally {
    loading.value = false
  }
}

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
      <div v-if="activeTab === 'general' && settings" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-2">Theme</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              v-for="t in themes"
              :key="t.value"
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              :class="
                settings.custom_theme === t.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'hover:bg-bg-hover text-text-secondary'
              "
              @click="settings.custom_theme = t.value"
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
                settings.display_mode === 'comfortable'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'hover:bg-bg-hover text-text-secondary'
              "
              @click="settings.display_mode = 'comfortable'"
            >
              Comfortable
            </button>
            <button
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              :class="
                settings.display_mode === 'compact'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'hover:bg-bg-hover text-text-secondary'
              "
              @click="settings.display_mode = 'compact'"
            >
              Compact
            </button>
            <button
              class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              :class="
                settings.display_mode === 'feed'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'hover:bg-bg-hover text-text-secondary'
              "
              @click="settings.display_mode = 'feed'"
            >
              Feed
            </button>
          </div>
        </div>

        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="settings.mark_read_on_scroll"
            type="checkbox"
            class="rounded border-border"
          />
          <span class="text-sm text-text-primary">Mark entries as read on scroll</span>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="settings.show_images" type="checkbox" class="rounded border-border" />
          <span class="text-sm text-text-primary">Show images in entries</span>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="settings.open_links_in_new_tab"
            type="checkbox"
            class="rounded border-border"
          />
          <span class="text-sm text-text-primary">Open links in new tab</span>
        </label>

        <button class="btn-primary" :disabled="loading" @click="saveSettings">
          {{ loading ? 'Saving...' : 'Save Settings' }}
        </button>
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
      <div v-if="activeTab === 'notifications' && settings" class="space-y-4">
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="settings.notify_new_entries"
            type="checkbox"
            class="rounded border-border"
          />
          <span class="text-sm text-text-primary">Push notifications for new entries</span>
        </label>

        <label class="flex items-center gap-3 cursor-pointer">
          <input v-model="settings.notify_email" type="checkbox" class="rounded border-border" />
          <span class="text-sm text-text-primary">Email notifications</span>
        </label>

        <button class="btn-primary" :disabled="loading" @click="saveSettings">
          {{ loading ? 'Saving...' : 'Save' }}
        </button>
      </div>

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
