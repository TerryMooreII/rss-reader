<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useClickOutside } from '@/composables/useClickOutside'

/**
 * Absolutely positioned menu panel with the app's open/close transition.
 * The document click-outside listener exists only while `open` is true.
 */
const props = withDefaults(
  defineProps<{ open: boolean; panelClass?: string; width?: string }>(),
  { panelClass: 'right-2 top-full', width: 'w-48' },
)
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
useClickOutside(panel, () => emit('close'), toRef(props, 'open'))
</script>

<template>
  <Transition
    enter-active-class="transition duration-100 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-75 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="open" ref="panel" role="menu" class="dropdown-panel" :class="[panelClass, width]" @click.stop>
      <slot />
    </div>
  </Transition>
</template>
