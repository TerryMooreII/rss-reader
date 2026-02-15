import { onMounted, onUnmounted } from 'vue'

interface ShortcutDef {
  key: string
  ctrl?: boolean
  shift?: boolean
  handler: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  function onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

    for (const s of shortcuts) {
      if (
        event.key.toLowerCase() === s.key.toLowerCase() &&
        !!s.ctrl === (event.ctrlKey || event.metaKey) &&
        !!s.shift === event.shiftKey
      ) {
        event.preventDefault()
        s.handler()
        return
      }
    }
  }

  onMounted(() => document.addEventListener('keydown', onKeyDown))
  onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
}
