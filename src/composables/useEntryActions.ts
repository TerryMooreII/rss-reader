import { ref, computed, watch, type Ref } from 'vue'
import type { Entry } from '@/types/models'
import { useEntryStore } from '@/stores/entries'
import { useUIStore } from '@/stores/ui'

/**
 * Star / read / open / share behaviour shared by the reader and feed cards.
 * Popover state resets whenever the entry changes.
 */
export function useEntryActions(entry: Ref<Entry | null | undefined>) {
  const entryStore = useEntryStore()
  const ui = useUIStore()

  const shareOpen = ref(false)
  const starPickerOpen = ref(false)

  const isRead = computed(() => !!entry.value?.read_at)
  const isStarred = computed(() => !!entry.value?.starred_at)

  watch(
    () => entry.value?.id,
    () => {
      shareOpen.value = false
      starPickerOpen.value = false
    },
  )

  function handleStarClick() {
    if (!entry.value) return
    if (isStarred.value) entryStore.toggleStar(entry.value.id)
    else starPickerOpen.value = !starPickerOpen.value
  }

  function onStarTagSelect(tagId: string | null) {
    if (entry.value) entryStore.toggleStar(entry.value.id, tagId)
    starPickerOpen.value = false
  }

  function toggleRead() {
    if (entry.value) entryStore.toggleRead(entry.value.id)
  }

  function openExternal() {
    const url = entry.value?.url
    if (!url) return
    if (ui.openLinksInNewTab) window.open(url, '_blank')
    else window.location.href = url
  }

  return { shareOpen, starPickerOpen, isRead, isStarred, handleStarClick, onStarTagSelect, toggleRead, openExternal }
}
