import { watch, onUnmounted, nextTick } from 'vue'
import { useEntryStore } from '@/stores/entries'
import { useUIStore } from '@/stores/ui'

export function useEntryNavigation() {
  const entryStore = useEntryStore()
  const uiStore = useUIStore()

  const mobileQuery = window.matchMedia('(max-width: 767px)')

  watch(
    () => entryStore.selectedEntryId,
    async (newId) => {
      if (!newId) return

      // On mobile, auto-open the reader view
      if (mobileQuery.matches) {
        uiStore.openReader()
      }

      // Scroll the selected entry into view
      await nextTick()
      const entryElement = document.querySelector(
        `[data-entry-id="${newId}"]`,
      ) as HTMLElement | null

      if (entryElement) {
        entryElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    },
  )
}
