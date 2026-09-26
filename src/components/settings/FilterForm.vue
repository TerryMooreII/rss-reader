<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ContentFilter } from '@/types/models'
import type { ContentFilterInput } from '@/stores/filters'
import { useFeedStore } from '@/stores/feeds'
import { useGroupStore } from '@/stores/groups'
import { useStarTagStore } from '@/stores/starTags'
import { useAsyncAction } from '@/composables/useAsyncAction'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'

type FilterAction = ContentFilter['action']

/**
 * Keyword / scope / action / tag editor used both to create a filter and to
 * edit one in place. Emits the resolved payload; a "New tag..." entry is
 * created here before submitting.
 */
const props = withDefaults(
  defineProps<{ initial?: ContentFilter | null; size?: 'sm' | 'md'; submitLabel?: string; autofocus?: boolean }>(),
  { initial: null, size: 'md', submitLabel: 'Add Filter', autofocus: false },
)
const emit = defineEmits<{ submit: [payload: ContentFilterInput]; cancel: [] }>()

const feedStore = useFeedStore()
const groupStore = useGroupStore()
const starTagStore = useStarTagStore()
const { run } = useAsyncAction()

const keyword = ref('')
const scopeValue = ref('global:null')
const action = ref<FilterAction>('hide')
const starTagId = ref<string | null>(null)
const newTagName = ref('')
const showNewTagInput = ref(false)
const keywordInput = ref<HTMLInputElement | null>(null)

function load(filter: ContentFilter | null) {
  keyword.value = filter?.keyword ?? ''
  scopeValue.value = filter ? `${filter.scope_type}:${filter.scope_id ?? 'null'}` : 'global:null'
  action.value = filter?.action ?? 'hide'
  starTagId.value = filter?.star_tag_id ?? null
  newTagName.value = ''
  showNewTagInput.value = false
}
watch(() => props.initial, load, { immediate: true })
watch(keywordInput, (el) => {
  if (el && props.autofocus) {
    el.focus()
    el.select()
  }
})

const actionOptions = [
  { value: 'hide' as FilterAction, label: 'Hide' },
  { value: 'mark_read' as FilterAction, label: 'Mark Read' },
  { value: 'auto_star' as FilterAction, label: 'Auto Star', activeClass: 'bg-star/10 text-star' },
]

const canSubmit = computed(
  () => !!keyword.value.trim() && (action.value !== 'auto_star' || !!starTagId.value || !!newTagName.value.trim()),
)

const inputClass = computed(() => (props.size === 'sm' ? 'input-sm' : 'input'))

async function submit() {
  if (!canSubmit.value) return

  let tagId: string | null = null
  if (action.value === 'auto_star') {
    if (showNewTagInput.value && newTagName.value.trim()) {
      const tag = await run(() => starTagStore.createTag(newTagName.value.trim()), { error: 'Failed to create tag' })
      if (!tag) return
      tagId = tag.id
    } else {
      tagId = starTagId.value
    }
  }

  const idx = scopeValue.value.indexOf(':')
  const scope_type = scopeValue.value.slice(0, idx) as ContentFilter['scope_type']
  const id = scopeValue.value.slice(idx + 1)

  emit('submit', {
    keyword: keyword.value.trim(),
    scope_type,
    scope_id: id === 'null' ? null : id,
    action: action.value,
    star_tag_id: tagId,
  })
}

function reset() {
  load(null)
}
defineExpose({ reset })
</script>

<template>
  <div :class="size === 'sm' ? 'space-y-2' : 'space-y-3'">
    <input
      ref="keywordInput"
      v-model="keyword"
      type="text"
      placeholder="e.g. sponsored, crypto OR nft, &quot;breaking news&quot; -sports"
      :class="inputClass"
      @keydown.enter="submit"
      @keydown.escape="emit('cancel')"
    />

    <div class="flex flex-col sm:flex-row gap-2">
      <select v-model="scopeValue" :class="[inputClass, 'flex-1']">
        <option value="global:null">All feeds</option>
        <optgroup v-if="feedStore.feeds.length > 0" label="Specific Feed">
          <option v-for="feed in feedStore.feeds" :key="feed.id" :value="`feed:${feed.id}`">
            {{ feed.custom_title || feed.title || feed.url }}
          </option>
        </optgroup>
        <optgroup v-if="groupStore.sortedGroups.length > 0" label="Specific Group">
          <option v-for="group in groupStore.sortedGroups" :key="group.id" :value="`group:${group.id}`">
            {{ group.name }}
          </option>
        </optgroup>
      </select>

      <SegmentedControl v-model="action" :options="actionOptions" variant="joined" :size="size" class="shrink-0" label="Filter action" />
    </div>

    <!-- Tag selector for auto_star -->
    <div v-if="action === 'auto_star'" class="flex gap-2 items-center">
      <template v-if="!showNewTagInput">
        <select v-model="starTagId" :class="[inputClass, 'flex-1']">
          <option :value="null" disabled>Select a tag...</option>
          <option v-for="tag in starTagStore.sortedTags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
        </select>
        <button type="button" class="btn-secondary shrink-0" :class="size === 'sm' ? 'px-2 py-1 text-xs' : ''" @click="showNewTagInput = true">
          New tag...
        </button>
      </template>
      <template v-else>
        <input
          v-model="newTagName"
          type="text"
          placeholder="New tag name"
          :class="[inputClass, 'flex-1']"
          @keydown.enter="submit"
          @keydown.escape="(showNewTagInput = false), (newTagName = '')"
        />
        <button type="button" class="btn-ghost shrink-0" :class="size === 'sm' ? 'px-2 py-1 text-xs' : ''" @click="(showNewTagInput = false), (newTagName = '')">
          Cancel
        </button>
      </template>
    </div>

    <div class="flex items-center gap-2">
      <button type="button" class="btn-primary flex items-center gap-1" :class="size === 'sm' ? 'px-3 py-1.5 text-xs' : ''" :disabled="!canSubmit" @click="submit">
        <slot name="submit-icon" />
        {{ submitLabel }}
      </button>
      <slot name="actions" />
    </div>
  </div>
</template>
