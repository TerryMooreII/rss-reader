<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Bars3Icon, PlusIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline'
import { supabase } from '@/config/supabase'
import { useUIStore } from '@/stores/ui'
import { useNotificationStore } from '@/stores/notifications'
import { FEED_CATEGORIES } from '@/config/constants'
import { addFeed, importOPML } from '@/services/feeds.service'
import type { UserProfile, Feed } from '@/types/models'

const ui = useUIStore()
const notifications = useNotificationStore()

const activeTab = ref<'feeds' | 'users'>('feeds')
const feeds = ref<Feed[]>([])
const users = ref<UserProfile[]>([])
const loading = ref(false)

// Admin import state
const importUrl = ref('')
const importCategory = ref('other')
const importLoading = ref(false)
const opmlFile = ref<File | null>(null)
const opmlLoading = ref(false)

async function loadFeeds() {
  loading.value = true
  const { data, error } = await supabase
    .from('feeds')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (!error) feeds.value = (data || []) as Feed[]
  loading.value = false
}

async function loadUsers() {
  loading.value = true
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (!error) users.value = (data || []) as UserProfile[]
  loading.value = false
}

async function toggleUserRole(user: UserProfile) {
  const newRole = user.role === 'admin' ? 'user' : 'admin'
  try {
    const { error } = await supabase.rpc('admin_update_user_role', {
      p_target_user_id: user.id,
      p_new_role: newRole,
    })
    if (error) throw error
    user.role = newRole
    notifications.success(`User role updated to ${newRole}`)
  } catch (e: any) {
    notifications.error(e.message || 'Failed to update role')
  }
}

async function deleteFeed(feedId: string) {
  if (!confirm('Delete this feed and all its entries?')) return
  try {
    const { error } = await supabase.from('feeds').delete().eq('id', feedId)
    if (error) throw error
    feeds.value = feeds.value.filter((f) => f.id !== feedId)
    notifications.success('Feed deleted')
  } catch (e: any) {
    notifications.error(e.message || 'Failed to delete feed')
  }
}

async function updateFeedStatus(feed: Feed, status: string) {
  try {
    const { error } = await supabase.from('feeds').update({ status }).eq('id', feed.id)
    if (error) throw error
    feed.status = status as any
    notifications.success(`Feed status updated to ${status}`)
  } catch (e: any) {
    notifications.error('Failed to update feed status')
  }
}

async function handleAdminAddFeed() {
  if (!importUrl.value.trim()) return
  importLoading.value = true
  try {
    const result = await addFeed(importUrl.value.trim(), importCategory.value, false)
    notifications.success(
      result.created ? 'Feed added to catalog' : 'Feed already exists in catalog',
    )
    importUrl.value = ''
    importCategory.value = 'other'
    await loadFeeds()
  } catch (e: any) {
    notifications.error(e.message || 'Failed to add feed')
  } finally {
    importLoading.value = false
  }
}

function onOpmlFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  opmlFile.value = input.files?.[0] || null
}

async function handleAdminImportOPML() {
  if (!opmlFile.value) return
  opmlLoading.value = true
  try {
    const result = await importOPML(opmlFile.value, true)
    notifications.success(
      `Imported ${result.feeds_added} feeds to catalog (${result.feeds_skipped} already existed)`,
    )
    opmlFile.value = null
    await loadFeeds()
  } catch (e: any) {
    notifications.error(e.message || 'Failed to import OPML')
  } finally {
    opmlLoading.value = false
  }
}

onMounted(() => {
  loadFeeds()
  loadUsers()
})
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-4xl px-4 py-6">
      <div class="flex items-center gap-2 mb-6">
        <button
          class="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary md:hidden"
          @click="ui.toggleSidebar()"
        >
          <Bars3Icon class="h-5 w-5" />
        </button>
        <h1 class="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="rounded-lg border bg-bg-secondary p-4">
          <p class="text-2xl font-bold text-text-primary">{{ feeds.length }}</p>
          <p class="text-xs text-text-muted">Total Feeds</p>
        </div>
        <div class="rounded-lg border bg-bg-secondary p-4">
          <p class="text-2xl font-bold text-text-primary">
            {{ feeds.filter((f) => f.status === 'active').length }}
          </p>
          <p class="text-xs text-text-muted">Active Feeds</p>
        </div>
        <div class="rounded-lg border bg-bg-secondary p-4">
          <p class="text-2xl font-bold text-text-primary">
            {{ feeds.filter((f) => f.status === 'error' || f.status === 'dead').length }}
          </p>
          <p class="text-xs text-text-muted">Failing Feeds</p>
        </div>
        <div class="rounded-lg border bg-bg-secondary p-4">
          <p class="text-2xl font-bold text-text-primary">{{ users.length }}</p>
          <p class="text-xs text-text-muted">Users</p>
        </div>
      </div>

      <!-- Import Feeds to Catalog -->
      <div class="mb-6 rounded-lg border bg-bg-secondary p-4">
        <h2 class="text-sm font-semibold text-text-primary mb-3">Import Feeds to Catalog</h2>
        <p class="text-xs text-text-muted mb-4">
          Add feeds to the system without subscribing your account.
        </p>

        <!-- Add by URL -->
        <form class="flex flex-wrap items-end gap-2 mb-3" @submit.prevent="handleAdminAddFeed">
          <div class="flex-1 min-w-[200px]">
            <label class="block text-xs font-medium text-text-secondary mb-1">Feed URL</label>
            <input
              v-model="importUrl"
              type="url"
              placeholder="https://example.com/feed.xml"
              class="input text-sm"
              required
            />
          </div>
          <div class="w-40">
            <label class="block text-xs font-medium text-text-secondary mb-1">Category</label>
            <select v-model="importCategory" class="input text-sm">
              <option v-for="cat in FEED_CATEGORIES" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>
          <button
            type="submit"
            class="btn-primary text-sm py-2 px-3 flex items-center gap-1.5"
            :disabled="importLoading || !importUrl"
          >
            <PlusIcon class="h-4 w-4" />
            {{ importLoading ? 'Adding...' : 'Add Feed' }}
          </button>
        </form>

        <!-- Import OPML -->
        <div class="flex flex-wrap items-end gap-2 border-t border-border pt-3">
          <div class="flex-1 min-w-[200px]">
            <label class="block text-xs font-medium text-text-secondary mb-1">OPML File</label>
            <input
              type="file"
              accept=".opml,.xml"
              class="input text-sm"
              @change="onOpmlFileChange"
            />
          </div>
          <button
            class="btn-primary text-sm py-2 px-3 flex items-center gap-1.5"
            :disabled="opmlLoading || !opmlFile"
            @click="handleAdminImportOPML"
          >
            <ArrowUpTrayIcon class="h-4 w-4" />
            {{ opmlLoading ? 'Importing...' : 'Import OPML' }}
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 border-b mb-4">
        <button
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="
            activeTab === 'feeds'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary'
          "
          @click="activeTab = 'feeds'"
        >
          Feeds
        </button>
        <button
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="
            activeTab === 'users'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary'
          "
          @click="activeTab = 'users'"
        >
          Users
        </button>
      </div>

      <!-- Feeds Table -->
      <div v-if="activeTab === 'feeds'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-left text-text-muted">
              <th class="pb-2 font-medium">Feed</th>
              <th class="pb-2 font-medium">Status</th>
              <th class="pb-2 font-medium">Failures</th>
              <th class="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="feed in feeds" :key="feed.id" class="border-b last:border-0">
              <td class="py-2 pr-4">
                <div class="flex items-center gap-2">
                  <img
                    v-if="feed.favicon_url"
                    :src="feed.favicon_url"
                    alt=""
                    class="h-4 w-4 rounded"
                  />
                  <div class="min-w-0">
                    <p class="truncate font-medium text-text-primary max-w-xs">
                      {{ feed.title || feed.url }}
                    </p>
                    <p class="truncate text-xs text-text-muted max-w-xs">{{ feed.url }}</p>
                  </div>
                </div>
              </td>
              <td class="py-2 pr-4">
                <span
                  class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="{
                    'bg-success/10 text-success': feed.status === 'active',
                    'bg-star/10 text-star': feed.status === 'paused',
                    'bg-danger/10 text-danger':
                      feed.status === 'error' || feed.status === 'dead',
                  }"
                >
                  {{ feed.status }}
                </span>
              </td>
              <td class="py-2 pr-4 text-text-muted">{{ feed.consecutive_failures }}</td>
              <td class="py-2">
                <div class="flex gap-2">
                  <select
                    class="input text-xs py-1 w-24"
                    :value="feed.status"
                    @change="updateFeedStatus(feed, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="error">Error</option>
                    <option value="dead">Dead</option>
                  </select>
                  <button class="btn-danger text-xs py-1 px-2" @click="deleteFeed(feed.id)">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Users Table -->
      <div v-if="activeTab === 'users'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-left text-text-muted">
              <th class="pb-2 font-medium">User</th>
              <th class="pb-2 font-medium">Role</th>
              <th class="pb-2 font-medium">Joined</th>
              <th class="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" class="border-b last:border-0">
              <td class="py-2 pr-4">
                <p class="font-medium text-text-primary">
                  {{ user.first_name }} {{ user.last_name }}
                </p>
                <p class="text-xs text-text-muted">@{{ user.handle }} &middot; {{ user.email }}</p>
              </td>
              <td class="py-2 pr-4">
                <span
                  class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="
                    user.role === 'admin'
                      ? 'bg-accent/10 text-accent'
                      : 'bg-bg-secondary text-text-secondary'
                  "
                >
                  {{ user.role }}
                </span>
              </td>
              <td class="py-2 pr-4 text-text-muted">
                {{ new Date(user.created_at).toLocaleDateString() }}
              </td>
              <td class="py-2">
                <button class="btn-ghost text-xs" @click="toggleUserRole(user)">
                  {{ user.role === 'admin' ? 'Demote' : 'Make Admin' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
