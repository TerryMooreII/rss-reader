<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import { errorMessage } from '@/composables/useAsyncAction'
import FormField from '@/components/ui/FormField.vue'

const router = useRouter()
const authStore = useAuthStore()
const notifications = useNotificationStore()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const handle = ref('')
const password = ref('')
const loading = ref(false)

async function handleRegister() {
  if (!email.value || !handle.value || !password.value) return
  loading.value = true
  try {
    await authStore.register({
      email: email.value,
      password: password.value,
      first_name: firstName.value,
      last_name: lastName.value,
      handle: handle.value,
    })
    notifications.success('Account created! Please check your email to confirm.')
    router.push('/login')
  } catch (e: unknown) {
    notifications.error(errorMessage(e, 'Failed to create account'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-text-primary mb-6">Create your account</h2>

    <form class="space-y-4" @submit.prevent="handleRegister">
      <div class="grid grid-cols-2 gap-3">
        <FormField label="First name">
          <input v-model="firstName" type="text" class="input" placeholder="Jane" />
        </FormField>
        <FormField label="Last name">
          <input v-model="lastName" type="text" class="input" placeholder="Doe" />
        </FormField>
      </div>

      <FormField label="Email" required>
        <input v-model="email" type="email" class="input" placeholder="you@example.com" required />
      </FormField>

      <FormField label="Handle" required>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">@</span>
          <input
            v-model="handle"
            type="text"
            class="input pl-7"
            placeholder="janedoe"
            pattern="^[a-zA-Z0-9_]{3,30}$"
            title="3-30 characters, letters, numbers, and underscores only"
            required
          />
        </div>
      </FormField>

      <FormField label="Password" required>
        <input v-model="password" type="password" class="input" placeholder="At least 6 characters" minlength="6" required />
      </FormField>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'Creating account...' : 'Create account' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-text-secondary">
      Already have an account?
      <RouterLink to="/login" class="text-accent hover:underline">Sign in</RouterLink>
    </p>
  </div>
</template>
