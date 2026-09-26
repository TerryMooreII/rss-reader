<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ArrowUpTrayIcon } from '@heroicons/vue/24/outline'
import { supabase } from '@/config/supabase'
import type { Feed } from '@/types/models'
import PageHeader from '@/components/ui/PageHeader.vue'
import TabBar from '@/components/ui/TabBar.vue'
import AdminFeedsTable from '@/components/admin/AdminFeedsTable.vue'
import AdminCronTab from '@/components/admin/AdminCronTab.vue'
import AdminUsersTab from '@/components/admin/AdminUsersTab.vue'
import AdminDatabaseTab from '@/components/admin/AdminDatabaseTab.vue'
import ManageFeedDialog from '@/components/admin/ManageFeedDialog.vue'
import ImportFeedsDialog from '@/components/admin/ImportFeedsDialog.vue'

type TabId = 'feeds' | 'users' | 'cron' | 'database'
const tabs: { id: TabId; label: string }[] = [
  { id: 'feeds', label: 'Feeds' },
  { id: 'users', label: 'Users' },
  { id: 'cron', label: 'Cron Jobs' },
  { id: 'database', label: 'Database' },
]
const activeTab = ref<TabId>('feeds')

// Dashboard stats
const stats = ref({ total: 0, active: 0, failing: 0, users: 0 })

// Feed table state
const feeds = ref<Feed[]>([])
const loading = ref(false)
const categoryFilter = ref('')
const sortColumn = ref('created_at')
const sortAsc = ref(false)
const pageSize = ref(25)
const page = ref(1)
const totalFeeds = ref(0)
let loadSeq = 0

const managedFeed = ref<Feed | null>(null)
const showImport = ref(false)

async function loadFeeds() {
  const seq = ++loadSeq
  loading.value = true
  let query = supabase.from('feeds').select('*', { count: 'exact' })
  if (categoryFilter.value) query = query.eq('category', categoryFilter.value)
  const from = (page.value - 1) * pageSize.value
  const { data, error, count } = await query.order(sortColumn.value, { ascending: sortAsc.value }).range(from, from + pageSize.value - 1)
  if (seq !== loadSeq) return
  if (!error) {
    feeds.value = (data ?? []) as Feed[]
    totalFeeds.value = count ?? 0
  }
  loading.value = false
}

async function loadStats() {
  const count = (q: ReturnType<typeof supabase.from>) => q.select('id', { count: 'exact', head: true })
  const [total, active, failing, users] = await Promise.all([
    count(supabase.from('feeds')),
    supabase.from('feeds').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('feeds').select('id', { count: 'exact', head: true }).in('status', ['error', 'dead']),
    count(supabase.from('profiles')),
  ])
  stats.value = { total: total.count ?? 0, active: active.count ?? 0, failing: failing.count ?? 0, users: users.count ?? 0 }
}

function onSort(column: string) {
  if (sortColumn.value === column) sortAsc.value = !sortAsc.value
  else {
    sortColumn.value = column
    sortAsc.value = true
  }
}

// Reset to page 1 when filter, sort, or page size changes; the page watcher reloads.
watch([categoryFilter, sortColumn, sortAsc, pageSize], () => {
  if (page.value !== 1) page.value = 1
  else loadFeeds()
})
watch(page, loadFeeds)

function onFeedUpdated(updated: Feed) {
  const i = feeds.value.findIndex((f) => f.id === updated.id)
  if (i !== -1) feeds.value[i] = updated
  managedFeed.value = updated
}

function onFeedDeleted(id: string) {
  feeds.value = feeds.value.filter((f) => f.id !== id)
  totalFeeds.value--
  managedFeed.value = null
  loadStats()
}

function onImported() {
  loadFeeds()
  loadStats()
}

onMounted(() => {
  loadFeeds()
  loadStats()
})
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-4xl px-4 py-6">
      <PageHeader title="Admin Dashboard">
        <button class="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5 ml-auto" @click="showImport = true">
          <ArrowUpTrayIcon class="h-4 w-4" />
          Import Feeds
        </button>
      </PageHeader>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div
          v-for="card in [
            { label: 'Total Feeds', value: stats.total },
            { label: 'Active Feeds', value: stats.active },
            { label: 'Failing Feeds', value: stats.failing },
            { label: 'Users', value: stats.users },
          ]"
          :key="card.label"
          class="rounded-lg border bg-bg-secondary p-4"
        >
          <p class="text-2xl font-bold text-text-primary">{{ card.value }}</p>
          <p class="text-xs text-text-muted">{{ card.label }}</p>
        </div>
      </div>

      <TabBar v-model="activeTab" :tabs="tabs" />

      <AdminFeedsTable
        v-if="activeTab === 'feeds'"
        v-model:page="page"
        v-model:page-size="pageSize"
        v-model:category-filter="categoryFilter"
        :feeds="feeds"
        :loading="loading"
        :total="totalFeeds"
        :sort-column="sortColumn"
        :sort-asc="sortAsc"
        @sort="onSort"
        @manage="managedFeed = $event"
      />
      <AdminUsersTab v-else-if="activeTab === 'users'" />
      <AdminCronTab v-else-if="activeTab === 'cron'" />
      <AdminDatabaseTab v-else-if="activeTab === 'database'" />
    </div>

    <ManageFeedDialog :feed="managedFeed" @close="managedFeed = null" @updated="onFeedUpdated" @deleted="onFeedDeleted" />
    <ImportFeedsDialog :open="showImport" @close="showImport = false" @imported="onImported" />
  </div>
</template>
