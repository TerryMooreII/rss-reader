<script setup lang="ts">
/**
 * Yes/No confirmation rendered in place of the action it guards.
 * `inline` sits in a row of icon buttons; `stacked` fills a dropdown panel.
 */
withDefaults(
  defineProps<{
    prompt?: string
    confirmLabel?: string
    cancelLabel?: string
    layout?: 'inline' | 'stacked'
  }>(),
  { prompt: 'Delete?', confirmLabel: 'Yes', cancelLabel: 'No', layout: 'inline' },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div v-if="layout === 'stacked'" class="px-3 py-2">
    <p class="mb-2 text-xs text-text-secondary">{{ prompt }}</p>
    <div class="flex gap-2">
      <button
        class="flex-1 rounded-md bg-danger px-2 py-1 text-xs font-medium text-white hover:bg-danger/80"
        @click.prevent.stop="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
      <button
        class="flex-1 rounded-md bg-bg-secondary px-2 py-1 text-xs font-medium text-text-primary hover:bg-bg-tertiary"
        @click.prevent.stop="emit('cancel')"
      >
        {{ cancelLabel }}
      </button>
    </div>
  </div>
  <template v-else>
    <span class="mr-1 text-xs text-text-muted">{{ prompt }}</span>
    <button
      class="rounded bg-danger px-2 py-1 text-xs font-medium text-white hover:bg-danger/80"
      @click.stop="emit('confirm')"
    >
      {{ confirmLabel }}
    </button>
    <button
      class="rounded bg-bg-primary px-2 py-1 text-xs font-medium text-text-primary hover:bg-bg-hover"
      @click.stop="emit('cancel')"
    >
      {{ cancelLabel }}
    </button>
  </template>
</template>
