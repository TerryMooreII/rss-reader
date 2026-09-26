<script setup lang="ts">
import { computed } from 'vue'

/**
 * Unread count in one of three looks:
 * - `pill`  sidebar "All" and tag rows
 * - `muted` plain small number next to a feed / group name
 * - `dot`   red counter on the mobile nav
 */
const props = withDefaults(
  defineProps<{ count: number; max?: number; variant?: 'pill' | 'muted' | 'dot' }>(),
  { max: 999, variant: 'pill' },
)

const label = computed(() => (props.count > props.max ? `${props.max}+` : String(props.count)))
</script>

<template>
  <span
    v-if="count > 0"
    :class="{
      'unread-badge': variant === 'pill',
      'text-xs text-text-muted': variant === 'muted',
      'h-4 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold text-white': variant === 'dot',
    }"
    :aria-label="`${count} unread`"
  >
    {{ label }}
  </span>
</template>
