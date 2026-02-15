<script setup lang="ts">
import { RouterLink } from 'vue-router'
import {
  RssIcon,
  BoltIcon,
  MagnifyingGlassIcon,
  DevicePhoneMobileIcon,
  MoonIcon,
  FolderIcon,
  StarIcon,
  KeyIcon,
  ArrowDownTrayIcon,
} from '@heroicons/vue/24/outline'

const features = [
  {
    icon: RssIcon,
    title: 'Smart Feed Polling',
    desc: 'Intelligent polling that adapts to each feed\'s update frequency. Saves bandwidth and always stays current.',
  },
  {
    icon: FolderIcon,
    title: 'Organize with Groups',
    desc: 'Create custom groups to organize your feeds. A feed can belong to multiple groups.',
  },
  {
    icon: MagnifyingGlassIcon,
    title: 'Full-Text Search',
    desc: 'Search across all your subscribed feeds with powerful full-text search.',
  },
  {
    icon: MoonIcon,
    title: 'Beautiful Themes',
    desc: 'Choose from Light, Dark, Midnight, and Forest themes. Comfortable and Compact display modes.',
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Mobile-First PWA',
    desc: 'Installable app that works offline. Read your feeds anywhere, anytime.',
  },
  {
    icon: KeyIcon,
    title: 'Keyboard Shortcuts',
    desc: 'Navigate and manage feeds without lifting your hands off the keyboard.',
  },
  {
    icon: StarIcon,
    title: 'Star & Save',
    desc: 'Star important articles to read later. Never lose track of what matters.',
  },
  {
    icon: BoltIcon,
    title: 'Discover Feeds',
    desc: 'Browse a curated directory of feeds. Find new content in 25+ categories.',
  },
  {
    icon: ArrowDownTrayIcon,
    title: 'OPML Import & Export',
    desc: 'Import feeds from any reader. Export your subscriptions anytime.',
  },
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="py-20 sm:py-28">
      <div class="mx-auto max-w-4xl px-4 text-center">
        <h1 class="text-4xl sm:text-6xl font-bold tracking-tight text-text-primary mb-6">
          Your feeds.
          <span class="text-accent">Your way.</span>
        </h1>
        <p class="mx-auto max-w-2xl text-lg text-text-secondary mb-8">
          Acta is a modern RSS reader that helps you stay on top of the content you care about.
          Clean, fast, and beautifully designed for the way you read.
        </p>
        <div class="flex items-center justify-center gap-4">
          <RouterLink to="/register" class="btn-primary text-base px-6 py-3">
            Get Started Free
          </RouterLink>
          <RouterLink to="/login" class="btn-ghost text-base px-6 py-3"> Sign in </RouterLink>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="border-t py-20">
      <div class="mx-auto max-w-6xl px-4">
        <h2 class="text-center text-3xl font-bold text-text-primary mb-4">
          Everything you need to read smarter
        </h2>
        <p class="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
          Built for readers who value their time. Acta combines powerful features with a clean,
          distraction-free interface.
        </p>

        <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="rounded-xl border bg-bg-secondary/50 p-6"
          >
            <component :is="feature.icon" class="h-8 w-8 text-accent mb-4" />
            <h3 class="text-lg font-semibold text-text-primary mb-2">{{ feature.title }}</h3>
            <p class="text-sm text-text-secondary leading-relaxed">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="border-t py-20">
      <div class="mx-auto max-w-4xl px-4 text-center">
        <h2 class="text-3xl font-bold text-text-primary mb-4">Ready to take control of your reading?</h2>
        <p class="text-text-secondary mb-8">
          Join Acta and start curating the content that matters to you.
        </p>
        <RouterLink to="/register" class="btn-primary text-base px-8 py-3">
          Create your free account
        </RouterLink>
      </div>
    </section>
  </div>
</template>
