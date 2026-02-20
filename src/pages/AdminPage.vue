<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from '@headlessui/vue'
import {
  Bars3Icon,
  PlusIcon,
  ArrowUpTrayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RssIcon,
  XMarkIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'
import { supabase } from '@/config/supabase'
import { useUIStore } from '@/stores/ui'
import { useNotificationStore } from '@/stores/notifications'
import { FEED_CATEGORIES } from '@/config/constants'
import { addFeed, importOPML } from '@/services/feeds.service'
import type { UserProfile, Feed } from '@/types/models'

const ui = useUIStore()
const notifications = useNotificationStore()

const activeTab = ref<'feeds' | 'users' | 'cron' | 'database'>('feeds')
const feeds = ref<Feed[]>([])
const users = ref<UserProfile[]>([])
const loading = ref(false)

// Dashboard stats (independent of filters)
const statsTotalFeeds = ref(0)
const statsActiveFeeds = ref(0)
const statsFailingFeeds = ref(0)

// Feed table controls
const categoryFilter = ref('')
const sortColumn = ref<string>('created_at')
const sortAsc = ref(false)
const pageSize = ref(25)
const currentPage = ref(1)
const totalFeeds = ref(0)
const faviconErrors = ref(new Set<string>())

const totalPages = computed(() => Math.max(1, Math.ceil(totalFeeds.value / pageSize.value)))

// Reset to page 1 when filter, sort, or page size changes
watch([categoryFilter, sortColumn, sortAsc, pageSize], () => {
  currentPage.value = 1
  loadFeeds()
})

watch(currentPage, () => {
  loadFeeds()
})

type SortableColumn = 'title' | 'category' | 'status' | 'subscriber_count' | 'last_fetched_at' | 'consecutive_failures' | 'created_at'

function toggleSort(column: SortableColumn) {
  if (sortColumn.value === column) {
    sortAsc.value = !sortAsc.value
  } else {
    sortColumn.value = column
    sortAsc.value = true
  }
}

const categoryLabel = computed(() => {
  const map = new Map<string, string>(FEED_CATEGORIES.map((c) => [c.value, c.label]))
  return (val: string) => map.get(val) ?? val
})

interface CronRun {
  run_id: number
  job_name: string
  status: string
  return_message: string | null
  start_time: string
  end_time: string
  duration_ms: number
}
const cronRuns = ref<CronRun[]>([])

// Database tab state
interface DbTableStat {
  name: string
  rows: number
  size: string
  size_bytes: number
}
interface EntryGrowth {
  day: string
  count: number
}
interface DbStats {
  total_size: string
  total_size_bytes: number
  free_plan_limit_bytes: number
  tables: DbTableStat[]
  entry_growth: EntryGrowth[]
}
const dbStats = ref<DbStats | null>(null)
const retentionDays = ref(30)
const preserveStarred = ref(true)
const loadingDbStats = ref(false)
const savingRetention = ref(false)
const runningCleanup = ref(false)

async function loadDbStats() {
  loadingDbStats.value = true
  try {
    const { data, error } = await supabase.rpc('get_database_stats')
    if (error) throw error
    dbStats.value = data as DbStats
  } catch (e: any) {
    notifications.error(e.message || 'Failed to load database stats')
  } finally {
    loadingDbStats.value = false
  }
}

async function loadRetentionSettings() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'entry_retention')
      .single()
    if (error) throw error
    if (data?.value) {
      retentionDays.value = data.value.days ?? 30
      preserveStarred.value = data.value.preserve_starred ?? true
    }
  } catch (e: any) {
    notifications.error(e.message || 'Failed to load retention settings')
  }
}

async function saveRetentionSettings() {
  savingRetention.value = true
  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'entry_retention',
        value: { days: retentionDays.value, preserve_starred: preserveStarred.value },
        updated_at: new Date().toISOString(),
      })
    if (error) throw error
    notifications.success('Retention settings saved')
  } catch (e: any) {
    notifications.error(e.message || 'Failed to save retention settings')
  } finally {
    savingRetention.value = false
  }
}

async function runCleanupNow() {
  if (!confirm('Run entry cleanup now? This will permanently delete entries older than the configured retention period.')) return
  runningCleanup.value = true
  try {
    const { data, error } = await supabase.rpc('cleanup_old_entries')
    if (error) throw error
    const result = data as { deleted: number; cutoff: string }
    notifications.success(`Cleanup complete: ${result.deleted} entries deleted`)
    loadDbStats()
  } catch (e: any) {
    notifications.error(e.message || 'Failed to run cleanup')
  } finally {
    runningCleanup.value = false
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
  return (bytes / 1073741824).toFixed(2) + ' GB'
}

// Admin import state
const showImportModal = ref(false)
const importUrl = ref('')
const importCategory = ref('other')
const importLoading = ref(false)
const opmlFile = ref<File | null>(null)
const opmlLoading = ref(false)

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}

async function loadFeeds() {
  loading.value = true

  let query = supabase.from('feeds').select('*', { count: 'exact' })

  if (categoryFilter.value) {
    query = query.eq('category', categoryFilter.value)
  }

  const from = (currentPage.value - 1) * pageSize.value
  const to = from + pageSize.value - 1

  query = query
    .order(sortColumn.value, { ascending: sortAsc.value })
    .range(from, to)

  const { data, error, count } = await query

  if (!error) {
    feeds.value = (data || []) as Feed[]
    totalFeeds.value = count ?? 0
  }
  loading.value = false
}

async function loadStats() {
  const [totalRes, activeRes, failingRes] = await Promise.all([
    supabase.from('feeds').select('*', { count: 'exact', head: true }),
    supabase.from('feeds').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('feeds').select('*', { count: 'exact', head: true }).in('status', ['error', 'dead']),
  ])
  statsTotalFeeds.value = totalRes.count ?? 0
  statsActiveFeeds.value = activeRes.count ?? 0
  statsFailingFeeds.value = failingRes.count ?? 0
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

// Manage Feed Modal
const managedFeed = ref<Feed | null>(null)
const showManageModal = ref(false)
const managedFaviconError = ref(false)
const refetchingIcon = ref(false)

function openManageModal(feed: Feed) {
  managedFeed.value = { ...feed }
  managedFaviconError.value = false
  showManageModal.value = true
}

function closeManageModal() {
  showManageModal.value = false
  managedFeed.value = null
}

async function updateManagedField(field: string, value: string) {
  if (!managedFeed.value) return
  try {
    const { error } = await supabase.from('feeds').update({ [field]: value }).eq('id', managedFeed.value.id)
    if (error) throw error
    ;(managedFeed.value as any)[field] = value
    const feed = feeds.value.find(f => f.id === managedFeed.value!.id)
    if (feed) (feed as any)[field] = value
    notifications.success(`${field === 'category' ? 'Category' : 'Status'} updated`)
  } catch (e: any) {
    notifications.error(e.message || `Failed to update ${field}`)
  }
}

async function refetchFavicon() {
  if (!managedFeed.value) return
  const url = managedFeed.value.site_url || managedFeed.value.url
  let domain: string
  try {
    domain = new URL(url).hostname
  } catch {
    notifications.error('Could not determine domain from feed URL')
    return
  }
  refetchingIcon.value = true
  const newFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  try {
    const { error } = await supabase.from('feeds').update({ favicon_url: newFaviconUrl }).eq('id', managedFeed.value.id)
    if (error) throw error
    managedFeed.value.favicon_url = newFaviconUrl
    managedFaviconError.value = false
    const feed = feeds.value.find(f => f.id === managedFeed.value!.id)
    if (feed) feed.favicon_url = newFaviconUrl
    faviconErrors.value.delete(managedFeed.value.id)
    notifications.success('Icon refreshed')
  } catch (e: any) {
    notifications.error(e.message || 'Failed to update icon')
  } finally {
    refetchingIcon.value = false
  }
}

async function deleteManagedFeed() {
  if (!managedFeed.value) return
  if (!confirm('Delete this feed and all its entries? This cannot be undone.')) return
  try {
    const { error } = await supabase.from('feeds').delete().eq('id', managedFeed.value.id)
    if (error) throw error
    feeds.value = feeds.value.filter(f => f.id !== managedFeed.value!.id)
    totalFeeds.value--
    closeManageModal()
    notifications.success('Feed deleted')
    loadStats()
  } catch (e: any) {
    notifications.error(e.message || 'Failed to delete feed')
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
    await Promise.all([loadFeeds(), loadStats()])
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

async function loadCronHistory() {
  const { data, error } = await supabase.rpc('get_cron_run_history', { p_limit: 10 })
  if (!error) cronRuns.value = (data || []) as CronRun[]
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
    await Promise.all([loadFeeds(), loadStats()])
  } catch (e: any) {
    notifications.error(e.message || 'Failed to import OPML')
  } finally {
    opmlLoading.value = false
  }
}

onMounted(() => {
  loadFeeds()
  loadStats()
  loadUsers()
  loadCronHistory()
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
        <button
          class="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5 ml-auto"
          @click="showImportModal = true"
        >
          <ArrowUpTrayIcon class="h-4 w-4" />
          Import Feeds
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="rounded-lg border bg-bg-secondary p-4">
          <p class="text-2xl font-bold text-text-primary">{{ statsTotalFeeds }}</p>
          <p class="text-xs text-text-muted">Total Feeds</p>
        </div>
        <div class="rounded-lg border bg-bg-secondary p-4">
          <p class="text-2xl font-bold text-text-primary">{{ statsActiveFeeds }}</p>
          <p class="text-xs text-text-muted">Active Feeds</p>
        </div>
        <div class="rounded-lg border bg-bg-secondary p-4">
          <p class="text-2xl font-bold text-text-primary">{{ statsFailingFeeds }}</p>
          <p class="text-xs text-text-muted">Failing Feeds</p>
        </div>
        <div class="rounded-lg border bg-bg-secondary p-4">
          <p class="text-2xl font-bold text-text-primary">{{ users.length }}</p>
          <p class="text-xs text-text-muted">Users</p>
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
        <button
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="
            activeTab === 'cron'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary'
          "
          @click="activeTab = 'cron'"
        >
          Cron Jobs
        </button>
        <button
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="
            activeTab === 'database'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary'
          "
          @click="activeTab = 'database'; loadDbStats(); loadRetentionSettings()"
        >
          Database
        </button>
      </div>

      <!-- Feeds Table -->
      <div v-if="activeTab === 'feeds'">
        <!-- Filter & page size controls -->
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <div class="flex items-center gap-2">
            <label class="text-xs font-medium text-text-secondary">Category</label>
            <select v-model="categoryFilter" class="input text-sm py-1 w-44">
              <option value="">All Categories</option>
              <option v-for="cat in FEED_CATEGORIES" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>
          <div class="flex items-center gap-2 ml-auto">
            <label class="text-xs font-medium text-text-secondary">Per page</label>
            <select v-model="pageSize" class="input text-sm py-1 w-20">
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-text-muted">
                <th class="pb-2 font-medium cursor-pointer select-none" @click="toggleSort('title')">
                  <span class="inline-flex items-center gap-1">
                    Feed
                    <ChevronUpIcon v-if="sortColumn === 'title' && sortAsc" class="h-3 w-3" />
                    <ChevronDownIcon v-else-if="sortColumn === 'title' && !sortAsc" class="h-3 w-3" />
                  </span>
                </th>
                <th class="pb-2 font-medium cursor-pointer select-none" @click="toggleSort('category')">
                  <span class="inline-flex items-center gap-1">
                    Category
                    <ChevronUpIcon v-if="sortColumn === 'category' && sortAsc" class="h-3 w-3" />
                    <ChevronDownIcon v-else-if="sortColumn === 'category' && !sortAsc" class="h-3 w-3" />
                  </span>
                </th>
                <th class="pb-2 font-medium cursor-pointer select-none" @click="toggleSort('status')">
                  <span class="inline-flex items-center gap-1">
                    Status
                    <ChevronUpIcon v-if="sortColumn === 'status' && sortAsc" class="h-3 w-3" />
                    <ChevronDownIcon v-else-if="sortColumn === 'status' && !sortAsc" class="h-3 w-3" />
                  </span>
                </th>
                <th class="pb-2 font-medium cursor-pointer select-none" @click="toggleSort('subscriber_count')">
                  <span class="inline-flex items-center gap-1">
                    Subs
                    <ChevronUpIcon v-if="sortColumn === 'subscriber_count' && sortAsc" class="h-3 w-3" />
                    <ChevronDownIcon v-else-if="sortColumn === 'subscriber_count' && !sortAsc" class="h-3 w-3" />
                  </span>
                </th>
                <th class="pb-2 font-medium cursor-pointer select-none" @click="toggleSort('last_fetched_at')">
                  <span class="inline-flex items-center gap-1">
                    Last Fetched
                    <ChevronUpIcon v-if="sortColumn === 'last_fetched_at' && sortAsc" class="h-3 w-3" />
                    <ChevronDownIcon v-else-if="sortColumn === 'last_fetched_at' && !sortAsc" class="h-3 w-3" />
                  </span>
                </th>
                <th class="pb-2 font-medium cursor-pointer select-none" @click="toggleSort('consecutive_failures')">
                  <span class="inline-flex items-center gap-1">
                    Failures
                    <ChevronUpIcon v-if="sortColumn === 'consecutive_failures' && sortAsc" class="h-3 w-3" />
                    <ChevronDownIcon v-else-if="sortColumn === 'consecutive_failures' && !sortAsc" class="h-3 w-3" />
                  </span>
                </th>
                <th class="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="7" class="py-8 text-center text-text-muted">Loading...</td>
              </tr>
              <tr v-else-if="feeds.length === 0">
                <td colspan="7" class="py-8 text-center text-text-muted">No feeds found</td>
              </tr>
              <tr v-for="feed in feeds" v-else :key="feed.id" class="border-b last:border-0">
                <td class="py-2 pr-4">
                  <div class="flex items-center gap-2">
                    <img
                      v-if="feed.favicon_url && !faviconErrors.has(feed.id)"
                      :src="feed.favicon_url"
                      alt=""
                      class="h-4 w-4 rounded"
                      @error="faviconErrors.add(feed.id)"
                    />
                    <RssIcon v-else class="h-4 w-4 shrink-0 text-text-muted" />
                    <div class="min-w-0">
                      <p class="truncate font-medium text-text-primary max-w-xs">
                        {{ feed.title || feed.url }}
                      </p>
                      <p class="truncate text-xs text-text-muted max-w-xs">{{ feed.url }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-2 pr-4 text-text-muted text-xs">
                  {{ categoryLabel(feed.category) }}
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
                <td class="py-2 pr-4 text-text-muted">{{ feed.subscriber_count }}</td>
                <td class="py-2 pr-4 text-text-muted" :title="feed.last_fetched_at ? new Date(feed.last_fetched_at).toLocaleString() : 'Never fetched'">
                  {{ timeAgo(feed.last_fetched_at) }}
                </td>
                <td class="py-2 pr-4 text-text-muted">{{ feed.consecutive_failures }}</td>
                <td class="py-2">
                  <button
                    class="btn-ghost text-xs flex items-center gap-1"
                    @click="openManageModal(feed)"
                  >
                    <Cog6ToothIcon class="h-3.5 w-3.5" />
                    Manage
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between mt-4 pt-4 border-t">
          <p class="text-xs text-text-muted">
            {{ totalFeeds === 0 ? 'No feeds' : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalFeeds)} of ${totalFeeds} feeds` }}
          </p>
          <div class="flex items-center gap-1">
            <button
              class="rounded-md p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              <ChevronLeftIcon class="h-4 w-4" />
            </button>
            <span class="px-2 text-sm text-text-secondary">
              Page {{ currentPage }} of {{ totalPages }}
            </span>
            <button
              class="rounded-md p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              <ChevronRightIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Cron Jobs Table -->
      <div v-if="activeTab === 'cron'" class="overflow-x-auto">
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-text-muted">Last {{ cronRuns.length }} cron executions</p>
          <button class="btn-ghost text-xs" @click="loadCronHistory">Refresh</button>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b text-left text-text-muted">
              <th class="pb-2 font-medium">Job</th>
              <th class="pb-2 font-medium">Status</th>
              <th class="pb-2 font-medium">Time</th>
              <th class="pb-2 font-medium">Duration</th>
              <th class="pb-2 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cronRuns.length === 0">
              <td colspan="5" class="py-4 text-center text-text-muted">No cron runs yet</td>
            </tr>
            <tr v-for="run in cronRuns" :key="run.run_id" class="border-b last:border-0">
              <td class="py-2 pr-4 font-medium text-text-primary">{{ run.job_name }}</td>
              <td class="py-2 pr-4">
                <span
                  class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="{
                    'bg-success/10 text-success': run.status === 'succeeded',
                    'bg-danger/10 text-danger': run.status === 'failed',
                    'bg-star/10 text-star': run.status !== 'succeeded' && run.status !== 'failed',
                  }"
                >
                  {{ run.status }}
                </span>
              </td>
              <td class="py-2 pr-4 text-text-muted" :title="new Date(run.start_time).toLocaleString()">
                {{ timeAgo(run.start_time) }}
              </td>
              <td class="py-2 pr-4 text-text-muted">
                {{ run.duration_ms != null ? `${Math.round(run.duration_ms)}ms` : '-' }}
              </td>
              <td class="py-2 text-text-muted truncate max-w-xs">
                {{ run.return_message || '-' }}
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
      <!-- Database Tab -->
      <div v-if="activeTab === 'database'">
        <div v-if="loadingDbStats" class="py-8 text-center text-text-muted">Loading database stats...</div>
        <div v-else-if="dbStats" class="space-y-6">
          <!-- Storage Usage -->
          <div class="rounded-lg border bg-bg-secondary p-4">
            <h3 class="text-sm font-semibold text-text-primary mb-3">Storage Usage</h3>
            <div class="mb-2">
              <div class="flex justify-between text-xs text-text-muted mb-1">
                <span>{{ formatBytes(dbStats.total_size_bytes) }} used</span>
                <span>{{ formatBytes(dbStats.free_plan_limit_bytes) }} limit</span>
              </div>
              <div class="h-3 rounded-full bg-bg-tertiary overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :class="(dbStats.total_size_bytes / dbStats.free_plan_limit_bytes) > 0.8 ? 'bg-danger' : (dbStats.total_size_bytes / dbStats.free_plan_limit_bytes) > 0.6 ? 'bg-star' : 'bg-success'"
                  :style="{ width: Math.min(100, (dbStats.total_size_bytes / dbStats.free_plan_limit_bytes) * 100).toFixed(1) + '%' }"
                />
              </div>
            </div>
            <p class="text-xs text-text-muted">
              {{ ((dbStats.total_size_bytes / dbStats.free_plan_limit_bytes) * 100).toFixed(1) }}% of free plan limit
            </p>
          </div>

          <!-- Table Breakdown -->
          <div>
            <h3 class="text-sm font-semibold text-text-primary mb-3">Table Sizes</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-text-muted">
                    <th class="pb-2 font-medium">Table</th>
                    <th class="pb-2 font-medium text-right">Rows</th>
                    <th class="pb-2 font-medium text-right">Size</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="table in dbStats.tables" :key="table.name" class="border-b last:border-0">
                    <td class="py-2 pr-4 font-medium text-text-primary">{{ table.name }}</td>
                    <td class="py-2 pr-4 text-text-muted text-right tabular-nums">{{ table.rows.toLocaleString() }}</td>
                    <td class="py-2 text-text-muted text-right tabular-nums">{{ table.size }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Entry Growth -->
          <div v-if="dbStats.entry_growth?.length">
            <h3 class="text-sm font-semibold text-text-primary mb-3">Entry Growth (Last 30 Days)</h3>
            <div class="overflow-x-auto max-h-64 overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-bg-primary">
                  <tr class="border-b text-left text-text-muted">
                    <th class="pb-2 font-medium">Date</th>
                    <th class="pb-2 font-medium text-right">Entries Added</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="day in dbStats.entry_growth" :key="day.day" class="border-b last:border-0">
                    <td class="py-1.5 pr-4 text-text-primary">{{ new Date(day.day).toLocaleDateString() }}</td>
                    <td class="py-1.5 text-text-muted text-right tabular-nums">{{ day.count.toLocaleString() }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Retention Settings -->
          <div class="rounded-lg border bg-bg-secondary p-4">
            <h3 class="text-sm font-semibold text-text-primary mb-3">Entry Retention Policy</h3>
            <p class="text-xs text-text-muted mb-4">
              Entries older than the retention period are automatically deleted daily at 3:00 AM UTC.
            </p>
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Retention Period (days)</label>
                <input
                  v-model.number="retentionDays"
                  type="number"
                  min="1"
                  max="365"
                  class="input text-sm w-32"
                />
              </div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="preserveStarred"
                  type="checkbox"
                  class="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <span class="text-sm text-text-secondary">Preserve starred entries</span>
              </label>
              <div class="flex items-center gap-3 pt-2">
                <button
                  class="btn-primary text-sm py-2 px-4"
                  :disabled="savingRetention"
                  @click="saveRetentionSettings"
                >
                  {{ savingRetention ? 'Saving...' : 'Save Settings' }}
                </button>
                <button
                  class="btn-ghost text-sm py-2 px-4 text-danger"
                  :disabled="runningCleanup"
                  @click="runCleanupNow"
                >
                  <ArrowPathIcon class="h-4 w-4 inline mr-1" :class="runningCleanup ? 'animate-spin' : ''" />
                  {{ runningCleanup ? 'Running...' : 'Run Cleanup Now' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Refresh -->
          <div class="flex justify-end">
            <button class="btn-ghost text-xs" @click="loadDbStats">Refresh Stats</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Manage Feed Modal -->
    <TransitionRoot :show="showManageModal" as="template">
      <Dialog class="relative z-50" @close="closeManageModal">
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
            <DialogPanel v-if="managedFeed" class="w-full max-w-lg rounded-xl border bg-bg-primary p-6 shadow-xl max-h-[85vh] overflow-y-auto">
              <!-- Header -->
              <div class="flex items-start justify-between mb-5">
                <DialogTitle class="text-lg font-semibold text-text-primary">Manage Feed</DialogTitle>
                <button class="text-text-muted hover:text-text-primary" @click="closeManageModal">
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </div>

              <!-- Feed identity -->
              <div class="flex items-center gap-3 mb-5">
                <img
                  v-if="managedFeed.favicon_url && !managedFaviconError"
                  :src="managedFeed.favicon_url"
                  alt=""
                  class="h-10 w-10 rounded-lg shrink-0"
                  @error="managedFaviconError = true"
                />
                <div v-else class="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-tertiary shrink-0">
                  <RssIcon class="h-5 w-5 text-text-muted" />
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-text-primary truncate">{{ managedFeed.title || 'Untitled' }}</p>
                  <a
                    v-if="managedFeed.site_url"
                    :href="managedFeed.site_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs text-accent hover:underline truncate block"
                  >{{ managedFeed.site_url }}</a>
                </div>
              </div>

              <!-- Info grid -->
              <div class="rounded-lg border bg-bg-secondary/50 p-4 mb-5 space-y-3 text-sm">
                <div>
                  <p class="text-xs font-medium text-text-muted mb-0.5">Feed URL</p>
                  <p class="text-text-primary break-all text-xs">{{ managedFeed.url }}</p>
                </div>
                <div v-if="managedFeed.description">
                  <p class="text-xs font-medium text-text-muted mb-0.5">Description</p>
                  <p class="text-text-secondary text-xs line-clamp-3">{{ managedFeed.description }}</p>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-xs font-medium text-text-muted mb-0.5">Subscribers</p>
                    <p class="text-text-primary">{{ managedFeed.subscriber_count }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-text-muted mb-0.5">Last Fetched</p>
                    <p class="text-text-primary" :title="managedFeed.last_fetched_at ? new Date(managedFeed.last_fetched_at).toLocaleString() : ''">
                      {{ timeAgo(managedFeed.last_fetched_at) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-text-muted mb-0.5">Failures</p>
                    <p :class="managedFeed.consecutive_failures > 0 ? 'text-danger' : 'text-text-primary'">
                      {{ managedFeed.consecutive_failures }}
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-text-muted mb-0.5">Added</p>
                    <p class="text-text-primary">{{ new Date(managedFeed.created_at).toLocaleDateString() }}</p>
                  </div>
                </div>
                <div v-if="managedFeed.last_error_message">
                  <p class="text-xs font-medium text-text-muted mb-0.5">Last Error</p>
                  <p class="text-danger text-xs">{{ managedFeed.last_error_message }}</p>
                </div>
              </div>

              <!-- Editable fields -->
              <div class="space-y-4 mb-5">
                <div>
                  <label class="block text-xs font-medium text-text-secondary mb-1">Status</label>
                  <select
                    class="input text-sm"
                    :value="managedFeed.status"
                    @change="updateManagedField('status', ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="error">Error</option>
                    <option value="dead">Dead</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-text-secondary mb-1">Category</label>
                  <select
                    class="input text-sm"
                    :value="managedFeed.category"
                    @change="updateManagedField('category', ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="cat in FEED_CATEGORIES" :key="cat.value" :value="cat.value">
                      {{ cat.label }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Icon management -->
              <div class="mb-5">
                <label class="block text-xs font-medium text-text-secondary mb-2">Feed Icon</label>
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg border bg-bg-secondary shrink-0">
                    <img
                      v-if="managedFeed.favicon_url && !managedFaviconError"
                      :src="managedFeed.favicon_url"
                      alt=""
                      class="h-6 w-6 rounded"
                      @error="managedFaviconError = true"
                    />
                    <RssIcon v-else class="h-4 w-4 text-text-muted" />
                  </div>
                  <button
                    class="btn-ghost text-xs flex items-center gap-1.5"
                    :disabled="refetchingIcon"
                    @click="refetchFavicon"
                  >
                    <ArrowPathIcon class="h-3.5 w-3.5" :class="refetchingIcon ? 'animate-spin' : ''" />
                    {{ refetchingIcon ? 'Fetching...' : 'Refetch Icon' }}
                  </button>
                  <span class="text-xs text-text-muted">Uses Google favicon service</span>
                </div>
              </div>

              <!-- Danger zone -->
              <div class="border-t pt-4">
                <button
                  class="btn-danger text-sm px-4 py-2"
                  @click="deleteManagedFeed"
                >
                  Delete Feed
                </button>
                <p class="text-xs text-text-muted mt-1">Permanently delete this feed and all its entries.</p>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Import Feeds Modal -->
    <TransitionRoot :show="showImportModal" as="template">
      <Dialog class="relative z-50" @close="showImportModal = false">
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
              <!-- Header -->
              <div class="flex items-start justify-between mb-4">
                <div>
                  <DialogTitle class="text-lg font-semibold text-text-primary">Import Feeds to Catalog</DialogTitle>
                  <p class="text-xs text-text-muted mt-1">Add feeds to the system without subscribing your account.</p>
                </div>
                <button class="text-text-muted hover:text-text-primary" @click="showImportModal = false">
                  <XMarkIcon class="h-5 w-5" />
                </button>
              </div>

              <!-- Add by URL -->
              <form class="space-y-3 mb-5" @submit.prevent="handleAdminAddFeed">
                <div>
                  <label class="block text-xs font-medium text-text-secondary mb-1">Feed URL</label>
                  <input
                    v-model="importUrl"
                    type="url"
                    placeholder="https://example.com/feed.xml"
                    class="input text-sm"
                    required
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-text-secondary mb-1">Category</label>
                  <select v-model="importCategory" class="input text-sm">
                    <option v-for="cat in FEED_CATEGORIES" :key="cat.value" :value="cat.value">
                      {{ cat.label }}
                    </option>
                  </select>
                </div>
                <button
                  type="submit"
                  class="btn-primary text-sm py-2 px-3 w-full flex items-center justify-center gap-1.5"
                  :disabled="importLoading || !importUrl"
                >
                  <PlusIcon class="h-4 w-4" />
                  {{ importLoading ? 'Adding...' : 'Add Feed' }}
                </button>
              </form>

              <!-- Import OPML -->
              <div class="border-t border-border pt-4 space-y-3">
                <p class="text-xs font-medium text-text-secondary">Or import from OPML file</p>
                <div>
                  <input
                    type="file"
                    accept=".opml,.xml"
                    class="input text-sm"
                    @change="onOpmlFileChange"
                  />
                </div>
                <button
                  class="btn-primary text-sm py-2 px-3 w-full flex items-center justify-center gap-1.5"
                  :disabled="opmlLoading || !opmlFile"
                  @click="handleAdminImportOPML"
                >
                  <ArrowUpTrayIcon class="h-4 w-4" />
                  {{ opmlLoading ? 'Importing...' : 'Import OPML' }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>
