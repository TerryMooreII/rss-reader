<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { getDatabaseStats, getRetentionSettings, saveRetentionSettings, runCleanup, type DbStats } from '@/services/admin.service'

const { run } = useAsyncAction()
const stats = ref<DbStats | null>(null)
const loading = ref(false)
const retentionDays = ref(30)
const preserveStarred = ref(true)
const saving = ref(false)
const cleaning = ref(false)
const confirmingCleanup = ref(false)

const usage = computed(() => (stats.value ? stats.value.total_size_bytes / stats.value.free_plan_limit_bytes : 0))
const usageTone = computed(() => (usage.value > 0.8 ? 'bg-danger' : usage.value > 0.6 ? 'bg-star' : 'bg-success'))

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
  return (bytes / 1073741824).toFixed(2) + ' GB'
}

async function loadStats() {
  loading.value = true
  const data = await run(getDatabaseStats, { error: 'Failed to load database stats' })
  if (data) stats.value = data
  loading.value = false
}

async function loadRetention() {
  const data = await run(getRetentionSettings, { error: 'Failed to load retention settings' })
  if (data) {
    retentionDays.value = data.days
    preserveStarred.value = data.preserve_starred
  }
}

async function saveRetention() {
  saving.value = true
  await run(() => saveRetentionSettings({ days: retentionDays.value, preserve_starred: preserveStarred.value }), {
    success: 'Retention settings saved',
    error: 'Failed to save retention settings',
  })
  saving.value = false
}

async function cleanupNow() {
  confirmingCleanup.value = false
  cleaning.value = true
  const result = await run(runCleanup, {
    success: (r) => `Cleanup complete: ${r.deleted} entries deleted`,
    error: 'Failed to run cleanup',
  })
  cleaning.value = false
  if (result) loadStats()
}

onMounted(() => {
  loadStats()
  loadRetention()
})
</script>

<template>
  <div v-if="loading && !stats" class="py-8 text-center text-text-muted">Loading database stats...</div>
  <div v-else-if="stats" class="space-y-6">
    <!-- Storage Usage -->
    <div class="rounded-lg border bg-bg-secondary p-4">
      <h3 class="text-sm font-semibold text-text-primary mb-3">Storage Usage</h3>
      <div class="mb-2">
        <div class="flex justify-between text-xs text-text-muted mb-1">
          <span>{{ formatBytes(stats.total_size_bytes) }} used</span>
          <span>{{ formatBytes(stats.free_plan_limit_bytes) }} limit</span>
        </div>
        <div class="h-3 rounded-full bg-bg-tertiary overflow-hidden">
          <div class="h-full rounded-full transition-all" :class="usageTone" :style="{ width: Math.min(100, usage * 100).toFixed(1) + '%' }" />
        </div>
      </div>
      <p class="text-xs text-text-muted">{{ (usage * 100).toFixed(1) }}% of free plan limit</p>
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
            <tr v-for="table in stats.tables" :key="table.name" class="border-b last:border-0">
              <td class="py-2 pr-4 font-medium text-text-primary">{{ table.name }}</td>
              <td class="py-2 pr-4 text-text-muted text-right tabular-nums">{{ table.rows.toLocaleString() }}</td>
              <td class="py-2 text-text-muted text-right tabular-nums">{{ table.size }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Entry Growth -->
    <div v-if="stats.entry_growth?.length">
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
            <tr v-for="day in stats.entry_growth" :key="day.day" class="border-b last:border-0">
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
      <p class="text-xs text-text-muted mb-4">Entries older than the retention period are automatically deleted daily at 3:00 AM UTC.</p>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">Retention Period (days)</label>
          <input v-model.number="retentionDays" type="number" min="1" max="365" class="input text-sm w-32" />
        </div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="preserveStarred" type="checkbox" class="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
          <span class="text-sm text-text-secondary">Preserve starred entries</span>
        </label>
        <div class="flex items-center gap-3 pt-2">
          <button class="btn-primary text-sm py-2 px-4" :disabled="saving" @click="saveRetention">
            {{ saving ? 'Saving...' : 'Save Settings' }}
          </button>
          <template v-if="confirmingCleanup">
            <span class="text-xs text-text-muted">Permanently delete entries older than {{ retentionDays }} days?</span>
            <button class="btn-danger text-sm py-2 px-4" @click="cleanupNow">Yes, run cleanup</button>
            <button class="btn-ghost text-sm py-2 px-4" @click="confirmingCleanup = false">Cancel</button>
          </template>
          <button v-else class="btn-ghost text-sm py-2 px-4 text-danger" :disabled="cleaning" @click="confirmingCleanup = true">
            <ArrowPathIcon class="h-4 w-4 inline mr-1" :class="cleaning ? 'animate-spin' : ''" />
            {{ cleaning ? 'Running...' : 'Run Cleanup Now' }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <button class="btn-ghost text-xs" @click="loadStats">Refresh Stats</button>
    </div>
  </div>
</template>
