<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { errorMessage } from '@/composables/useAsyncAction'
import FormField from '@/components/ui/FormField.vue'

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
  } catch (e: unknown) {
    notifications.error(errorMessage(e, 'Failed to sign in'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-text-primary mb-6">Sign in to Acta</h2>

    <form class="space-y-4" @submit.prevent="handleLogin">
      <FormField label="Email">
        <input v-model="email" type="email" class="input" placeholder="you@example.com" required />
      </FormField>

      <FormField label="Password">
        <input v-model="password" type="password" class="input" placeholder="Your password" required />
      </FormField>

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
