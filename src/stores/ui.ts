import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

type Theme = 'light' | 'dark' | 'midnight' | 'forest'
type DisplayMode = 'comfortable' | 'compact'

const LS_THEME = 'acta:theme'
const LS_DISPLAY_MODE = 'acta:displayMode'
const LS_SIDEBAR_OPEN = 'acta:sidebarOpen'
const LS_LIST_WIDTH = 'acta:listWidth'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const useUIStore = defineStore('ui', () => {
  // ---------------------------------------------------------------------------
  // State — all persisted to localStorage
  // ---------------------------------------------------------------------------
  const theme = ref<Theme>(loadFromStorage<Theme>(LS_THEME, 'light'))
  const displayMode = ref<DisplayMode>(
    loadFromStorage<DisplayMode>(LS_DISPLAY_MODE, 'comfortable'),
  )
  const sidebarOpen = ref<boolean>(
    window.innerWidth < 768 ? false : loadFromStorage<boolean>(LS_SIDEBAR_OPEN, true),
  )
  const listWidth = ref<number>(loadFromStorage<number>(LS_LIST_WIDTH, 380))

  // Transient UI state (not persisted)
  const readerOpen = ref(false)
  const searchOpen = ref(false)
  const shortcutsDialogOpen = ref(false)

  // ---------------------------------------------------------------------------
  // Watchers — persist to localStorage on change
  // ---------------------------------------------------------------------------
  watch(theme, (val) => localStorage.setItem(LS_THEME, JSON.stringify(val)))
  watch(displayMode, (val) => localStorage.setItem(LS_DISPLAY_MODE, JSON.stringify(val)))
  watch(sidebarOpen, (val) => localStorage.setItem(LS_SIDEBAR_OPEN, JSON.stringify(val)))
  watch(listWidth, (val) => localStorage.setItem(LS_LIST_WIDTH, JSON.stringify(val)))

  // Apply the theme class to the document whenever it changes
  watch(
    theme,
    (val) => {
      const root = document.documentElement
      root.classList.remove('theme-light', 'theme-dark', 'theme-midnight', 'theme-forest')
      root.classList.add(`theme-${val}`)
      const isDark = val === 'dark' || val === 'midnight' || val === 'forest'
      root.style.colorScheme = isDark ? 'dark' : 'light'
    },
    { immediate: true },
  )

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function setTheme(newTheme: Theme): void {
    theme.value = newTheme
  }

  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
  }

  function closeSidebar(): void {
    sidebarOpen.value = false
  }

  function setDisplayMode(mode: DisplayMode): void {
    displayMode.value = mode
  }

  function setListWidth(width: number): void {
    listWidth.value = Math.max(280, Math.min(width, 700))
  }

  function openReader(): void {
    readerOpen.value = true
  }

  function closeReader(): void {
    readerOpen.value = false
  }

  function toggleSearch(): void {
    searchOpen.value = !searchOpen.value
  }

  function toggleShortcutsDialog(): void {
    shortcutsDialogOpen.value = !shortcutsDialogOpen.value
  }

  return {
    // State
    theme,
    displayMode,
    sidebarOpen,
    listWidth,
    readerOpen,
    searchOpen,
    shortcutsDialogOpen,
    // Actions
    setTheme,
    toggleSidebar,
    closeSidebar,
    setDisplayMode,
    setListWidth,
    openReader,
    closeReader,
    toggleSearch,
    toggleShortcutsDialog,
  }
})
