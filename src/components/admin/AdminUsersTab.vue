<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/config/supabase'
import type { UserProfile } from '@/types/models'
import { useAsyncAction } from '@/composables/useAsyncAction'

const { run } = useAsyncAction()
const users = ref<UserProfile[]>([])

async function load() {
  const data = await run(
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, handle, first_name, last_name, avatar_url, role, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as UserProfile[]
    },
    { error: 'Failed to load users' },
  )
  if (data) users.value = data
}

async function toggleRole(user: UserProfile) {
  const newRole = user.role === 'admin' ? 'user' : 'admin'
  const ok = await run(
    async () => {
      const { error } = await supabase.rpc('admin_update_user_role', { p_target_user_id: user.id, p_new_role: newRole })
      if (error) throw error
      return true
    },
    { success: `User role updated to ${newRole}`, error: 'Failed to update role' },
  )
  if (ok) user.role = newRole
}

onMounted(load)
</script>

<template>
  <div class="overflow-x-auto">
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
            <p class="font-medium text-text-primary">{{ user.first_name }} {{ user.last_name }}</p>
            <p class="text-xs text-text-muted">@{{ user.handle }} &middot; {{ user.email }}</p>
          </td>
          <td class="py-2 pr-4">
            <span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" :class="user.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-bg-secondary text-text-secondary'">
              {{ user.role }}
            </span>
          </td>
          <td class="py-2 pr-4 text-text-muted">{{ new Date(user.created_at).toLocaleDateString() }}</td>
          <td class="py-2">
            <button class="btn-ghost text-xs" @click="toggleRole(user)">{{ user.role === 'admin' ? 'Demote' : 'Make Admin' }}</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
