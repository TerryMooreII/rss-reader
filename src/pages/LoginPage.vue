<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const notifications = useNotificationStore()

const email = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/app/all'
    router.push(redirect)
  } catch (e: any) {
    notifications.error(e.message || 'Failed to sign in')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-text-primary mb-6">Sign in to Acta</h2>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1">Email</label>
        <input v-model="email" type="email" class="input" placeholder="you@example.com" required />
      </div>

      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1">Password</label>
        <input
          v-model="password"
          type="password"
          class="input"
          placeholder="Your password"
          required
        />
      </div>

      <div class="flex items-center justify-between">
        <RouterLink to="/forgot-password" class="text-sm text-accent hover:underline">
          Forgot password?
        </RouterLink>
      </div>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-text-secondary">
      Don't have an account?
      <RouterLink to="/register" class="text-accent hover:underline">Sign up</RouterLink>
    </p>
  </div>
</template>
