<script setup lang="ts">
import { ref } from 'vue'
import {
  ShareIcon,
  LinkIcon,
  EnvelopeIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  url: string
  title: string
  compact?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const copied = ref(false)

function toggle(e: Event) {
  e.stopPropagation()
  open.value = !open.value
  copied.value = false
}

function close(e?: Event) {
  e?.stopPropagation()
  open.value = false
  copied.value = false
}

async function copyLink(e: Event) {
  e.stopPropagation()
  await navigator.clipboard.writeText(props.url)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

function openEmail(e: Event) {
  e.stopPropagation()
  const subject = encodeURIComponent(props.title)
  const body = encodeURIComponent(props.url)
  window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
  close()
}

function openShareWindow(e: Event, url: string) {
  e.stopPropagation()
  const w = 550
  const h = 450
  const left = Math.round(screen.width / 2 - w / 2)
  const top = Math.round(screen.height / 2 - h / 2)
  window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`)
  close()
}

function shareTwitter(e: Event) {
  const u = encodeURIComponent(props.url)
  const t = encodeURIComponent(props.title)
  openShareWindow(e, `https://twitter.com/intent/tweet?url=${u}&text=${t}`)
}

function shareBluesky(e: Event) {
  const text = encodeURIComponent(`${props.title} ${props.url}`)
  openShareWindow(e, `https://bsky.app/intent/compose?text=${text}`)
}

function shareMastodon(e: Event) {
  const text = encodeURIComponent(`${props.title} ${props.url}`)
  openShareWindow(e, `https://mastodon.social/share?text=${text}`)
}

function shareFacebook(e: Event) {
  const u = encodeURIComponent(props.url)
  openShareWindow(e, `https://www.facebook.com/sharer/sharer.php?u=${u}`)
}

function shareLinkedIn(e: Event) {
  const u = encodeURIComponent(props.url)
  openShareWindow(e, `https://www.linkedin.com/sharing/share-offsite/?url=${u}`)
}

function shareReddit(e: Event) {
  const u = encodeURIComponent(props.url)
  const t = encodeURIComponent(props.title)
  openShareWindow(e, `https://reddit.com/submit?url=${u}&title=${t}`)
}

function shareHackerNews(e: Event) {
  const u = encodeURIComponent(props.url)
  const t = encodeURIComponent(props.title)
  openShareWindow(e, `https://news.ycombinator.com/submitlink?u=${u}&t=${t}`)
}

function sharePocket(e: Event) {
  const u = encodeURIComponent(props.url)
  const t = encodeURIComponent(props.title)
  openShareWindow(e, `https://getpocket.com/save?url=${u}&title=${t}`)
}

function shareInstapaper(e: Event) {
  const u = encodeURIComponent(props.url)
  const t = encodeURIComponent(props.title)
  openShareWindow(e, `https://www.instapaper.com/hello2?url=${u}&title=${t}`)
}

defineExpose({ toggle, close })
</script>

<template>
  <!-- Trigger button (placed inline in action bar by parent) -->
  <button
    v-if="compact"
    class="btn-ghost text-xs gap-1"
    aria-label="Share article"
    :aria-expanded="open"
    @click="toggle"
  >
    <ShareIcon class="h-4 w-4" />
    <span class="hidden md:inline">Share</span>
  </button>
  <button
    v-else
    class="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors"
    :class="open ? 'text-accent bg-bg-hover' : 'text-text-muted hover:bg-bg-hover hover:text-text-primary'"
    aria-label="Share article"
    :aria-expanded="open"
    @click="toggle"
  >
    <LinkIcon class="h-4 w-4" />
    <span class="hidden md:inline">Share</span>
  </button>
</template>
