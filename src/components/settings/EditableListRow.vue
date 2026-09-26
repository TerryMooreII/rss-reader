<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import InlineConfirm from '@/components/ui/InlineConfirm.vue'

/**
 * One row of a settings list: a name that can be edited in place, optional
 * metadata, and rename / delete actions with an inline delete confirmation.
 * The row owns its input, so focusing it never touches a `ref` inside `v-for`.
 */
const props = defineProps<{ name: string; editing: boolean; confirmingDelete: boolean }>()
const emit = defineEmits<{
  'start-edit': []
  save: [name: string]
  'cancel-edit': []
  'start-delete': []
  'confirm-delete': []
  'cancel-delete': []
}>()

const draft = ref(props.name)
const input = ref<HTMLInputElement | null>(null)

watch(
  () => props.editing,
  async (editing) => {
    if (!editing) return
    draft.value = props.name
    await nextTick()
    input.value?.focus()
    input.value?.select()
  },
)

function save() {
  const name = draft.value.trim()
  if (name) emit('save', name)
  else emit('cancel-edit')
}
</script>

<template>
  <div class="flex items-center gap-3 p-3">
    <slot name="prefix" />

    <div class="flex-1 min-w-0">
      <input
        v-if="editing"
        ref="input"
        v-model="draft"
        type="text"
        class="input-sm"
        @keydown.enter="save"
        @keydown.escape="emit('cancel-edit')"
      />
      <span v-else class="text-sm font-medium text-text-primary">{{ name }}</span>
    </div>

    <slot name="meta" />

    <div class="flex items-center gap-1 shrink-0">
      <template v-if="editing">
        <button class="rounded p-1 text-accent hover:bg-bg-hover" aria-label="Save" @click="save">
          <CheckIcon class="h-4 w-4" />
        </button>
        <button class="rounded p-1 text-text-muted hover:bg-bg-hover" aria-label="Cancel" @click="emit('cancel-edit')">
          <XMarkIcon class="h-4 w-4" />
        </button>
      </template>
      <InlineConfirm v-else-if="confirmingDelete" @confirm="emit('confirm-delete')" @cancel="emit('cancel-delete')" />
      <template v-else>
        <button class="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-primary" aria-label="Rename" @click="emit('start-edit')">
          <PencilIcon class="h-4 w-4" />
        </button>
        <button class="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-danger" aria-label="Delete" @click="emit('start-delete')">
          <TrashIcon class="h-4 w-4" />
        </button>
      </template>
    </div>
  </div>
</template>
