<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { KEYBOARD_SHORTCUTS } from '@/config/constants'
import BaseDialog from '@/components/ui/BaseDialog.vue'

const ui = useUIStore()
</script>

<template>
  <BaseDialog :open="ui.shortcutsDialogOpen" title="Keyboard shortcuts" max-width="max-w-sm" @close="ui.toggleShortcutsDialog()">
    <ul class="divide-y">
      <li v-for="s in KEYBOARD_SHORTCUTS" :key="s.key" class="flex items-center justify-between py-2">
        <span class="text-sm text-text-primary">{{ s.description }}</span>
        <kbd class="rounded border bg-bg-secondary px-2 py-1 font-mono text-xs text-text-secondary">{{ s.key }}</kbd>
      </li>
    </ul>
  </BaseDialog>
</template>
