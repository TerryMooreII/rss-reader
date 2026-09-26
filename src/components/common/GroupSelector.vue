<script setup lang="ts">
import { ref, nextTick, computed, toRef } from 'vue'
import { useGroupStore } from '@/stores/groups'
import { useNotificationStore } from '@/stores/notifications'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useClickOutside } from '@/composables/useClickOutside'
import { FolderPlusIcon, PlusIcon, CheckIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(
  defineProps<{
    mode?: 'form' | 'dropdown'
    modelValue?: string[]
    feedId?: string
    subscribeFirst?: () => Promise<void>
  }>(),
  { mode: 'form', modelValue: () => [], feedId: undefined, subscribeFirst: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [groupIds: string[]]; close: [] }>()

const groupStore = useGroupStore()
const notifications = useNotificationStore()
const { run } = useAsyncAction()

const expanded = ref(false)
const showCreate = ref(false)
const newGroupName = ref('')
const createInput = ref<HTMLInputElement | null>(null)
const pickerEl = ref<HTMLElement | null>(null)
const subscribing = ref(false)

const isDropdown = computed(() => props.mode === 'dropdown')
useClickOutside(pickerEl, () => emit('close'), toRef(isDropdown, 'value'))

async function ensureSubscribed(): Promise<boolean> {
  if (!props.subscribeFirst) return true
  subscribing.value = true
  try {
    await props.subscribeFirst()
    return true
  } catch (err) {
    notifications.error(err instanceof Error ? err.message : 'Failed to subscribe')
    return false
  } finally {
    subscribing.value = false
  }
}

const selectedCount = computed(() =>
  props.mode === 'form'
    ? props.modelValue.length
    : props.feedId
      ? groupStore.sortedGroups.filter((g) => groupStore.isFeedInGroup(g.id, props.feedId!)).length
      : 0,
)

// ── Form mode ──
function isSelected(groupId: string): boolean {
  return props.modelValue.includes(groupId)
}

function toggleSelected(groupId: string) {
  const current = props.modelValue.includes(groupId)
    ? props.modelValue.filter((id) => id !== groupId)
    : [...props.modelValue, groupId]
  emit('update:modelValue', current)
}

// ── Dropdown mode ──
function isFeedInGroup(groupId: string): boolean {
  return !!props.feedId && groupStore.isFeedInGroup(groupId, props.feedId)
}

async function toggleFeedInGroup(groupId: string) {
  if (!props.feedId) return
  const feedId = props.feedId
  const groupName = groupStore.groupById(groupId)?.name ?? 'group'
  if (isFeedInGroup(groupId)) {
    await run(() => groupStore.removeFeedFromGroup(groupId, feedId), { success: `Removed from ${groupName}`, error: 'Failed to update group' })
  } else {
    if (props.subscribeFirst && !(await ensureSubscribed())) return
    await run(() => groupStore.addFeedToGroup(groupId, feedId), { success: `Subscribed and added to ${groupName}`, error: 'Failed to update group' })
  }
}

async function subscribeOnly() {
  if (await ensureSubscribed()) {
    notifications.success('Subscribed!')
    emit('close')
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

  const group = await run(() => groupStore.createGroup(name), { error: 'Failed to create group' })
  if (!group) return

  if (props.mode === 'form') {
    emit('update:modelValue', [...props.modelValue, group.id])
  } else if (props.feedId) {
    if (props.subscribeFirst && !(await ensureSubscribed())) return
    await run(() => groupStore.addFeedToGroup(group.id, props.feedId!), { success: `Subscribed and added to ${group.name}`, error: 'Failed to add to group' })
  }

  newGroupName.value = ''
  showCreate.value = false
}
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
      <ChevronRightIcon class="ml-auto h-3 w-3 transition-transform" :class="{ 'rotate-90': expanded }" />
    </button>

    <div v-if="expanded" class="mt-2 space-y-0.5 pl-6">
      <button
        v-for="group in groupStore.sortedGroups"
        :key="group.id"
        type="button"
        class="menu-item rounded-md px-2 py-1.5"
        @click="toggleSelected(group.id)"
      >
        <CheckIcon class="h-4 w-4 shrink-0" :class="isSelected(group.id) ? 'text-accent' : 'text-transparent'" />
        <span class="truncate">{{ group.name }}</span>
      </button>

      <p v-if="groupStore.sortedGroups.length === 0 && !showCreate" class="px-2 py-1.5 text-xs text-text-muted">No groups yet</p>

      <div v-if="showCreate" class="flex items-center gap-2 px-2 py-1">
        <input
          ref="createInput"
          v-model="newGroupName"
          type="text"
          placeholder="Group name"
          class="input-sm bg-bg-secondary"
          @keydown.enter.prevent="createAndSelect"
          @keydown.escape="showCreate = false"
        />
      </div>
      <button v-else type="button" class="menu-item-muted rounded-md px-2 py-1.5" @click="startCreate">
        <PlusIcon class="h-4 w-4" />
        New group...
      </button>
    </div>
  </div>

  <!-- ── Dropdown mode: absolutely-positioned panel ── -->
  <div v-else ref="pickerEl" class="dropdown-panel w-48" @click.stop>
    <template v-if="subscribeFirst">
      <button class="menu-item" :disabled="subscribing" @click="subscribeOnly">
        <PlusIcon class="h-4 w-4 shrink-0 text-accent" />
        Subscribe only
      </button>
      <div class="my-1 border-t border-border" />
      <p class="px-3 py-1 text-xs font-medium text-text-muted">Subscribe &amp; add to group</p>
    </template>

    <button v-for="group in groupStore.sortedGroups" :key="group.id" class="menu-item" @click="toggleFeedInGroup(group.id)">
      <CheckIcon class="h-4 w-4 shrink-0" :class="isFeedInGroup(group.id) ? 'text-accent' : 'text-transparent'" />
      <span class="truncate">{{ group.name }}</span>
    </button>

    <p v-if="groupStore.sortedGroups.length === 0 && !showCreate" class="px-3 py-2 text-xs text-text-muted">No groups yet</p>

    <div class="my-1 border-t border-border" />

    <div v-if="showCreate" class="px-3 py-2">
      <input
        ref="createInput"
        v-model="newGroupName"
        type="text"
        placeholder="Group name"
        class="input-sm bg-bg-secondary"
        @keydown.enter="createAndSelect"
        @keydown.escape="showCreate = false"
      />
    </div>
    <button v-else class="menu-item-muted" @click="startCreate">
      <PlusIcon class="h-4 w-4" />
      New group...
    </button>
  </div>
</template>
