<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useGroupStore } from '@/stores/groups'
import { useNotificationStore } from '@/stores/notifications'
import {
  FolderPlusIcon,
  PlusIcon,
  CheckIcon,
  ChevronRightIcon,
} from '@heroicons/vue/24/outline'

const props = withDefaults(
  defineProps<{
    mode?: 'form' | 'dropdown'
    modelValue?: string[]
    feedId?: string
    subscribeFirst?: () => Promise<void>
  }>(),
  {
    mode: 'form',
    modelValue: () => [],
    subscribeFirst: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [groupIds: string[]]
  close: []
}>()

const groupStore = useGroupStore()
const notifications = useNotificationStore()

const expanded = ref(false)
const showCreate = ref(false)
const newGroupName = ref('')
const createInput = ref<HTMLInputElement | null>(null)
const pickerEl = ref<HTMLElement | null>(null)
const subscribing = ref(false)

async function ensureSubscribed(): Promise<boolean> {
  if (!props.subscribeFirst) return true
  subscribing.value = true
  try {
    await props.subscribeFirst()
    return true
  } catch {
    return false
  } finally {
    subscribing.value = false
  }
}

const selectedCount = computed(() =>
  props.mode === 'form'
    ? props.modelValue.length
    : props.feedId
      ? groupStore.sortedGroups.filter((g) =>
          groupStore.feedsByGroup(g.id).includes(props.feedId!),
        ).length
      : 0,
)

// ── Form mode helpers ──

function isSelected(groupId: string): boolean {
  return props.modelValue.includes(groupId)
}

function toggleSelected(groupId: string) {
  const current = [...props.modelValue]
  const idx = current.indexOf(groupId)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(groupId)
  }
  emit('update:modelValue', current)
}

// ── Dropdown mode helpers ──

function isFeedInGroup(groupId: string): boolean {
  if (!props.feedId) return false
  return groupStore.feedsByGroup(groupId).includes(props.feedId)
}

async function toggleFeedInGroup(groupId: string) {
  if (!props.feedId) return
  if (isFeedInGroup(groupId)) {
    await groupStore.removeFeedFromGroup(groupId, props.feedId)
    const group = groupStore.groupById(groupId)
    notifications.success(`Removed from ${group?.name ?? 'group'}`)
  } else {
    if (props.subscribeFirst) {
      const ok = await ensureSubscribed()
      if (!ok) return
    }
    await groupStore.addFeedToGroup(groupId, props.feedId)
    const group = groupStore.groupById(groupId)
    notifications.success(`Subscribed and added to ${group?.name ?? 'group'}`)
  }
}

// ── Shared: inline create ──

async function startCreate() {
  showCreate.value = true
  await nextTick()
  createInput.value?.focus()
}

async function createAndSelect() {
  const name = newGroupName.value.trim()
  if (!name) return

  const group = await groupStore.createGroup(name)
  if (!group) return

  if (props.mode === 'form') {
    emit('update:modelValue', [...props.modelValue, group.id])
  } else if (props.feedId) {
    if (props.subscribeFirst) {
      const ok = await ensureSubscribed()
      if (!ok) return
    }
    await groupStore.addFeedToGroup(group.id, props.feedId)
    notifications.success(`Subscribed and added to ${group.name}`)
  }

  newGroupName.value = ''
  showCreate.value = false
}

// ── Dropdown: click-outside ──

function onClickOutside(e: MouseEvent) {
  if (props.mode === 'dropdown' && pickerEl.value && !pickerEl.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  if (props.mode === 'dropdown') {
    setTimeout(() => document.addEventListener('click', onClickOutside), 0)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <!-- ── Form mode: collapsible disclosure ── -->
  <div v-if="mode === 'form'">
    <button
      type="button"
      class="flex w-full items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      @click="expanded = !expanded"
    >
      <FolderPlusIcon class="h-4 w-4" />
      <span>Add to Group</span>
      <span v-if="selectedCount > 0" class="text-xs text-accent">({{ selectedCount }})</span>
      <span v-else class="text-xs text-text-muted">(optional)</span>
      <ChevronRightIcon
        class="ml-auto h-3 w-3 transition-transform"
        :class="{ 'rotate-90': expanded }"
      />
    </button>

    <div v-if="expanded" class="mt-2 space-y-0.5 pl-6">
      <button
        v-for="group in groupStore.sortedGroups"
        :key="group.id"
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-primary hover:bg-bg-hover transition-colors"
        @click="toggleSelected(group.id)"
      >
        <CheckIcon
          class="h-4 w-4 shrink-0"
          :class="isSelected(group.id) ? 'text-accent' : 'text-transparent'"
        />
        <span class="truncate">{{ group.name }}</span>
      </button>

      <!-- Empty state -->
      <p
        v-if="groupStore.sortedGroups.length === 0 && !showCreate"
        class="px-2 py-1.5 text-xs text-text-muted"
      >
        No groups yet
      </p>

      <!-- Inline create -->
      <div v-if="showCreate" class="flex items-center gap-2 px-2 py-1">
        <input
          ref="createInput"
          v-model="newGroupName"
          type="text"
          placeholder="Group name"
          class="w-full rounded border border-border bg-bg-secondary px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          @keydown.enter.prevent="createAndSelect"
          @keydown.escape="showCreate = false"
        />
      </div>
      <button
        v-else
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors"
        @click="startCreate"
      >
        <PlusIcon class="h-4 w-4" />
        New group...
      </button>
    </div>
  </div>

  <!-- ── Dropdown mode: absolutely-positioned panel ── -->
  <div
    v-else
    ref="pickerEl"
    class="absolute z-50 mt-1 w-48 rounded-lg border border-border bg-bg-primary shadow-lg py-1"
    @click.stop
  >
    <!-- Subscribe only (no group) — shown when used as split button -->
    <template v-if="subscribeFirst">
      <button
        class="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover"
        :disabled="subscribing"
        @click="ensureSubscribed().then((ok) => { if (ok) { notifications.success('Subscribed!'); emit('close') } })"
      >
        <PlusIcon class="h-4 w-4 shrink-0 text-accent" />
        Subscribe only
      </button>
      <div class="my-1 border-t border-border" />
      <p class="px-3 py-1 text-xs font-medium text-text-muted">Subscribe &amp; add to group</p>
    </template>

    <button
      v-for="group in groupStore.sortedGroups"
      :key="group.id"
      class="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-hover"
      @click="toggleFeedInGroup(group.id)"
    >
      <CheckIcon
        class="h-4 w-4 shrink-0"
        :class="isFeedInGroup(group.id) ? 'text-accent' : 'text-transparent'"
      />
      <span class="truncate">{{ group.name }}</span>
    </button>

    <!-- Empty state -->
    <p
      v-if="groupStore.sortedGroups.length === 0 && !showCreate"
      class="px-3 py-2 text-xs text-text-muted"
    >
      No groups yet
    </p>

    <!-- Divider -->
    <div class="my-1 border-t border-border" />

    <!-- Inline create -->
    <div v-if="showCreate" class="px-3 py-2">
      <input
        ref="createInput"
        v-model="newGroupName"
        type="text"
        placeholder="Group name"
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
      New group...
    </button>
  </div>
</template>
