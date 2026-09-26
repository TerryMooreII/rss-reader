<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCronHistory, type CronRun } from '@/services/admin.service'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { formatTimeAgo, formatShortDateTime } from '@/utils/date'
import StatusBadge from './StatusBadge.vue'

const { run } = useAsyncAction()
const runs = ref<CronRun[]>([])

interface PollSummary {
  feeds_polled?: number
  new_entries?: number
  errors?: number
}

function summary(r: CronRun): PollSummary | null {
  if (!r.response_content) return null
  try {
    return JSON.parse(r.response_content)
  } catch {
    return null
  }
}

async function load() {
  const data = await run(() => getCronHistory(10), { error: 'Failed to load cron history' })
  if (data) runs.value = data
}

onMounted(load)
</script>

<template>
  <div class="overflow-x-auto">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs text-text-muted">Last {{ runs.length }} cron executions</p>
      <button class="btn-ghost text-xs" @click="load">Refresh</button>
    </div>
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b text-left text-text-muted">
          <th class="pb-2 font-medium">Job</th>
          <th class="pb-2 font-medium">Status</th>
          <th class="pb-2 font-medium">Time</th>
          <th class="pb-2 font-medium">Duration</th>
          <th class="pb-2 font-medium">New Entries</th>
          <th class="pb-2 font-medium">Message</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="runs.length === 0">
          <td colspan="6" class="py-4 text-center text-text-muted">No cron runs yet</td>
        </tr>
        <tr v-for="r in runs" :key="r.run_id" class="border-b last:border-0">
          <td class="py-2 pr-4 font-medium text-text-primary">{{ r.job_name }}</td>
          <td class="py-2 pr-4"><StatusBadge :status="r.status" /></td>
          <td class="py-2 pr-4 text-text-muted" :title="formatShortDateTime(r.start_time)">{{ formatTimeAgo(r.start_time) }}</td>
          <td class="py-2 pr-4 text-text-muted">{{ r.duration_ms != null ? `${Math.round(r.duration_ms)}ms` : '-' }}</td>
          <td class="py-2 pr-4">
            <template v-if="summary(r)">
              <span class="font-medium" :class="(summary(r)!.new_entries ?? 0) > 0 ? 'text-success' : 'text-text-muted'">
                {{ summary(r)!.new_entries ?? 0 }}
              </span>
              <span class="text-text-muted text-xs ml-1">
                ({{ summary(r)!.feeds_polled }} feeds<template v-if="summary(r)!.errors">, {{ summary(r)!.errors }} err</template>)
              </span>
            </template>
            <span v-else class="text-text-muted">-</span>
          </td>
          <td class="py-2 text-text-muted truncate max-w-xs">{{ r.return_message || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
