<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useStarTagStore } from '@/stores/starTags'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useClickOutside } from '@/composables/useClickOutside'
import { StarIcon, PlusIcon } from '@heroicons/vue/24/outline'

const emit = defineEmits<{ select: [tagId: string | null]; cancel: [] }>()

const starTagStore = useStarTagStore()
const { run } = useAsyncAction()

const showCreate = ref(false)
const newTagName = ref('')
const createInput = ref<HTMLInputElement | null>(null)
const pickerEl = ref<HTMLElement | null>(null)

useClickOutside(pickerEl, () => emit('cancel'), ref(true))

async function startCreate() {
  showCreate.value = true
  await nextTick()
  createInput.value?.focus()
}

async function createAndSelect() {
  const name = newTagName.value.trim()
  if (!name) return
  const tag = await run(() => starTagStore.createTag(name), { error: 'Failed to create tag' })
  if (tag) emit('select', tag.id)
  newTagName.value = ''
  showCreate.value = false
}
</script>

<template>
  <div ref="pickerEl" class="dropdown-panel w-48" @click.stop>
    <button class="menu-item" @click="emit('select', null)">
      <StarIcon class="h-4 w-4 text-star" />
      Star (no tag)
    </button>

    <div v-if="starTagStore.sortedTags.length > 0" class="my-1 border-t border-border" />

    <button v-for="tag in starTagStore.sortedTags" :key="tag.id" class="menu-item" @click="emit('select', tag.id)">
      <StarIcon class="h-4 w-4 text-star" />
      {{ tag.name }}
    </button>

    <div class="my-1 border-t border-border" />

    <div v-if="showCreate" class="px-3 py-2">
      <input
        ref="createInput"
        v-model="newTagName"
        type="text"
        placeholder="Tag name"
        class="input-sm bg-bg-secondary"
        @keydown.enter="createAndSelect"
        @keydown.escape="showCreate = false"
      />
    </div>
    <button v-else class="menu-item-muted" @click="startCreate">
      <PlusIcon class="h-4 w-4" />
      New tag...
    </button>
  </div>
</template>
