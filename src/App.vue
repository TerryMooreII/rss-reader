<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import ToastContainer from '@/components/notifications/ToastContainer.vue'

const authStore = useAuthStore()

// Kick off session restoration immediately (not in onMounted)
// so the router guard's `await auth.untilReady()` resolves as early as possible.
authStore.initialize()
</script>

<template>
  <RouterView />
  <ToastContainer />
</template>
