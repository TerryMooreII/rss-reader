import { watch } from 'vue'
import { useUIStore } from '@/stores/ui'

const THEME_CLASSES = ['theme-light', 'theme-dark', 'theme-midnight', 'theme-forest'] as const

type ThemeClass = (typeof THEME_CLASSES)[number]

const themeClassMap: Record<string, ThemeClass> = {
  light: 'theme-light',
  dark: 'theme-dark',
  midnight: 'theme-midnight',
  forest: 'theme-forest',
}

const colorSchemeMap: Record<string, string> = {
  light: 'light',
  dark: 'dark',
  midnight: 'dark',
  forest: 'dark',
}

function applyTheme(theme: string): void {
  const root = document.documentElement

  // Remove all existing theme classes
  for (const cls of THEME_CLASSES) {
    root.classList.remove(cls)
  }

  // Apply new theme class
  const themeClass = themeClassMap[theme] ?? 'theme-light'
  root.classList.add(themeClass)

  // Set color-scheme CSS property
  const colorScheme = colorSchemeMap[theme] ?? 'light'
  root.style.setProperty('color-scheme', colorScheme)
}

export function useTheme() {
  const uiStore = useUIStore()

  // Apply theme immediately on creation
  applyTheme(uiStore.theme)

  // Watch for changes and re-apply
  watch(
    () => uiStore.theme,
    (newTheme) => {
      applyTheme(newTheme)
    }
  )
}
