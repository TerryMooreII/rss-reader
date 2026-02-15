<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

const authStore = useAuthStore()
const notifications = useNotificationStore()

const email = ref('')
const loading = ref(false)
const sent = ref(false)

async function handleReset() {
  loading.value = true
  try {
    await authStore.resetPassword(email.value)
    sent.value = true
    notifications.success('Check your email for reset instructions')
  } catch (e: any) {
    notifications.error(e.message || 'Failed to send reset email')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-text-primary mb-2">Reset password</h2>
    <p class="text-sm text-text-secondary mb-6">
      Enter your email and we'll send you instructions to reset your password.
    </p>

    <div v-if="sent" class="text-center py-4">
      <p class="text-sm text-text-secondary mb-4">
        If an account with that email exists, you'll receive reset instructions shortly.
      </p>
      <RouterLink to="/login" class="text-sm text-accent hover:underline">
        Back to sign in
      </RouterLink>
    </div>

    <form v-else @submit.prevent="handleReset" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1">Email</label>
        <input v-model="email" type="email" class="input" placeholder="you@example.com" required />
      </div>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'Sending...' : 'Send reset email' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-text-secondary">
      <RouterLink to="/login" class="text-accent hover:underline">Back to sign in</RouterLink>
    </p>
  </div>
</template>
