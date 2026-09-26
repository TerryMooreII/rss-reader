<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

withDefaults(
  defineProps<{ open: boolean; title: string; description?: string; maxWidth?: string; scroll?: boolean }>(),
  { description: undefined, maxWidth: 'max-w-md', scroll: false },
)
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <TransitionRoot :show="open" as="template">
    <Dialog class="relative z-50" @close="emit('close')">
      <TransitionChild
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/40" />
      </TransitionChild>

      <div class="fixed inset-0 flex items-center justify-center p-4">
        <TransitionChild
          enter="ease-out duration-200"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="ease-in duration-150"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel
            class="w-full rounded-xl border bg-bg-primary p-6 shadow-xl"
            :class="[maxWidth, scroll ? 'max-h-[85vh] overflow-y-auto' : '']"
          >
            <div class="mb-4 flex items-start justify-between">
              <div>
                <DialogTitle class="text-lg font-semibold text-text-primary">{{ title }}</DialogTitle>
                <p v-if="description" class="mt-1 text-xs text-text-muted">{{ description }}</p>
              </div>
              <button class="text-text-muted hover:text-text-primary" aria-label="Close" @click="emit('close')">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
            <slot />
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
