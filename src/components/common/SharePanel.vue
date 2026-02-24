<script setup lang="ts">
import { ref } from 'vue'
import {
  LinkIcon,
  EnvelopeIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  url: string
  title: string
}>()

const copied = ref(false)

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
}

function openShareWindow(e: Event, url: string) {
  e.stopPropagation()
  const w = 550
  const h = 450
  const left = Math.round(screen.width / 2 - w / 2)
  const top = Math.round(screen.height / 2 - h / 2)
  window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`)
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

function shareNotion(e: Event) {
  const u = encodeURIComponent(props.url)
  const t = encodeURIComponent(props.title)
  openShareWindow(e, `https://www.notion.so/native/clipper?url=${u}&title=${t}`)
}
</script>

<template>
  <div
    class="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-1 rounded-lg border border-border bg-bg-secondary/50 p-2"
    @click.stop
  >
    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="copyLink"
    >
      <LinkIcon class="h-5 w-5 shrink-0" />
      <span class="truncate">{{ copied ? 'Copied!' : 'Copy Link' }}</span>
    </button>

    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="openEmail"
    >
      <EnvelopeIcon class="h-5 w-5 shrink-0" />
      <span class="truncate">Email</span>
    </button>

    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="shareTwitter"
    >
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      <span class="truncate">X / Twitter</span>
    </button>

    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="shareBluesky"
    >
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.573 3.512 6.158 3.265-4.398.423-5.586 2.588-2.924 4.752C7.075 20.895 10.1 18.654 12 14.8c1.9 3.854 4.925 6.095 8.142 3.463 2.662-2.163 1.474-4.328-2.924-4.752 2.585.247 5.373-.638 6.158-3.265.246-.828.624-5.788.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8"/></svg>
      <span class="truncate">Bluesky</span>
    </button>

    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="shareMastodon"
    >
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 74 79" fill="currentColor"><path d="M73.7014 17.4323C72.5616 9.05152 65.1774 2.4135 56.424 1.1205C55.1397 0.939197 49.3639 0 38.3882 0H38.2682C27.2924 0 24.8327 0.939197 23.5484 1.1205C15.0955 2.37304 7.09909 8.18974 5.16359 16.7575C4.24354 20.8674 4.13425 25.3636 4.3443 29.4579C4.63906 35.2712 4.69896 41.0726 5.22677 46.8554C5.5765 50.6525 6.19679 54.4206 7.08076 58.1357C8.83451 65.3811 15.8839 71.3479 22.8331 73.5765C30.3531 75.922 38.4585 76.3925 45.8638 74.4409C46.7434 74.1948 47.6101 73.9098 48.4617 73.5873C50.3079 72.8893 52.4529 72.0565 54.0493 70.7259C54.0769 70.7035 54.0989 70.6751 54.1138 70.6429C54.1287 70.6107 54.136 70.5756 54.1353 70.5402V65.2129C54.1347 65.1832 54.1266 65.1541 54.1117 65.1284C54.0968 65.1027 54.0756 65.0812 54.0501 65.0659C54.0245 65.0506 53.9954 65.042 53.9656 65.0408C53.9358 65.0396 53.9062 65.0458 53.8796 65.0589C50.1579 66.4321 46.2563 67.2629 42.3001 67.5271C34.6599 68.0371 27.1171 66.4509 24.3587 60.7259C24.1815 60.3567 24.0303 59.9754 23.9065 59.5847C23.8862 59.5182 23.8831 59.4477 23.8977 59.3797C23.9122 59.3117 23.9438 59.2484 23.9895 59.196C24.0352 59.1436 24.0935 59.104 24.1588 59.0809C24.2242 59.0578 24.2943 59.052 24.3626 59.064C28.0412 59.8008 31.7837 60.1793 35.5366 60.1935C36.4942 60.1935 37.4518 60.1935 38.4094 60.163C42.3016 60.0422 46.3821 59.7956 50.2143 59.0425C50.3177 59.0222 50.4211 59.0019 50.5143 58.9713C58.3582 57.4704 65.7814 53.2302 66.6575 40.8027C66.6898 40.3361 66.7647 35.7849 66.7647 35.2975C66.7751 33.5439 67.3738 25.6143 73.7014 17.4323Z" /><path d="M61.4768 22.4978V42.3906H53.0298V23.1528C53.0298 18.8413 51.2014 16.6352 47.5065 16.6352C43.4445 16.6352 41.405 19.2397 41.405 24.3863V34.7114H33.0095V24.3863C33.0095 19.2397 30.97 16.6352 26.908 16.6352C23.2544 16.6352 21.3847 18.8413 21.3847 23.1528V42.3906H12.9479V22.4978C12.9479 18.1863 14.0534 14.7587 16.2741 12.2151C18.5605 9.67138 21.5398 8.37088 25.2235 8.37088C29.4878 8.37088 32.7416 9.9997 34.9179 13.2575L37.2147 17.1343L39.5116 13.2575C41.6878 9.9997 44.9417 8.37088 49.1647 8.37088C52.8586 8.37088 55.8378 9.67138 58.1243 12.2151C60.3449 14.7536 61.4505 18.1811 61.4768 22.4978Z" /></svg>
      <span class="truncate">Mastodon</span>
    </button>

    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="shareFacebook"
    >
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 1.09.06 1.543.12V7.93h-1.114c-1.229 0-1.608.462-1.608 1.664v2.43h2.59l-.444 3.668h-2.146v8.124c4.458-.752 7.863-4.618 7.863-9.267 0-5.178-4.238-9.44-9.444-9.44a9.463 9.463 0 0 0-9.444 9.44c0 4.446 3.134 8.163 7.345 9.142"/></svg>
      <span class="truncate">Facebook</span>
    </button>

    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="shareLinkedIn"
    >
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      <span class="truncate">LinkedIn</span>
    </button>

    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="shareReddit"
    >
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.689ZM9.25 12C8.561 12 8 12.56 8 13.25c0 .69.56 1.25 1.25 1.25.69 0 1.25-.56 1.25-1.25 0-.69-.56-1.25-1.25-1.25zm5.5 0c-.69 0-1.25.56-1.25 1.25 0 .69.56 1.25 1.25 1.25.69 0 1.25-.56 1.25-1.25 0-.69-.56-1.25-1.25-1.25zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.463.327.327 0 0 0-.462 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.205-.094z"/></svg>
      <span class="truncate">Reddit</span>
    </button>

    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="shareHackerNews"
    >
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0v24h24V0H0zm12.6 13.5v5.1h-1.2v-5.1L7.5 5.4h1.4l3.1 6.3 3.1-6.3h1.4l-3.9 8.1z"/></svg>
      <span class="truncate">Hacker News</span>
    </button>

    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="sharePocket"
    >
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.813 10.259l-5.646 5.419a1.649 1.649 0 0 1-2.282 0l-5.646-5.419a1.649 1.649 0 0 1 2.282-2.377L12 12.011l4.479-4.129a1.649 1.649 0 0 1 2.334 2.377zM23.547 3.374C23.196 2.521 22.391 2 21.498 2H2.502C1.609 2 .804 2.521.453 3.374A3.03 3.03 0 0 0 0 4.62v6.96c0 6.627 5.373 12 12 12s12-5.373 12-12V4.62c0-.428-.152-.845-.453-1.246z"/></svg>
      <span class="truncate">Pocket</span>
    </button>

    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="shareInstapaper"
    >
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M14.766 20.259c0 1.819.271 2.089 2.934 2.292V24H6.3v-1.449c2.663-.203 2.934-.473 2.934-2.292V3.708c0-1.784-.271-2.089-2.934-2.259V0h11.4v1.449c-2.663.17-2.934.475-2.934 2.259v16.551z"/></svg>
      <span class="truncate">Instapaper</span>
    </button>

    <button
      class="flex flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-text-primary transition-colors hover:bg-bg-hover"
      @click="shareNotion"
    >
      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.2 2.23c-.42-.326-.98-.7-2.055-.607L3.01 2.71c-.467.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.726l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM2.83 1.634L16.192.806c1.635-.14 2.055-.046 3.082.7l4.25 2.986c.7.514.934.653.934 1.213v16.378c0 1.026-.374 1.633-1.682 1.726l-15.458.934c-.98.046-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V3.5c0-.84.374-1.54 1.4-1.866z"/></svg>
      <span class="truncate">Notion</span>
    </button>
  </div>
</template>
