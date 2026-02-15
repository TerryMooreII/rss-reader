<script setup lang="ts">
import type { Toast } from '@/types/models'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/20/solid'

defineProps<{ toast: Toast }>()
defineEmits<{ dismiss: [] }>()

const iconMap = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
  warning: ExclamationCircleIcon,
}

const colorMap = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
  warning: 'text-star',
}
</script>

<template>
  <div
    class="flex items-start gap-3 rounded-lg border bg-bg-primary px-4 py-3 shadow-lg"
    role="alert"
  >
    <component :is="iconMap[toast.type]" class="h-5 w-5 shrink-0" :class="colorMap[toast.type]" />
    <p class="flex-1 text-sm text-text-primary">{{ toast.message }}</p>
    <button class="shrink-0 text-text-muted hover:text-text-primary" @click="$emit('dismiss')">
      <XMarkIcon class="h-4 w-4" />
    </button>
  </div>
</template>
