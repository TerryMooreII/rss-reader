<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { RssIcon } from '@heroicons/vue/24/outline'
import { KEYBOARD_SHORTCUTS } from '@/config/constants'
import { platforms, features, filterRules, themes, steps, stats } from './marketing/content'
import MarketingSection from './marketing/MarketingSection.vue'

const shortcuts = KEYBOARD_SHORTCUTS.filter((s) => s.key !== 'Esc').map((s) => ({
  key: s.key === 'Enter' ? '↵' : s.key,
  label: s.label,
}))
</script>

<template>
  <div class="bg-bg-primary">
    <!-- Hero -->
    <section class="relative overflow-hidden py-24 sm:py-36">
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.03]"
        style="background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0); background-size: 40px 40px;"
      />
      <div class="relative mx-auto max-w-4xl px-4 text-center">
        <div class="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium text-text-secondary">
          <RssIcon class="h-3.5 w-3.5 text-accent" />
          RSS, YouTube, Reddit, GitHub, Bluesky, Mastodon &mdash; all in one place
        </div>

        <h1 class="text-5xl font-bold tracking-tight text-text-primary sm:text-7xl">
          Take back your
          <span class="bg-gradient-to-r from-accent to-accent-hover bg-clip-text text-transparent">reading</span>
        </h1>

        <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
          Acta is a modern, open RSS reader that puts you in control. Follow anything with a feed
          &mdash; blogs, YouTube channels, subreddits, GitHub repos, Mastodon profiles &mdash; in
          one clean, beautiful interface. No algorithms. No ads. Just your content.
        </p>

        <div class="mt-10 flex items-center justify-center gap-4">
          <RouterLink to="/register" class="btn-primary px-8 py-3.5 text-base font-semibold shadow-lg shadow-accent/20 transition-shadow hover:shadow-xl hover:shadow-accent/30">
            Start Reading Free
          </RouterLink>
          <RouterLink to="/login" class="btn-ghost px-6 py-3.5 text-base">Sign in</RouterLink>
        </div>
      </div>
    </section>

    <!-- Platform Support -->
    <MarketingSection
      title="One reader for everything you follow"
      subtitle="Just paste a URL. Acta automatically detects the platform and converts it into a feed. No need to hunt down RSS links."
    >
      <div class="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div
          v-for="platform in platforms"
          :key="platform.name"
          class="group flex flex-col items-center gap-3 rounded-xl border bg-bg-secondary/50 p-5 transition-colors hover:border-accent/30 hover:bg-accent/5"
        >
          <component :is="platform.icon" class="h-8 w-8 text-text-muted transition-colors group-hover:text-accent" />
          <div class="text-center">
            <div class="text-sm font-semibold text-text-primary">{{ platform.name }}</div>
            <div class="mt-0.5 text-xs text-text-muted">{{ platform.desc }}</div>
          </div>
        </div>
      </div>
      <p class="mt-6 text-center text-sm text-text-muted">
        Plus any site that publishes an RSS or Atom feed &mdash; that's millions of sources.
      </p>
    </MarketingSection>

    <!-- Features Grid -->
    <MarketingSection
      title="Packed with everything you need"
      subtitle="Built for readers who refuse to settle. Powerful features wrapped in a clean, distraction-free interface."
      width="max-w-6xl"
    >
      <div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="group rounded-xl border bg-bg-secondary/50 p-6 transition-colors hover:border-accent/30 hover:bg-accent/5"
        >
          <div class="mb-4 inline-flex rounded-lg bg-accent/10 p-2.5 transition-colors group-hover:bg-accent/15">
            <component :is="feature.icon" class="h-5 w-5 text-accent" />
          </div>
          <h3 class="text-lg font-semibold text-text-primary">{{ feature.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-text-secondary">{{ feature.desc }}</p>
        </div>
      </div>
    </MarketingSection>

    <!-- Keyboard Shortcuts -->
    <MarketingSection>
      <div class="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 class="text-3xl font-bold text-text-primary sm:text-4xl">Keyboard-driven reading</h2>
          <p class="mt-4 text-text-secondary leading-relaxed">
            Vim-style navigation for readers who think at the speed of keystrokes. Browse, star,
            and manage your feeds without ever touching the mouse.
          </p>
          <p class="mt-4 text-sm text-text-muted">
            Press <kbd class="rounded border bg-bg-tertiary px-1.5 py-0.5 text-xs font-mono text-text-primary">?</kbd>
            in the app to see all shortcuts.
          </p>
        </div>
        <div class="grid grid-cols-4 gap-3">
          <div v-for="shortcut in shortcuts" :key="shortcut.key" class="flex flex-col items-center gap-2 rounded-lg border bg-bg-secondary/50 p-4">
            <kbd class="flex h-10 w-10 items-center justify-center rounded-lg border bg-bg-primary font-mono text-lg font-semibold text-text-primary shadow-sm">
              {{ shortcut.key }}
            </kbd>
            <span class="text-xs text-text-muted">{{ shortcut.label }}</span>
          </div>
        </div>
      </div>
    </MarketingSection>

    <!-- Themes -->
    <MarketingSection title="Your vibe, your theme" subtitle="Four handcrafted themes designed for comfortable reading at any hour. Switch instantly.">
      <div class="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-for="theme in themes" :key="theme.name" class="overflow-hidden rounded-xl border">
          <div class="h-24" :class="theme.bg" />
          <div class="border-t p-3" :class="theme.panel">
            <div class="text-sm font-semibold" :class="theme.title">{{ theme.name }}</div>
            <div class="text-xs" :class="theme.sub">{{ theme.tagline }}</div>
          </div>
        </div>
      </div>
    </MarketingSection>

    <!-- Content Filters -->
    <MarketingSection>
      <div class="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 class="text-3xl font-bold text-text-primary sm:text-4xl">Your feeds, your rules</h2>
          <p class="mt-4 text-text-secondary leading-relaxed">
            Set up keyword-based rules that work for you. Automatically hide noise, mark routine
            updates as read, or star and tag the stuff you care about — across all feeds or scoped
            to specific ones.
          </p>
          <p class="mt-4 text-sm text-text-muted">
            Combine filters with star tags to build a personal triage system that keeps your reading
            list sharp and focused.
          </p>
        </div>
        <div class="space-y-4">
          <div v-for="rule in filterRules" :key="rule.title" class="flex items-start gap-4 rounded-xl border bg-bg-secondary/50 p-5">
            <div class="flex-shrink-0 rounded-lg p-2.5" :class="rule.tint">
              <component :is="rule.icon" class="h-5 w-5" :class="rule.color" />
            </div>
            <div>
              <h3 class="font-semibold text-text-primary">{{ rule.title }}</h3>
              <p class="mt-1 text-sm text-text-secondary">{{ rule.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </MarketingSection>

    <!-- How It Works -->
    <MarketingSection title="Up and running in seconds" width="max-w-4xl">
      <div class="mt-14 grid gap-8 sm:grid-cols-3">
        <div v-for="(step, i) in steps" :key="step.title" class="text-center">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-xl font-bold text-accent">
            {{ i + 1 }}
          </div>
          <h3 class="font-semibold text-text-primary">{{ step.title }}</h3>
          <p class="mt-2 text-sm text-text-secondary">{{ step.desc }}</p>
        </div>
      </div>
    </MarketingSection>

    <!-- Value Props -->
    <MarketingSection>
      <div class="grid gap-8 sm:grid-cols-3">
        <div v-for="stat in stats" :key="stat.label" class="rounded-xl border bg-bg-secondary/50 p-8 text-center">
          <div class="text-4xl font-bold text-accent">{{ stat.value }}</div>
          <div class="mt-2 text-sm font-medium text-text-primary">{{ stat.label }}</div>
          <div class="mt-1 text-xs text-text-muted">{{ stat.sub }}</div>
        </div>
      </div>
    </MarketingSection>

    <!-- Final CTA -->
    <MarketingSection width="max-w-4xl" padding="py-24">
      <div class="text-center">
        <h2 class="text-3xl font-bold text-text-primary sm:text-4xl">Stop scrolling. Start reading.</h2>
        <p class="mx-auto mt-4 max-w-xl text-lg text-text-secondary">
          Take control of your information diet. No algorithms deciding what you see, no ads
          interrupting your reading, no data harvesting. Just you and the content you chose.
        </p>
        <div class="mt-10 flex items-center justify-center gap-4">
          <RouterLink to="/register" class="btn-primary px-8 py-3.5 text-base font-semibold shadow-lg shadow-accent/20 transition-shadow hover:shadow-xl hover:shadow-accent/30">
            Create your free account
          </RouterLink>
        </div>
        <p class="mt-4 text-sm text-text-muted">No credit card required. Import your feeds and go.</p>
      </div>
    </MarketingSection>
  </div>
</template>
