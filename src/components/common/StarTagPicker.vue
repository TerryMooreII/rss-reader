<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useStarTagStore } from '@/stores/starTags'
import { StarIcon } from '@heroicons/vue/24/outline'
import { PlusIcon } from '@heroicons/vue/24/outline'

const emit = defineEmits<{
  select: [tagId: string | null]
  cancel: []
}>()

const starTagStore = useStarTagStore()

const showCreate = ref(false)
const newTagName = ref('')
const createInput = ref<HTMLInputElement | null>(null)
const pickerEl = ref<HTMLElement | null>(null)

function selectNoTag() {
  emit('select', null)
}

function selectTag(tagId: string) {
  emit('select', tagId)
}

async function startCreate() {
  showCreate.value = true
  await nextTick()
  createInput.value?.focus()
}

async function createAndSelect() {
  const name = newTagName.value.trim()
  if (!name) return

  const tag = await starTagStore.createTag(name)
  if (tag) {
    emit('select', tag.id)
  }
  newTagName.value = ''
  showCreate.value = false
}

function onClickOutside(e: MouseEvent) {
  if (pickerEl.value && !pickerEl.value.contains(e.target as Node)) {
    emit('cancel')
  }
}

onMounted(() => {
  setTimeout(() => document.addEventListener('click', onClickOutside), 0)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div
    ref="pickerEl"
    class="absolute z-50 mt-1 w-48 rounded-lg border border-border bg-bg-primary shadow-lg py-1"
    @click.stop
  >
    <!-- Star without tag -->
    <button
      class="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover"
      @click="selectNoTag"
    >
      <StarIcon class="h-4 w-4 text-star" />
      Star (no tag)
    </button>

    <!-- Divider -->
    <div v-if="starTagStore.sortedTags.length > 0" class="my-1 border-t border-border" />

    <!-- Existing tags -->
    <button
      v-for="tag in starTagStore.sortedTags"
      :key="tag.id"
      class="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover"
      @click="selectTag(tag.id)"
    >
      <StarIcon class="h-4 w-4 text-star" />
      {{ tag.name }}
    </button>

    <!-- Divider -->
    <div class="my-1 border-t border-border" />

    <!-- Create new tag -->
    <div v-if="showCreate" class="px-3 py-2">
      <input
        ref="createInput"
        v-model="newTagName"
        type="text"
        placeholder="Tag name"
        class="w-full rounded border border-border bg-bg-secondary px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        @keydown.enter="createAndSelect"
        @keydown.escape="showCreate = false"
      />
    </div>
    <button
      v-else
      class="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-muted hover:bg-bg-hover hover:text-text-primary"
      @click="startCreate"
    >
      <PlusIcon class="h-4 w-4" />
      New tag...
    </button>
  </div>
</template>
