<script setup lang="ts">
import { useNotificationStore } from '@/stores/notifications'
import ToastItem from './ToastItem.vue'

const notifications = useNotificationStore()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <TransitionGroup name="slide-up">
        <ToastItem
          v-for="toast in notifications.toasts"
          :key="toast.id"
          :toast="toast"
          @dismiss="notifications.dismiss(toast.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>
