<script setup lang="ts">
import { ref } from 'vue'
import { LinkIcon, EnvelopeIcon } from '@heroicons/vue/24/outline'
import { SHARE_TARGETS } from './shareTargets'

const props = defineProps<{ url: string; title: string }>()

const copied = ref(false)

async function copyLink() {
  await navigator.clipboard.writeText(props.url)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function openEmail() {
  window.open(`mailto:?subject=${encodeURIComponent(props.title)}&body=${encodeURIComponent(props.url)}`, '_self')
}

function openShareWindow(url: string) {
  const w = 550
  const h = 450
  const left = Math.round(screen.width / 2 - w / 2)
  const top = Math.round(screen.height / 2 - h / 2)
  window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`)
}

const buttonClass =
  'flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover'
</script>

<template>
  <div class="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-1 rounded-lg border border-border bg-bg-secondary/50 p-2" @click.stop>
    <button :class="buttonClass" @click="copyLink">
      <LinkIcon class="h-5 w-5 shrink-0" />
      <span class="truncate">{{ copied ? 'Copied!' : 'Copy Link' }}</span>
    </button>

    <button :class="buttonClass" @click="openEmail">
      <EnvelopeIcon class="h-5 w-5 shrink-0" />
      <span class="truncate">Email</span>
    </button>

    <button v-for="target in SHARE_TARGETS" :key="target.id" :class="buttonClass" @click="openShareWindow(target.url(url, title))">
      <svg class="h-5 w-5 shrink-0" :viewBox="target.icon.viewBox" fill="currentColor" aria-hidden="true">
        <path :d="target.icon.path" />
      </svg>
      <span class="truncate">{{ target.label }}</span>
    </button>
  </div>
</template>
