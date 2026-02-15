<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

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
  } catch (e: any) {
    notifications.error(e.message || 'Failed to create account')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-text-primary mb-6">Create your account</h2>

    <form @submit.prevent="handleRegister" class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1">First name</label>
          <input v-model="firstName" type="text" class="input" placeholder="Jane" />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-secondary mb-1">Last name</label>
          <input v-model="lastName" type="text" class="input" placeholder="Doe" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1"
          >Email <span class="text-danger">*</span></label
        >
        <input v-model="email" type="email" class="input" placeholder="you@example.com" required />
      </div>

      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1"
          >Handle <span class="text-danger">*</span></label
        >
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
      </div>

      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1"
          >Password <span class="text-danger">*</span></label
        >
        <input
          v-model="password"
          type="password"
          class="input"
          placeholder="At least 6 characters"
          minlength="6"
          required
        />
      </div>

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
