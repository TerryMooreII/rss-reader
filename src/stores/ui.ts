import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/config/supabase'

type Theme = 'light' | 'dark' | 'midnight' | 'forest'
type DisplayMode = 'comfortable' | 'compact' | 'feed'
type PaginationMode = 'infinite' | 'paginated'
type SortOrder = 'newest_first' | 'oldest_first'
type FontSize = 'small' | 'medium' | 'large'

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------
const LS = {
  theme: 'acta:theme',
  displayMode: 'acta:displayMode',
  sidebarOpen: 'acta:sidebarOpen',
  listWidth: 'acta:listWidth',
  paginationMode: 'acta:paginationMode',
  entriesPerPage: 'acta:entriesPerPage',
  markReadOnScroll: 'acta:markReadOnScroll',
  showImages: 'acta:showImages',
  openLinksInNewTab: 'acta:openLinksInNewTab',
  defaultSortOrder: 'acta:defaultSortOrder',
  notifyNewEntries: 'acta:notifyNewEntries',
  notifyEmail: 'acta:notifyEmail',
  unreadOnly: 'acta:unreadOnly',
  fontSize: 'acta:fontSize',
} as const

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
  // State: DB-synced settings (initialized from localStorage cache)
  // ---------------------------------------------------------------------------
  const theme = ref<Theme>(loadFromStorage<Theme>(LS.theme, 'light'))
  const displayMode = ref<DisplayMode>(
    loadFromStorage<DisplayMode>(LS.displayMode, 'comfortable'),
  )
  const paginationMode = ref<PaginationMode>(
    loadFromStorage<PaginationMode>(LS.paginationMode, 'infinite'),
  )
  const entriesPerPage = ref<number>(loadFromStorage<number>(LS.entriesPerPage, 25))
  const markReadOnScroll = ref<boolean>(loadFromStorage<boolean>(LS.markReadOnScroll, true))
  const showImages = ref<boolean>(loadFromStorage<boolean>(LS.showImages, true))
  const openLinksInNewTab = ref<boolean>(loadFromStorage<boolean>(LS.openLinksInNewTab, true))
  const defaultSortOrder = ref<SortOrder>(
    loadFromStorage<SortOrder>(LS.defaultSortOrder, 'newest_first'),
  )
  const notifyNewEntries = ref<boolean>(loadFromStorage<boolean>(LS.notifyNewEntries, false))
  const notifyEmail = ref<boolean>(loadFromStorage<boolean>(LS.notifyEmail, false))
  const unreadOnly = ref<boolean>(loadFromStorage<boolean>(LS.unreadOnly, false))
  const fontSize = ref<FontSize>(loadFromStorage<FontSize>(LS.fontSize, 'medium'))

  // ---------------------------------------------------------------------------
  // State: Device-local settings (localStorage only, never synced to DB)
  // ---------------------------------------------------------------------------
  const sidebarOpen = ref<boolean>(
    window.innerWidth < 768 ? false : loadFromStorage<boolean>(LS.sidebarOpen, true),
  )
  const listWidth = ref<number>(loadFromStorage<number>(LS.listWidth, 380))

  // ---------------------------------------------------------------------------
  // State: Transient UI (not persisted anywhere)
  // ---------------------------------------------------------------------------
  const readerOpen = ref(false)
  const searchOpen = ref(false)
  const shortcutsDialogOpen = ref(false)

  // ---------------------------------------------------------------------------
  // DB sync state
  // ---------------------------------------------------------------------------
  const settingsLoaded = ref(false)
  let _dbSyncEnabled = false

  let _dbSaveTimer: ReturnType<typeof setTimeout> | null = null
  const DB_SAVE_DELAY = 1000

  function _getSyncedSnapshot(): Record<string, unknown> {
    return {
      custom_theme: theme.value,
      display_mode: displayMode.value,
      pagination_mode: paginationMode.value,
      entries_per_page: entriesPerPage.value,
      mark_read_on_scroll: markReadOnScroll.value,
      show_images: showImages.value,
      open_links_in_new_tab: openLinksInNewTab.value,
      default_sort_order: defaultSortOrder.value,
      notify_new_entries: notifyNewEntries.value,
      notify_email: notifyEmail.value,
      show_unread_only: unreadOnly.value,
      font_size: fontSize.value,
    }
  }

  function _scheduleDatabaseSave(): void {
    if (!_dbSyncEnabled) return
    if (_dbSaveTimer) clearTimeout(_dbSaveTimer)
    _dbSaveTimer = setTimeout(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return

        await supabase
          .from('user_settings')
          .update(_getSyncedSnapshot())
          .eq('user_id', session.user.id)
      } catch (err) {
        console.error('Failed to save settings to DB:', err)
      }
    }, DB_SAVE_DELAY)
  }

  // ---------------------------------------------------------------------------
  // Watchers — persist to localStorage + schedule DB save for synced settings
  // ---------------------------------------------------------------------------
  const syncedRefs = [
    { ref: theme, key: LS.theme },
    { ref: displayMode, key: LS.displayMode },
    { ref: paginationMode, key: LS.paginationMode },
    { ref: entriesPerPage, key: LS.entriesPerPage },
    { ref: markReadOnScroll, key: LS.markReadOnScroll },
    { ref: showImages, key: LS.showImages },
    { ref: openLinksInNewTab, key: LS.openLinksInNewTab },
    { ref: defaultSortOrder, key: LS.defaultSortOrder },
    { ref: notifyNewEntries, key: LS.notifyNewEntries },
    { ref: notifyEmail, key: LS.notifyEmail },
    { ref: unreadOnly, key: LS.unreadOnly },
    { ref: fontSize, key: LS.fontSize },
  ] as const

  for (const { ref: settingRef, key } of syncedRefs) {
    watch(settingRef, (val) => {
      localStorage.setItem(key, JSON.stringify(val))
      _scheduleDatabaseSave()
    })
  }

  // Device-local settings: localStorage only
  watch(sidebarOpen, (val) => localStorage.setItem(LS.sidebarOpen, JSON.stringify(val)))
  watch(listWidth, (val) => localStorage.setItem(LS.listWidth, JSON.stringify(val)))

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

  // Apply font size to the document root whenever it changes
  const fontSizeMap: Record<FontSize, string> = {
    small: '14px',
    medium: '16px',
    large: '18px',
  }
  watch(
    fontSize,
    (val) => {
      document.documentElement.style.fontSize = fontSizeMap[val]
    },
    { immediate: true },
  )

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Load settings from the DB after authentication.
   * DB values are the source of truth and overwrite localStorage cache.
   */
  async function loadSettingsFromDB(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      if (!data) return

      // Prevent write-back to DB while applying loaded values
      _dbSyncEnabled = false

      theme.value = (data.custom_theme as Theme) || 'light'
      displayMode.value = data.display_mode || 'comfortable'
      paginationMode.value = (data.pagination_mode as PaginationMode) || 'infinite'
      entriesPerPage.value = data.entries_per_page ?? 25
      markReadOnScroll.value = data.mark_read_on_scroll ?? true
      showImages.value = data.show_images ?? true
      openLinksInNewTab.value = data.open_links_in_new_tab ?? true
      defaultSortOrder.value = (data.default_sort_order as SortOrder) || 'newest_first'
      notifyNewEntries.value = data.notify_new_entries ?? false
      notifyEmail.value = data.notify_email ?? false
      unreadOnly.value = data.show_unread_only ?? false
      fontSize.value = (data.font_size as FontSize) || 'medium'

      settingsLoaded.value = true
      _dbSyncEnabled = true
    } catch (err) {
      console.error('Failed to load settings from DB:', err)
      _dbSyncEnabled = true
      settingsLoaded.value = true
    }
  }

  /** Reset sync state on logout. */
  function resetSyncState(): void {
    _dbSyncEnabled = false
    settingsLoaded.value = false
    if (_dbSaveTimer) {
      clearTimeout(_dbSaveTimer)
      _dbSaveTimer = null
    }
  }

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

  function setPaginationMode(mode: PaginationMode): void {
    paginationMode.value = mode
  }

  function setEntriesPerPage(count: number): void {
    entriesPerPage.value = count
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

  function setFontSize(size: FontSize): void {
    fontSize.value = size
  }

  function setUnreadOnly(val: boolean): void {
    unreadOnly.value = val
  }

  function toggleShortcutsDialog(): void {
    shortcutsDialogOpen.value = !shortcutsDialogOpen.value
  }

  return {
    // DB-synced settings
    theme,
    displayMode,
    paginationMode,
    entriesPerPage,
    markReadOnScroll,
    showImages,
    openLinksInNewTab,
    defaultSortOrder,
    notifyNewEntries,
    notifyEmail,
    unreadOnly,
    fontSize,
    // Device-local settings
    sidebarOpen,
    listWidth,
    // Transient state
    readerOpen,
    searchOpen,
    shortcutsDialogOpen,
    // Sync state
    settingsLoaded,
    // Actions
    loadSettingsFromDB,
    resetSyncState,
    setTheme,
    toggleSidebar,
    closeSidebar,
    setDisplayMode,
    setListWidth,
    setPaginationMode,
    setEntriesPerPage,
    openReader,
    closeReader,
    setFontSize,
    setUnreadOnly,
    toggleSearch,
    toggleShortcutsDialog,
  }
})
